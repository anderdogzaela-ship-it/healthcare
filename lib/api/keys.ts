import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const PREFIX = 'hai';

export interface GeneratedKey {
  /** Shown to the user once and never stored. */
  plaintext: string;
  /** Stored, so the key can be recognised in a list. */
  prefix: string;
  /** Stored instead of the key itself. */
  hash: string;
}

/** Creates an API key: `hai_<random>`, of which we keep only a hash. */
export function generateApiKey(): GeneratedKey {
  const secret = randomBytes(24).toString('base64url');
  const plaintext = `${PREFIX}_${secret}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 10),
    hash: hashApiKey(plaintext),
  };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Constant-time comparison of two hex digests. */
export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

/** Reads the key from `Authorization: Bearer ...` or the `x-api-key` header. */
export function readApiKey(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim() || null;
  }
  return request.headers.get('x-api-key');
}
