import Anthropic from '@anthropic-ai/sdk';
import { createClient, getUser } from '@/lib/supabase/server';
import { getLocale } from '@/lib/i18n/get-locale';
import { localDate } from '@/lib/data/health';
import { systemPrompt } from '@/lib/ai/prompt';
import { runTool, tools } from '@/lib/ai/tools';
import { EMERGENCY_REPLY, hasRedFlag } from '@/lib/ai/safety';
import { answerWithGemini } from '@/lib/ai/gemini';
import {
  AI_PROVIDER,
  MODEL,
  SUPPORTS_EAGER_TOOL_INPUT,
  SUPPORTS_EFFORT,
  SUPPORTS_FALLBACKS,
  aiConfigured,
  claude,
} from '@/lib/ai/client';

/** Chat answers are deliberately short, so the cap stays low. */
const MAX_TOKENS = 4096;
/** Stops a runaway tool loop. Four rounds is plenty for "compare X and Y". */
const MAX_TOOL_ROUNDS = 4;
/** Per-user cost guard. */
const MESSAGES_PER_HOUR = 40;
/** Messages of context sent with each question, the question included. */
const HISTORY_LIMIT = 24;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const userMessage = typeof body?.message === 'string' ? body.message.trim() : '';
  const requestedConversation = typeof body?.conversationId === 'string' ? body.conversationId : null;

  if (!userMessage || userMessage.length > 4000) {
    return Response.json({ error: 'invalid_message' }, { status: 400 });
  }

  // Say so before storing anything, rather than saving the question and then
  // failing to answer it.
  if (!aiConfigured()) {
    return Response.json({ error: 'not_configured' }, { status: 503 });
  }

  const supabase = createClient();
  const locale = getLocale();
  const startedAt = Date.now();

  // Everything needed before the model runs, in one round trip instead of
  // one after another: the rate limit count, the conversation, the profile and
  // the recent history. RLS guarantees the conversation belongs to this user.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ count }, { data: found }, { data: profile }, { data: recent }] = await Promise.all([
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', oneHourAgo),
    requestedConversation
      ? supabase.from('conversations').select('id').eq('id', requestedConversation).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('profiles').select('full_name, timezone').eq('id', user.id).single(),
    // The newest messages, not the oldest: a long thread must keep its end.
    requestedConversation
      ? supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', requestedConversation)
          .order('created_at', { ascending: false })
          .limit(HISTORY_LIMIT - 1)
      : Promise.resolve({ data: [] as { role: 'user' | 'ai'; content: string }[] }),
  ]);

  // Rate limit before spending anything on the model.
  if ((count ?? 0) >= MESSAGES_PER_HOUR) {
    return Response.json({ error: 'rate_limited' }, { status: 429 });
  }

  let existingId: string | null = found?.id ?? null;
  // A conversation opened by this request is removed again if no answer comes,
  // so failed attempts do not pile up as empty threads in the sidebar.
  let createdHere = false;

  if (!existingId) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: userMessage.slice(0, 60) })
      .select('id')
      .single();
    if (error || !data) return Response.json({ error: 'failed' }, { status: 500 });
    existingId = data.id;
    createdHere = true;
  }

  // Non-null from here on, which the header and the inserts below rely on.
  const conversationId: string = existingId;

  // Stored while the model starts; awaited before the answer is saved.
  // Promise.resolve starts it now: a Supabase query only runs once something
  // subscribes to it, so on its own it would wait until that final await.
  const questionSaved = Promise.resolve(
    supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'user',
        content: userMessage,
      })
      .select('id')
      .single()
  );

  const encoder = new TextEncoder();
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Conversation-Id': conversationId,
  };

  // Urgent symptoms never reach the model: answer with escalation and stop.
  if (hasRedFlag(userMessage)) {
    const reply = EMERGENCY_REPLY[locale];
    await questionSaved;
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'ai',
      content: reply,
    });
    return new Response(reply, { headers });
  }

  // Oldest first, ending with the question just asked.
  const history = [...(recent ?? [])].reverse().concat({ role: 'user' as const, content: userMessage });

  const timezone = profile?.timezone ?? 'UTC';
  const system = systemPrompt({
    firstName: (profile?.full_name ?? '').split(' ')[0],
    locale,
    timezone,
    today: localDate(timezone),
  });

  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((row) => ({
    role: row.role === 'ai' ? ('assistant' as const) : ('user' as const),
    content: row.content,
  }));

  // Inputs stream as they are generated; runTool validates before executing.
  const toolParams = tools.map((tool) => ({
    ...tool,
    ...(SUPPORTS_EAGER_TOOL_INPUT && { eager_input_streaming: true }),
  })) as unknown as Anthropic.Beta.BetaToolUnion[];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Everything sent is also what gets saved, whichever provider wrote it,
      // including the part of an answer that streamed before an error.
      let answer = '';
      let firstTextAt: number | null = null;
      let answeredBy = MODEL;
      let rounds = 0;
      const send = (text: string) => {
        if (firstTextAt === null) firstTextAt = Date.now();
        answer += text;
        controller.enqueue(encoder.encode(text));
      };
      const modelStartedAt = Date.now();

      try {
        if (AI_PROVIDER === 'gemini') {
          const result = await answerWithGemini({
            model: MODEL,
            system: system.map((block) => block.text).join('\n\n'),
            history: history.map((row) => ({
              role: row.role === 'ai' ? ('assistant' as const) : ('user' as const),
              content: row.content,
            })),
            userId: user.id,
            maxTokens: MAX_TOKENS,
            maxToolRounds: MAX_TOOL_ROUNDS,
            send,
          });
          answeredBy = result.model;
          rounds = result.rounds;
        } else for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          rounds = round + 1;
          const turn = claude().beta.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            // Opus 5 can decline a request; "default" re-runs it on a fallback
            // model instead of returning nothing.
            ...(SUPPORTS_FALLBACKS && {
              betas: ['server-side-fallback-2026-07-01'],
              fallbacks: 'default' as const,
            }),
            // Chat does not need the deepest reasoning; medium keeps it quick.
            ...(SUPPORTS_EFFORT && { output_config: { effort: 'medium' as const } }),
            system,
            messages,
            tools: toolParams,
          });

          for await (const event of turn) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              send(event.delta.text);
            }
          }

          const message = await turn.finalMessage();

          // The model declined and no fallback produced an answer.
          if (message.stop_reason === 'refusal') {
            if (!answer) controller.enqueue(encoder.encode('__error__'));
            break;
          }

          messages.push({ role: 'assistant', content: message.content });

          const toolUses = message.content.filter(
            (block): block is Anthropic.Beta.BetaToolUseBlock => block.type === 'tool_use'
          );
          if (message.stop_reason !== 'tool_use' || toolUses.length === 0) break;

          const results: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(
            toolUses.map(async (block) => ({
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: await runTool(block.name, block.input, user.id),
            }))
          );

          messages.push({ role: 'user', content: results });
        }
      } catch (error) {
        console.error(`chat stream failed (provider ${AI_PROVIDER}, model ${MODEL})`, error);
        if (!answer) controller.enqueue(encoder.encode('__error__'));
      }

      // Where the time went, for each answer: visible in the deployment logs.
      console.log(
        `chat timing: provider=${AI_PROVIDER} model=${answeredBy} rounds=${rounds} ` +
          `prepare=${modelStartedAt - startedAt}ms ` +
          `first_text=${firstTextAt === null ? 'none' : `${firstTextAt - startedAt}ms`} ` +
          `total=${Date.now() - startedAt}ms`
      );

      const { data: question } = await questionSaved;

      if (!answer) {
        // Nothing was answered: leave no trace of the attempt. The question is
        // still on screen, so the user can simply send it again.
        if (createdHere) {
          await supabase.from('conversations').delete().eq('id', conversationId);
        } else if (question) {
          await supabase.from('messages').delete().eq('id', question.id);
        }
      }

      if (answer) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'ai',
          content: answer,
          model: answeredBy,
        });
      }

      controller.close();
    },
  });

  return new Response(stream, { headers });
}
