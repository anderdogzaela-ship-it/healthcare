import { NextResponse, type NextRequest } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { ACTIVE_CLINIC_COOKIE, getUserClinics } from '@/lib/data/clinic';

/**
 * GET /api/clinic/switch?id=<clinic>&next=/clinic
 *
 * Remembers which clinic a member of several is working in, then sends them
 * on. A route handler rather than a page, because only handlers and actions
 * may set cookies. The id is ignored unless the user belongs to that clinic.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const id = searchParams.get('id');
  const next = searchParams.get('next');
  const destination = next && next.startsWith('/') ? next : '/clinic';

  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(destination)}`);

  const response = NextResponse.redirect(`${origin}${destination}`);

  const clinics = await getUserClinics(user.id);
  if (id && clinics.some((clinic) => clinic.id === id)) {
    response.cookies.set(ACTIVE_CLINIC_COOKIE, id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}
