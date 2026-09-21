import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from './env';

/** Routes that require a signed-in user. */
const PROTECTED = [
  '/dashboard', '/health', '/appointments', '/clinic', '/chat', '/activity', '/settings', '/reset-password',
];
/** Auth pages a signed-in user has no reason to see. */
const AUTH_PAGES = ['/login', '/signup'];

/**
 * Refreshes the Supabase session cookie on every request and does a cheap
 * redirect. This is a convenience, not the security boundary: each protected
 * layout and Server Action checks the user again on the server.
 */
export async function updateSession(request: NextRequest) {
  // When an email link's redirect is not on Supabase's allow list, Supabase
  // sends the user to the project's Site URL instead, with the code still
  // attached. Forward those to the handlers rather than showing the landing
  // page to someone who is not actually signed in.
  const incoming = request.nextUrl;
  if (incoming.pathname === '/' && (incoming.searchParams.has('code') || incoming.searchParams.has('token_hash'))) {
    const url = incoming.clone();
    url.pathname = incoming.searchParams.has('token_hash') ? '/auth/confirm' : '/auth/callback';
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not run code between createServerClient and getUser: it can cause
  // random sign-outs by letting the refreshed cookies get lost.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && PROTECTED.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
