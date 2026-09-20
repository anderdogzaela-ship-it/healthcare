import { createAdminClient } from '@/lib/supabase/admin';
import { hashApiKey, readApiKey } from './keys';

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
  const { data } = await admin
    .from('api_keys')
    .select('id, clinic_id, revoked_at')
    .eq('key_hash', hashApiKey(key))
    .maybeSingle();

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
