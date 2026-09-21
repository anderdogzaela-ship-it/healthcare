import { createAdminClient } from '@/lib/supabase/admin';
import { hashApiKey, readApiKey } from './keys';
import { consumeRateLimit, rateLimited } from './rate-limit';
import { logDbError } from '@/lib/supabase/log';

export interface ApiCaller {
  clinicId: string;
  keyId: string;
}

/**
 * Authenticates a public API request.
 *
 * The key is looked up by its hash, so a stolen database row cannot be used to
 * call the API. Revoked keys are rejected.
 */
export async function authenticateRequest(request: Request): Promise<ApiCaller | null> {
  const key = readApiKey(request);
  if (!key || key.length < 16) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('api_keys')
    .select('id, clinic_id, revoked_at')
    .eq('key_hash', hashApiKey(key))
    .maybeSingle();

  // A failed lookup is a server problem, not an unknown key: let the caller
  // answer 503 rather than telling the integrator their key is wrong.
  if (error) {
    logDbError('api.authenticate', error);
    throw new Error(`API key lookup failed: ${error.message}`);
  }

  if (!data || data.revoked_at) return null;

  // Best effort: a failed timestamp update must not fail the request.
  await admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);

  return { clinicId: data.clinic_id, keyId: data.id };
}

export function apiError(status: number, error: string, detail?: unknown) {
  return Response.json({ error, detail }, { status });
}

export const UNAUTHORIZED = () =>
  Response.json(
    { error: 'unauthorized', detail: 'Send your key as `Authorization: Bearer <key>`.' },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
  );

/**
 * Authenticate and count the request against the key's quota.
 *
 * Returns either the caller or the Response to send back, so a route handler
 * is one line: `if (caller instanceof Response) return caller;`
 */
export async function authenticateAndLimit(request: Request): Promise<ApiCaller | Response> {
  let caller: ApiCaller | null;
  try {
    caller = await authenticateRequest(request);
  } catch (error) {
    // A missing service role key or an unreachable database is a server
    // problem; answering 401 here would send integrators hunting for a bad
    // key that is actually fine.
    console.error('api authentication failed', error);
    return Response.json({ error: 'not_configured' }, { status: 503 });
  }

  if (!caller) return UNAUTHORIZED();
  if (!(await consumeRateLimit(caller.keyId))) return rateLimited();
  return caller;
}
