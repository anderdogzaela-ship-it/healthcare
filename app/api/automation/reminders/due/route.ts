import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAutomation, unauthorized } from '@/lib/automation/auth';
import { reminderMessage } from '@/lib/automation/templates';
import { localeTags, isLocale } from '@/lib/i18n/config';

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
    .select('id, appointment_id, user_id, kind, send_at, attempts')
    .eq('status', 'pending')
    .lte('send_at', now)
    .lt('attempts', 3)
    .order('send_at', { ascending: true })
    .limit(limit);

  if (error) return Response.json({ error: 'query_failed' }, { status: 500 });
  if (!jobs || jobs.length === 0) return Response.json({ reminders: [] });

  const [{ data: appointments }, { data: profiles }] = await Promise.all([
    admin
      .from('appointments')
      .select('id, starts_at, professional, location, status')
      .in('id', Array.from(new Set(jobs.map((job) => job.appointment_id)))),
    admin
      .from('profiles')
      .select('id, full_name, phone, locale, timezone')
      .in('id', Array.from(new Set(jobs.map((job) => job.user_id)))),
  ]);

  const appointmentById = new Map((appointments ?? []).map((row) => [row.id, row]));
  const profileById = new Map((profiles ?? []).map((row) => [row.id, row]));

  const reminders = [];
  const skip: string[] = [];
  const claim: string[] = [];

  for (const job of jobs) {
    const appointment = appointmentById.get(job.appointment_id);
    const profile = profileById.get(job.user_id);

    // Cancelled appointments, or users without a phone number, never get a
    // message; drop the job instead of retrying it forever.
    if (!appointment || !profile?.phone || appointment.status === 'cancelled' || appointment.status === 'completed') {
      skip.push(job.id);
      continue;
    }

    const locale = isLocale(profile.locale) ? profile.locale : 'en';
    const when = new Intl.DateTimeFormat(localeTags[locale], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: profile.timezone || 'UTC',
    }).format(new Date(appointment.starts_at));

    claim.push(job.id);
    reminders.push({
      jobId: job.id,
      appointmentId: appointment.id,
      kind: job.kind,
      phone: profile.phone,
      locale,
      startsAt: appointment.starts_at,
      message: reminderMessage(job.kind, locale, {
        firstName: (profile.full_name ?? '').split(' ')[0],
        when,
        professional: appointment.professional,
        location: appointment.location,
      }),
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
