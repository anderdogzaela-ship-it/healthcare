import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import type { Database } from './database.types';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Cookie writes fail in Server Components (only Actions and Route Handlers may
 * set cookies), which is expected: the middleware refreshes the session.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the middleware handles the refresh.
        }
      },
    },
  });
}

/**
 * The signed-in user, or null.
 * Always use this (never getSession) for authorization: it revalidates the
 * token with the Auth server instead of trusting the cookie.
 */
export async function getUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/** Same as getUser, but sends signed-out visitors to the login page. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}
