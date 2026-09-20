import { createAdminClient } from '@/lib/supabase/admin';
import { authenticateRequest, UNAUTHORIZED } from '@/lib/api/auth';

export const runtime = 'nodejs';

/**
 * GET /api/v1/me — who this key belongs to.
 * The endpoint integrations call first to check a key works.
 */
export async function GET(request: Request) {
  const caller = await authenticateRequest(request);
  if (!caller) return UNAUTHORIZED();

  const admin = createAdminClient();
  const { data: clinic } = await admin
    .from('clinics')
    .select('id, name, timezone, plan')
    .eq('id', caller.clinicId)
    .single();

  return Response.json({
    data: {
      clinic,
      authenticated: true,
      scopes: ['patients:read', 'patients:write', 'appointments:read', 'appointments:write'],
    },
  });
}
