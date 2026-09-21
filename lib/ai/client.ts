import Anthropic from '@anthropic-ai/sdk';
import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';

/**
 * Where Claude is called from.
 *
 * - `anthropic` (default): the Claude API, with ANTHROPIC_API_KEY.
 * - `bedrock`: Amazon Bedrock, which lets new AWS accounts pay with their
 *   promotional credits.
 */
export type AiProvider = 'anthropic' | 'bedrock';

export const AI_PROVIDER: AiProvider = process.env.AI_PROVIDER === 'bedrock' ? 'bedrock' : 'anthropic';

const BASE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

/** Bedrock names the same models with an `anthropic.` prefix. */
export const MODEL =
  AI_PROVIDER === 'bedrock' && !BASE_MODEL.startsWith('anthropic.') ? `anthropic.${BASE_MODEL}` : BASE_MODEL;

const family = MODEL.replace(/^anthropic\./, '');

/**
 * Request options differ by model and platform, and sending one that is not
 * supported is a 400: Haiku 4.5 rejects `effort`, and server-side fallbacks
 * exist only on the Claude API, for Opus 5 and the Fable models.
 */
export const SUPPORTS_EFFORT = !family.startsWith('claude-haiku');
export const SUPPORTS_FALLBACKS =
  AI_PROVIDER === 'anthropic' && (family === 'claude-opus-5' || family.startsWith('claude-fable'));
/** Kept to the Claude API, where it is known to be accepted. */
export const SUPPORTS_EAGER_TOOL_INPUT = AI_PROVIDER === 'anthropic';

/*
 * Bedrock settings use their own names, not the AWS_* ones: Vercel reserves
 * AWS_REGION and AWS_ACCESS_KEY_ID, and its functions already carry AWS
 * credentials of their own that the SDK's default chain would pick up.
 */
const bedrockRegion = () => process.env.BEDROCK_REGION || 'us-east-1';
const bedrockApiKey = () => process.env.BEDROCK_API_KEY;
const bedrockAccessKey = () => process.env.BEDROCK_ACCESS_KEY_ID;
const bedrockSecretKey = () => process.env.BEDROCK_SECRET_ACCESS_KEY;

/** Whether the chosen provider has the credentials it needs. */
export function aiConfigured(): boolean {
  if (AI_PROVIDER === 'bedrock') {
    return Boolean(bedrockApiKey() || (bedrockAccessKey() && bedrockSecretKey()));
  }
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** The part of the client the assistant uses; both platforms provide it. */
export type ClaudeClient = { beta: { messages: Anthropic['beta']['messages'] } };

let client: ClaudeClient | null = null;

/**
 * Created on first use, not at import.
 *
 * The SDKs throw when credentials are missing, and a module-level client would
 * turn that into a failed build for a deployment that simply has no assistant
 * configured yet.
 */
export function claude(): ClaudeClient {
  if (client) return client;

  if (AI_PROVIDER === 'bedrock') {
    const apiKey = bedrockApiKey();
    client = new AnthropicBedrockMantle(
      apiKey
        ? { awsRegion: bedrockRegion(), apiKey }
        : {
            awsRegion: bedrockRegion(),
            awsAccessKey: bedrockAccessKey(),
            awsSecretAccessKey: bedrockSecretKey(),
          }
    ) as unknown as ClaudeClient;
  } else {
    client = new Anthropic();
  }

  return client;
}
