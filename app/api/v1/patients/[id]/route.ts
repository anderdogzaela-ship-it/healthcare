import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, authenticateAndLimit } from '@/lib/api/auth';

export const runtime = 'nodejs';

const updateSchema = z.object({
  full_name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  locale: z.enum(['en', 'es', 'pt']).optional(),
  status: z.enum(['lead', 'active', 'inactive', 'archived']).optional(),
  notes: z.string().max(4000).nullable().optional(),
});

function normalizePhone(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const digits = value.replace(/\D/g, '');
  return digits ? `+${digits}` : null;
}

/** GET /api/v1/patients/{id} */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const caller = await authenticateAndLimit(request);
  if (caller instanceof Response) return caller;

  const admin = createAdminClient();
  const { data } = await admin
    .from('patients')
    .select('id, full_name, email, phone, status, locale, date_of_birth, notes, created_at')
    .eq('id', params.id)
    .eq('clinic_id', caller.clinicId)
    .maybeSingle();

  if (!data) return apiError(404, 'not_found');
  return Response.json({ data });
}

/** PATCH /api/v1/patients/{id} — partial update. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const caller = await authenticateAndLimit(request);
  if (caller instanceof Response) return caller;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'invalid_body', parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })));
  }

  // Only the fields actually sent are changed.
  const patch = {
    ...(parsed.data.full_name !== undefined && { full_name: parsed.data.full_name }),
    ...(parsed.data.phone !== undefined && { phone: normalizePhone(parsed.data.phone) }),
    ...(parsed.data.email !== undefined && { email: parsed.data.email }),
    ...(parsed.data.date_of_birth !== undefined && { date_of_birth: parsed.data.date_of_birth }),
    ...(parsed.data.locale !== undefined && { locale: parsed.data.locale }),
    ...(parsed.data.status !== undefined && { status: parsed.data.status }),
    ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
  };

  if (Object.keys(patch).length === 0) return apiError(400, 'empty_patch');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('patients')
    .update(patch)
    .eq('id', params.id)
    .eq('clinic_id', caller.clinicId)
    .select('id, full_name, email, phone, status, locale, date_of_birth, created_at')
    .maybeSingle();

  if (error) return apiError(500, 'update_failed');
  if (!data) return apiError(404, 'not_found');

  return Response.json({ data });
}

/**
 * DELETE /api/v1/patients/{id}
 *
 * Archives the patient rather than deleting the row, so their appointment
 * history and the audit trail survive. Pass ?hard=true to delete for real,
 * which is what a data-erasure request needs.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const caller = await authenticateAndLimit(request);
  if (caller instanceof Response) return caller;

  const hard = new URL(request.url).searchParams.get('hard') === 'true';
  const admin = createAdminClient();

  if (hard) {
    const { error } = await admin
      .from('patients')
      .delete()
      .eq('id', params.id)
      .eq('clinic_id', caller.clinicId);

    if (error) return apiError(500, 'delete_failed');
    return new Response(null, { status: 204 });
  }

  const { data, error } = await admin
    .from('patients')
    .update({ status: 'archived' })
    .eq('id', params.id)
    .eq('clinic_id', caller.clinicId)
    .select('id, status')
    .maybeSingle();

  if (error) return apiError(500, 'delete_failed');
  if (!data) return apiError(404, 'not_found');

  return Response.json({ data });
}
