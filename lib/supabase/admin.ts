import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';
import type { Database } from './database.types';

/**
 * Service-role client: bypasses row level security.
 *
 * Only for the automation routes, which act on behalf of the scheduler rather
 * than a signed-in user, and which are themselves guarded by a shared secret.
 * Never import this into a page, a component or a user-facing action, and
 * never expose the key to the browser.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY: required by the automation endpoints.');
  }

  return createSupabaseClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
