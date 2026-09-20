import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, authenticateAndLimit } from '@/lib/api/auth';
import { dispatchWebhook } from '@/lib/api/webhooks';

export const runtime = 'nodejs';

const HOUR = 60 * 60 * 1000;

const updateSchema = z.object({
  starts_at: z.string().datetime({ offset: true }).optional(),
  duration_min: z.number().int().min(5).max(480).optional(),
  professional: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).nullable().optional(),
  reason: z.string().trim().max(500).nullable().optional(),
  status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
});

/** GET /api/v1/appointments/{id} */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const caller = await authenticateAndLimit(request);
  if (caller instanceof Response) return caller;

  const admin = createAdminClient();
  const { data } = await admin
    .from('appointments')
    .select('id, patient_id, starts_at, duration_min, professional, location, reason, status, created_at')
    .eq('id', params.id)
    .eq('clinic_id', caller.clinicId)
    .maybeSingle();

  if (!data) return apiError(404, 'not_found');
  return Response.json({ data });
}

/**
 * PATCH /api/v1/appointments/{id}
 *
 * Moving an appointment re-queues its reminders for the new time; cancelling
 * it stops the ones that have not gone out.
 */
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

  const now = new Date().toISOString();
  const patch = {
    ...(parsed.data.starts_at !== undefined && { starts_at: new Date(parsed.data.starts_at).toISOString() }),
    ...(parsed.data.duration_min !== undefined && { duration_min: parsed.data.duration_min }),
    ...(parsed.data.professional !== undefined && { professional: parsed.data.professional }),
    ...(parsed.data.location !== undefined && { location: parsed.data.location }),
    ...(parsed.data.reason !== undefined && { reason: parsed.data.reason }),
    ...(parsed.data.status !== undefined && { status: parsed.data.status }),
    ...(parsed.data.status === 'confirmed' && { confirmed_at: now }),
    ...(parsed.data.status === 'cancelled' && { cancelled_at: now }),
  };

  if (Object.keys(patch).length === 0) return apiError(400, 'empty_patch');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('appointments')
    .update(patch)
    .eq('id', params.id)
    .eq('clinic_id', caller.clinicId)
    .select('id, patient_id, starts_at, duration_min, professional, location, reason, status')
    .maybeSingle();

  if (error) return apiError(500, 'update_failed');
  if (!data) return apiError(404, 'not_found');

  if (parsed.data.starts_at && data.status !== 'cancelled') {
    const startsAt = new Date(data.starts_at);
    const nowMs = Date.now();
    const jobs = ([
      { kind: '24h' as const, before: 24 * HOUR },
      { kind: '2h' as const, before: 2 * HOUR },
    ]).map(({ kind, before }) => {
      const sendAt = new Date(startsAt.getTime() - before);
      return {
        appointment_id: data.id,
        patient_id: data.patient_id,
        kind,
        send_at: sendAt.toISOString(),
        status: sendAt.getTime() <= nowMs ? ('skipped' as const) : ('pending' as const),
      };
    });

    await admin.from('reminder_jobs').upsert(jobs, { onConflict: 'appointment_id,kind' });
  }

  if (parsed.data.status === 'cancelled') {
    await admin
      .from('reminder_jobs')
      .update({ status: 'skipped' })
      .eq('appointment_id', data.id)
      .eq('status', 'pending');
    await dispatchWebhook(caller.clinicId, 'appointment.cancelled', { ...data, source: 'api' });
  }

  if (parsed.data.status === 'confirmed') {
    await dispatchWebhook(caller.clinicId, 'appointment.confirmed', { ...data, source: 'api' });
  }

  return Response.json({ data });
}

/** DELETE /api/v1/appointments/{id} — cancels it and stops its reminders. */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const caller = await authenticateAndLimit(request);
  if (caller instanceof Response) return caller;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('appointments')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('clinic_id', caller.clinicId)
    .select('id, patient_id, starts_at, status')
    .maybeSingle();

  if (error) return apiError(500, 'delete_failed');
  if (!data) return apiError(404, 'not_found');

  await admin
    .from('reminder_jobs')
    .update({ status: 'skipped' })
    .eq('appointment_id', data.id)
    .eq('status', 'pending');

  await dispatchWebhook(caller.clinicId, 'appointment.cancelled', { ...data, source: 'api' });

  return Response.json({ data });
}
