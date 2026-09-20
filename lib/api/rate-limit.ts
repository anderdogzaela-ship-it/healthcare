import { createAdminClient } from '@/lib/supabase/admin';

/** Requests allowed per key, per minute. */
export const WINDOW_SECONDS = 60;
export const MAX_PER_WINDOW = 120;

/**
 * Counts a request against the key's quota.
 *
 * Returns false when the caller is over the limit. If the check itself fails
 * (database hiccup) the request is allowed: a broken limiter should not take
 * the whole API down.
 */
export async function consumeRateLimit(keyId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_key_id: keyId,
      p_window_seconds: WINDOW_SECONDS,
      p_max: MAX_PER_WINDOW,
    });

    if (error) {
      console.error('rate limit check failed', error);
      return true;
    }
    return data !== false;
  } catch (error) {
    console.error('rate limit check failed', error);
    return true;
  }
}

export function rateLimited() {
  return Response.json(
    { error: 'rate_limited', detail: `Limit is ${MAX_PER_WINDOW} requests per minute.` },
    { status: 429, headers: { 'Retry-After': String(WINDOW_SECONDS) } }
  );
}
