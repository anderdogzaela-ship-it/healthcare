import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAutomation, unauthorized } from '@/lib/automation/auth';

const bodySchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['sent', 'failed']),
  channel: z.enum(['whatsapp', 'email', 'sms']).default('whatsapp'),
  error: z.string().max(500).optional(),
  providerMessageId: z.string().max(200).optional(),
});

/** The scheduler reports here after trying to deliver a reminder. */
export async function POST(request: Request) {
  if (!isAuthorizedAutomation(request)) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });

  const { jobId, status, channel, error, providerMessageId } = parsed.data;
  const admin = createAdminClient();

  const { data: job } = await admin
    .from('reminder_jobs')
    .select('id, user_id, patient_id, appointment_id, kind')
    .eq('id', jobId)
    .single();

  if (!job) return Response.json({ error: 'not_found' }, { status: 404 });

  await admin
    .from('reminder_jobs')
    .update({
      status,
      channel,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      error: error ?? null,
    })
    .eq('id', jobId);

  await admin.from('automation_events').insert({
    user_id: job.user_id,
    // Clinic patients have no user id; without this the event would belong
    // to nobody and never show in that patient's history.
    patient_id: job.patient_id,
    appointment_id: job.appointment_id,
    direction: 'outbound',
    channel,
    event_type: status === 'sent' ? `reminder_${job.kind}_sent` : `reminder_${job.kind}_failed`,
    payload: { jobId, providerMessageId: providerMessageId ?? null, error: error ?? null },
  });

  return Response.json({ ok: true });
}
