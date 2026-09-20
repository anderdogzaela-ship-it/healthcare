import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, authenticateRequest, UNAUTHORIZED } from '@/lib/api/auth';
import { dispatchWebhook } from '@/lib/api/webhooks';

export const runtime = 'nodejs';

const createSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  locale: z.enum(['en', 'es', 'pt']).default('en'),
  status: z.enum(['lead', 'active', 'inactive']).default('lead'),
});

function normalizePhone(value?: string): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits ? `+${digits}` : null;
}

/** GET /api/v1/patients — the clinic's patients, newest first. */
export async function GET(request: Request) {
  const caller = await authenticateRequest(request);
  if (!caller) return UNAUTHORIZED();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);
  const status = searchParams.get('status');

  const admin = createAdminClient();
  let query = admin
    .from('patients')
    .select('id, full_name, email, phone, status, locale, date_of_birth, created_at', { count: 'exact' })
    .eq('clinic_id', caller.clinicId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) return apiError(500, 'query_failed');

  return Response.json({ data, pagination: { limit, offset, total: count ?? 0 } });
}

/** POST /api/v1/patients — create a patient. */
export async function POST(request: Request) {
  const caller = await authenticateRequest(request);
  if (!caller) return UNAUTHORIZED();

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'invalid_body', parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })));
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('patients')
    .insert({
      clinic_id: caller.clinicId,
      full_name: parsed.data.full_name,
      phone: normalizePhone(parsed.data.phone),
      email: parsed.data.email ?? null,
      date_of_birth: parsed.data.date_of_birth ?? null,
      locale: parsed.data.locale,
      status: parsed.data.status,
    })
    .select('id, full_name, email, phone, status, locale, created_at')
    .single();

  if (error || !data) return apiError(500, 'create_failed');

  await dispatchWebhook(caller.clinicId, 'patient.created', data);

  return Response.json({ data }, { status: 201 });
}
