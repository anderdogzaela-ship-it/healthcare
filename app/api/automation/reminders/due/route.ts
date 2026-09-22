import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAutomation, unauthorized } from '@/lib/automation/auth';
import { composeReminder } from '@/lib/automation/templates';

/**
 * Reminders that are due to be sent.
 *
 * The scheduler (n8n) polls this every few minutes, sends each message, and
 * reports the outcome to /api/automation/reminders/complete.
 */
export async function GET(request: Request) {
  if (!isAuthorizedAutomation(request)) return unauthorized();

  const limitParam = Number(new URL(request.url).searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: jobs, error } = await admin
    .from('reminder_jobs')
    .select('id, appointment_id, user_id, patient_id, kind, send_at, attempts')
    .eq('status', 'pending')
    .lte('send_at', now)
    .lt('attempts', 3)
    .order('send_at', { ascending: true })
    .limit(limit);

  if (error) return Response.json({ error: 'query_failed' }, { status: 500 });
  if (!jobs || jobs.length === 0) return Response.json({ reminders: [] });

  const userIds = jobs.map((job) => job.user_id).filter((id): id is string => Boolean(id));
  const patientIds = jobs.map((job) => job.patient_id).filter((id): id is string => Boolean(id));

  const [{ data: appointments }, { data: profiles }, { data: patients }] = await Promise.all([
    admin
      .from('appointments')
      .select('id, starts_at, professional, location, status')
      .in('id', Array.from(new Set(jobs.map((job) => job.appointment_id)))),
    userIds.length > 0
      ? admin.from('profiles').select('id, full_name, phone, locale, timezone').in('id', Array.from(new Set(userIds)))
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string | null; locale: string; timezone: string }[] }),
    patientIds.length > 0
      ? admin.from('patients').select('id, full_name, phone, locale, clinic_id').in('id', Array.from(new Set(patientIds)))
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string | null; locale: string; clinic_id: string }[] }),
  ]);

  // Clinic patients take the clinic's timezone; app users take their own.
  const clinicIds = Array.from(new Set((patients ?? []).map((patient) => patient.clinic_id)));
  const { data: clinics } = clinicIds.length > 0
    ? await admin.from('clinics').select('id, timezone').in('id', clinicIds)
    : { data: [] as { id: string; timezone: string }[] };

  const appointmentById = new Map((appointments ?? []).map((row) => [row.id, row]));
  const profileById = new Map((profiles ?? []).map((row) => [row.id, row]));
  const patientById = new Map((patients ?? []).map((row) => [row.id, row]));
  const clinicTimezone = new Map((clinics ?? []).map((row) => [row.id, row.timezone]));

  const reminders = [];
  const skip: string[] = [];
  const claim: string[] = [];

  for (const job of jobs) {
    const appointment = appointmentById.get(job.appointment_id);

    // The recipient is the clinic's patient when there is one, otherwise the
    // app user who booked it.
    const patient = job.patient_id ? patientById.get(job.patient_id) : undefined;
    const profile = job.user_id ? profileById.get(job.user_id) : undefined;

    const recipient = patient
      ? {
          name: patient.full_name,
          phone: patient.phone,
          locale: patient.locale,
          timezone: clinicTimezone.get(patient.clinic_id) ?? 'UTC',
        }
      : profile
        ? { name: profile.full_name, phone: profile.phone, locale: profile.locale, timezone: profile.timezone }
        : null;

    // Cancelled appointments, or recipients without a phone number, never get
    // a message; drop the job instead of retrying it forever.
    if (!appointment || !recipient?.phone || appointment.status === 'cancelled' || appointment.status === 'completed') {
      skip.push(job.id);
      continue;
    }

    const { locale, message } = composeReminder(job.kind, recipient, appointment);

    claim.push(job.id);
    reminders.push({
      jobId: job.id,
      appointmentId: appointment.id,
      kind: job.kind,
      phone: recipient.phone,
      locale,
      startsAt: appointment.starts_at,
      message,
    });
  }

  if (skip.length > 0) {
    await admin.from('reminder_jobs').update({ status: 'skipped' }).in('id', skip);
  }

  // Count the attempt now: a job that keeps failing stops after three tries
  // rather than messaging the user forever.
  await Promise.all(
    jobs
      .filter((job) => claim.includes(job.id))
      .map((job) => admin.from('reminder_jobs').update({ attempts: job.attempts + 1 }).eq('id', job.id))
  );

  return Response.json({ reminders });
}
