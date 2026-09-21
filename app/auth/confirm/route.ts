import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Target of email links built with a token hash:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 *
 * Unlike the code flow in /auth/callback, this does not depend on a cookie
 * left in the browser that started the sign-up, so the link also works when
 * it is opened on another device — the usual case with a phone mail app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next');

  const fallback = type === 'recovery' ? '/reset-password' : '/dashboard';
  const destination = next && next.startsWith('/') ? next : fallback;

  if (tokenHash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
