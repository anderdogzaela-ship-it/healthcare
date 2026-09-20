import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAutomation, unauthorized } from '@/lib/automation/auth';
import { detectIntent, REPLIES } from '@/lib/automation/templates';
import { dispatchWebhook } from '@/lib/api/webhooks';
import { isLocale } from '@/lib/i18n/config';

const bodySchema = z.object({
  from: z.string().min(6).max(30),
  text: z.string().max(1000),
  providerMessageId: z.string().max(200).optional(),
});

/** Normalizes a phone number to E.164-ish form so lookups match what we store. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

/**
 * Inbound WhatsApp message.
 *
 * The provider posts here (through n8n); this route decides what the message
 * means, updates the appointment, and returns the reply to send back. The
 * number can belong either to an app user or to a clinic's patient.
 */
export async function POST(request: Request) {
  if (!isAuthorizedAutomation(request)) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });

  const phone = normalizePhone(parsed.data.from);
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('id, locale')
    .eq('phone', phone)
    .maybeSingle();

  let sender: { locale: string; userId?: string; patientId?: string } | null = profile
    ? { locale: profile.locale, userId: profile.id }
    : null;

  if (!sender) {
    const { data: patients } = await admin
      .from('patients')
      .select('id, locale')
      .eq('phone', phone)
      .limit(1);

    const patient = patients?.[0];
    if (patient) sender = { locale: patient.locale, patientId: patient.id };
  }

  // Unknown number: never reveal whether it belongs to an account.
  if (!sender) return Response.json({ matched: false, reply: null });

  const locale = isLocale(sender.locale) ? sender.locale : 'en';
  const intent = detectIntent(parsed.data.text);

  const query = admin
    .from('appointments')
    .select('id, starts_at, status, clinic_id')
    .in('status', ['scheduled', 'confirmed'])
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1);

  const { data: appointments } = sender.userId
    ? await query.eq('user_id', sender.userId)
    : await query.eq('patient_id', sender.patientId!);

  const appointment = appointments?.[0];

  await admin.from('automation_events').insert({
    user_id: sender.userId ?? null,
    patient_id: sender.patientId ?? null,
    appointment_id: appointment?.id ?? null,
    direction: 'inbound',
    channel: 'whatsapp',
    event_type: `reply_${intent}`,
    payload: { text: parsed.data.text, providerMessageId: parsed.data.providerMessageId ?? null },
  });

  if (intent === 'unknown') {
    return Response.json({ matched: true, intent, reply: REPLIES[locale].unknown });
  }

  if (!appointment) {
    return Response.json({ matched: true, intent, reply: REPLIES[locale].none });
  }

  const now = new Date().toISOString();

  if (intent === 'confirm') {
    await admin.from('appointments').update({ status: 'confirmed', confirmed_at: now }).eq('id', appointment.id);
    if (appointment.clinic_id) {
      await dispatchWebhook(appointment.clinic_id, 'appointment.confirmed', {
        id: appointment.id,
        starts_at: appointment.starts_at,
        patient_id: sender.patientId ?? null,
        source: 'whatsapp',
      });
    }
    return Response.json({ matched: true, intent, appointmentId: appointment.id, reply: REPLIES[locale].confirmed });
  }

  if (intent === 'cancel') {
    await admin.from('appointments').update({ status: 'cancelled', cancelled_at: now }).eq('id', appointment.id);
    // A cancelled appointment must not keep sending reminders.
    await admin
      .from('reminder_jobs')
      .update({ status: 'skipped' })
      .eq('appointment_id', appointment.id)
      .eq('status', 'pending');
    if (appointment.clinic_id) {
      await dispatchWebhook(appointment.clinic_id, 'appointment.cancelled', {
        id: appointment.id,
        starts_at: appointment.starts_at,
        patient_id: sender.patientId ?? null,
        source: 'whatsapp',
      });
    }
    return Response.json({ matched: true, intent, appointmentId: appointment.id, reply: REPLIES[locale].cancelled });
  }

  // Reschedule: a human picks the new time, so only flag it for the team.
  return Response.json({ matched: true, intent, appointmentId: appointment.id, reply: REPLIES[locale].reschedule });
}
