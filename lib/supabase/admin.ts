import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl } from './env';
import type { Database } from './database.types';

/**
 * Catches the most common mistake: pasting the anon or publishable key, which
 * sits right next to the service key in the Supabase dashboard.
 *
 * With the wrong key nothing errors — row level security simply hides every
 * row — so the failure would otherwise look like "not found" everywhere.
 */
function serviceKeyProblem(key: string): string | null {
  if (key.startsWith('sb_publishable_')) {
    return 'this is the publishable key. Use the secret key (sb_secret_...) instead.';
  }

  // Legacy keys are JWTs whose payload names the role they grant.
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { role?: string };
      if (payload.role && payload.role !== 'service_role') {
        return `this key has role "${payload.role}". Use the service_role key instead.`;
      }
    } catch {
      // Not a readable JWT: let Supabase be the judge.
    }
  }

  return null;
}

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

  const problem = serviceKeyProblem(serviceKey);
  if (problem) throw new Error(`SUPABASE_SERVICE_ROLE_KEY is set to the wrong key: ${problem}`);

  return createSupabaseClient<Database>(supabaseUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
