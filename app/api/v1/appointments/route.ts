import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, authenticateRequest, UNAUTHORIZED } from '@/lib/api/auth';
import { dispatchWebhook } from '@/lib/api/webhooks';

export const runtime = 'nodejs';

const HOUR = 60 * 60 * 1000;

const createSchema = z.object({
  patient_id: z.string().uuid(),
  // ISO 8601 with an offset, e.g. 2026-09-25T14:30:00-03:00
  starts_at: z.string().datetime({ offset: true }),
  duration_min: z.number().int().min(5).max(480).default(30),
  professional: z.string().trim().max(120).default(''),
  location: z.string().trim().max(160).optional(),
  reason: z.string().trim().max(500).optional(),
  /** Queue the WhatsApp reminders for this appointment. */
  reminders: z.boolean().default(true),
});

/** GET /api/v1/appointments — appointments in a date range. */
export async function GET(request: Request) {
  const caller = await authenticateRequest(request);
  if (!caller) return UNAUTHORIZED();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

  const admin = createAdminClient();
  let query = admin
    .from('appointments')
    .select('id, patient_id, starts_at, duration_min, professional, location, reason, status, created_at')
    .eq('clinic_id', caller.clinicId)
    .order('starts_at', { ascending: true })
    .limit(limit);

  if (from) query = query.gte('starts_at', from);
  if (to) query = query.lte('starts_at', to);

  const { data, error } = await query;
  if (error) return apiError(500, 'query_failed');

  return Response.json({ data });
}

/** POST /api/v1/appointments — book an appointment and queue its reminders. */
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

  // The patient must belong to the calling clinic: the key does not grant
  // access to anyone else's records.
  const { data: patient } = await admin
    .from('patients')
    .select('id')
    .eq('id', parsed.data.patient_id)
    .eq('clinic_id', caller.clinicId)
    .maybeSingle();

  if (!patient) return apiError(404, 'patient_not_found');

  const startsAt = new Date(parsed.data.starts_at);

  const { data: appointment, error } = await admin
    .from('appointments')
    .insert({
      clinic_id: caller.clinicId,
      patient_id: patient.id,
      starts_at: startsAt.toISOString(),
      duration_min: parsed.data.duration_min,
      professional: parsed.data.professional,
      location: parsed.data.location ?? null,
      reason: parsed.data.reason ?? null,
    })
    .select('id, patient_id, starts_at, duration_min, professional, location, reason, status')
    .single();

  if (error || !appointment) return apiError(500, 'create_failed');

  if (parsed.data.reminders) {
    const now = Date.now();
    const jobs = ([
      { kind: '24h' as const, before: 24 * HOUR },
      { kind: '2h' as const, before: 2 * HOUR },
    ]).map(({ kind, before }) => {
      const sendAt = new Date(startsAt.getTime() - before);
      return {
        appointment_id: appointment.id,
        patient_id: patient.id,
        kind,
        send_at: sendAt.toISOString(),
        status: sendAt.getTime() <= now ? ('skipped' as const) : ('pending' as const),
      };
    });

    await admin.from('reminder_jobs').upsert(jobs, { onConflict: 'appointment_id,kind' });
  }

  await dispatchWebhook(caller.clinicId, 'appointment.created', appointment);

  return Response.json({ data: appointment }, { status: 201 });
}
