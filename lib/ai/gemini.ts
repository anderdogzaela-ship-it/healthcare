import { GoogleGenAI, ThinkingLevel, type Content, type FunctionCall, type Part } from '@google/genai';
import { runTool, tools } from '@/lib/ai/tools';

/**
 * The assistant on Google's Gemini API, whose free tier needs no card.
 *
 * Same contract as the Claude path: the same read-only tools, scoped to the
 * signed-in user on the server, and the same system prompt.
 */

let client: GoogleGenAI | null = null;

/**
 * Created on first use, so a deployment without the key still builds.
 *
 * The SDK's own retries are off. By default it retries an overloaded model up
 * to five times with growing pauses, which kept users waiting many seconds;
 * switching to another model straight away (below) answers much sooner.
 */
function gemini(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { retryOptions: { attempts: 1 } },
    });
  }
  return client;
}

/** The Claude tool definitions, restated as Gemini function declarations. */
const functionDeclarations = tools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parametersJsonSchema: tool.input_schema,
}));

/**
 * How long Gemini 3 models think before answering. Reading a few numbers and
 * summarising them does not need deep reasoning, and every level up adds
 * seconds, twice per question when a tool is called. GEMINI_THINKING can raise
 * it: minimal, low, medium or high.
 */
const THINKING_LEVELS: Record<string, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};
const thinkingLevel = THINKING_LEVELS[(process.env.GEMINI_THINKING ?? '').trim().toLowerCase()] ?? ThinkingLevel.LOW;

/** Only the Gemini 3 family takes a thinking level; 2.5 models reject it. */
const thinkingConfigFor = (model: string) =>
  model.startsWith('gemini-3') ? { thinkingConfig: { thinkingLevel } } : {};

/**
 * Tried in order when the chosen model is overloaded (503), out of free quota
 * (429) or retired for new accounts (404), which happens on the free tier.
 */
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3-flash-preview'];
const RETRYABLE = new Set([404, 429, 503]);

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: number })?.status;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Models that just failed are skipped for a while, so the next questions do
 * not each pay for a doomed first attempt. Per server instance, which is
 * enough: an instance serves many requests in a row.
 */
const COOLDOWN_MS: Record<number, number> = { 404: 60 * 60 * 1000, 429: 5 * 60 * 1000, 503: 5 * 60 * 1000 };
const coolingUntil = new Map<string, number>();

function orderModels(preferred: string): string[] {
  const all = [preferred, ...FALLBACK_MODELS.filter((model) => model !== preferred)];
  const now = Date.now();
  const ready = all.filter((model) => (coolingUntil.get(model) ?? 0) <= now);
  // If every model is cooling down, try them all anyway rather than give up.
  return ready.length > 0 ? [...ready, ...all.filter((model) => !ready.includes(model))] : all;
}

export interface GeminiTurn {
  model: string;
  system: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userId: string;
  maxTokens: number;
  maxToolRounds: number;
  /** Receives the answer as it streams. */
  send: (text: string) => void;
}

/** Streams one answer; returns its text and the model that wrote it. */
export async function answerWithGemini(turn: GeminiTurn): Promise<{ answer: string; model: string; rounds: number }> {
  const contents: Content[] = turn.history.map((row) => ({
    role: row.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: row.content }],
  }));

  const models = orderModels(turn.model);
  // Once a model answers, later rounds stay on it: the thought signatures it
  // returned belong to that model.
  let current = 0;
  let answer = '';
  let rounds = 0;

  for (let round = 0; round < turn.maxToolRounds; round++) {
    rounds = round + 1;
    // Every part is kept, not just the text: function calls carry a thought
    // signature that must be sent back unchanged with their results.
    let parts: Part[] = [];
    let calls: FunctionCall[] = [];

    for (let attempt = current; ; attempt++) {
      parts = [];
      calls = [];
      const answeredBefore = answer.length;
      const model = models[attempt];

      try {
        const stream = await gemini().models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: turn.system,
            maxOutputTokens: turn.maxTokens,
            tools: [{ functionDeclarations }],
            ...thinkingConfigFor(model),
          },
        });

        for await (const chunk of stream) {
          for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
            parts.push(part);
            if (part.functionCall) calls.push(part.functionCall);
            else if (part.text && !part.thought) {
              answer += part.text;
              turn.send(part.text);
            }
          }
        }
        current = attempt;
        break;
      } catch (error) {
        const status = statusOf(error);
        if (status !== undefined && COOLDOWN_MS[status]) coolingUntil.set(model, Date.now() + COOLDOWN_MS[status]);

        // Another model may answer, but only if this one has not started to:
        // text already sent cannot be taken back.
        const canRetry =
          status !== undefined && RETRYABLE.has(status) && answer.length === answeredBefore && attempt + 1 < models.length;
        if (!canRetry) throw error;
        console.warn(`gemini ${model} answered ${status}, trying ${models[attempt + 1]}`);
      }
    }

    if (calls.length === 0) break;

    contents.push({ role: 'model', parts });
    contents.push({
      role: 'user',
      parts: await Promise.all(
        calls.map(async (call) => ({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: JSON.parse(await runTool(call.name ?? '', call.args ?? {}, turn.userId)),
          },
        }))
      ),
    });
  }

  return { answer, model: models[current], rounds };
}
