import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, image files, and the machine-to-machine
    // endpoints, which authenticate themselves and have no session to refresh.
    '/((?!_next/static|_next/image|favicon.ico|api/stripe|api/automation|api/v1|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
