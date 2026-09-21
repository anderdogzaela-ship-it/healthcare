import { GoogleGenAI, type Content, type FunctionCall, type Part } from '@google/genai';
import { runTool, tools } from '@/lib/ai/tools';

/**
 * The assistant on Google's Gemini API, whose free tier needs no card.
 *
 * Same contract as the Claude path: the same read-only tools, scoped to the
 * signed-in user on the server, and the same system prompt.
 */

let client: GoogleGenAI | null = null;

/** Created on first use, so a deployment without the key still builds. */
function gemini(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/** The Claude tool definitions, restated as Gemini function declarations. */
const functionDeclarations = tools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parametersJsonSchema: tool.input_schema,
}));

/**
 * Tried in order when the chosen model is overloaded (503), out of free quota
 * (429) or retired for new accounts (404), which happens on the free tier.
 */
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3-flash-preview'];
const RETRYABLE = new Set([404, 429, 503]);

function isRetryable(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return typeof status === 'number' && RETRYABLE.has(status);
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

/** Streams one answer and returns its full text. */
export async function answerWithGemini(turn: GeminiTurn): Promise<string> {
  const contents: Content[] = turn.history.map((row) => ({
    role: row.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: row.content }],
  }));

  const models = [turn.model, ...FALLBACK_MODELS.filter((model) => model !== turn.model)];
  // Once a model answers, later rounds stay on it: the thought signatures it
  // returned belong to that model.
  let current = 0;
  let answer = '';

  for (let round = 0; round < turn.maxToolRounds; round++) {
    // Every part is kept, not just the text: function calls carry a thought
    // signature that must be sent back unchanged with their results.
    let parts: Part[] = [];
    let calls: FunctionCall[] = [];

    for (let attempt = current; ; attempt++) {
      parts = [];
      calls = [];
      const answeredBefore = answer.length;

      try {
        const stream = await gemini().models.generateContentStream({
          model: models[attempt],
          contents,
          config: {
            systemInstruction: turn.system,
            maxOutputTokens: turn.maxTokens,
            tools: [{ functionDeclarations }],
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
        // Another model may answer, but only if this one has not started to:
        // text already sent cannot be taken back.
        const canRetry = isRetryable(error) && answer.length === answeredBefore && attempt + 1 < models.length;
        if (!canRetry) throw error;
        console.warn(`gemini ${models[attempt]} unavailable, trying ${models[attempt + 1]}`);
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

  return answer;
}
