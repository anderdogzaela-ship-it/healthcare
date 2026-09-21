import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl } from './env';
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
  // Supabase calls this the service_role key; newer projects also expose it as
  // a "secret key". Either name works here.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY). ' +
        'The public API, the automation endpoints and the webhook sender need it. ' +
        'Copy it from Supabase → Project Settings → API.'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
