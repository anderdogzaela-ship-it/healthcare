import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { detectIntent, REPLIES, type Intent } from '@/lib/automation/templates';
import { dispatchWebhook } from '@/lib/api/webhooks';
import { isLocale } from '@/lib/i18n/config';

/** Who wrote the message: an app user or a clinic's patient. */
export interface ReplySender {
  locale: string;
  userId?: string;
  patientId?: string;
}

export interface ReplyOutcome {
  intent: Intent;
  appointmentId: string | null;
  reply: string;
}

/**
 * Acts on a WhatsApp reply: works out what it means, updates the sender's next
 * appointment, notifies the clinic's webhooks and returns the answer to send.
 *
 * The real inbound route and the in-app simulator both call this, so a demo
 * behaves exactly like production. It takes the admin client because the
 * sender is not signed in; callers must have established who the sender is
 * before calling it.
 */
export async function handleReply(
  admin: SupabaseClient<Database>,
  sender: ReplySender,
  text: string,
  meta: { providerMessageId?: string | null; simulated?: boolean } = {}
): Promise<ReplyOutcome> {
  const locale = isLocale(sender.locale) ? sender.locale : 'en';
  const intent = detectIntent(text);
  const source = meta.simulated ? 'whatsapp_simulator' : 'whatsapp';

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

  const reply =
    intent === 'unknown'
      ? REPLIES[locale].unknown
      : !appointment
        ? REPLIES[locale].none
        : intent === 'confirm'
          ? REPLIES[locale].confirmed
          : intent === 'cancel'
            ? REPLIES[locale].cancelled
            : REPLIES[locale].reschedule;

  // The answer is stored with the message, so the conversation can be shown
  // back later exactly as it happened.
  await admin.from('automation_events').insert({
    user_id: sender.userId ?? null,
    patient_id: sender.patientId ?? null,
    appointment_id: appointment?.id ?? null,
    direction: 'inbound',
    channel: 'whatsapp',
    event_type: `reply_${intent}`,
    payload: {
      text,
      reply,
      providerMessageId: meta.providerMessageId ?? null,
      ...(meta.simulated && { simulated: true }),
    },
  });

  if (intent === 'unknown' || !appointment) {
    return { intent, appointmentId: appointment?.id ?? null, reply };
  }

  const now = new Date().toISOString();

  if (intent === 'confirm') {
    await admin.from('appointments').update({ status: 'confirmed', confirmed_at: now }).eq('id', appointment.id);
    if (appointment.clinic_id) {
      await dispatchWebhook(appointment.clinic_id, 'appointment.confirmed', {
        id: appointment.id,
        starts_at: appointment.starts_at,
        patient_id: sender.patientId ?? null,
        source,
      });
    }
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
        source,
      });
    }
  }

  // Reschedule: a human picks the new time, so the appointment is left as it
  // is and the reply says the team will be in touch.
  return { intent, appointmentId: appointment.id, reply };
}
