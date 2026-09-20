import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAutomation, unauthorized } from '@/lib/automation/auth';
import { detectIntent, REPLIES } from '@/lib/automation/templates';
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
 * The WhatsApp provider posts here (through n8n), the route decides what the
 * message means, updates the appointment, and returns the reply for the
 * provider to send back. Keeping the decision here rather than in the workflow
 * means the rules are versioned with the app.
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

  // Unknown number: log nothing personal, and let the workflow decide what to
  // answer. Never reveal whether a number belongs to an account.
  if (!profile) {
    return Response.json({ matched: false, reply: null });
  }

  const locale = isLocale(profile.locale) ? profile.locale : 'en';
  const intent = detectIntent(parsed.data.text);

  const { data: appointment } = await admin
    .from('appointments')
    .select('id, starts_at, status')
    .eq('user_id', profile.id)
    .in('status', ['scheduled', 'confirmed'])
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  await admin.from('automation_events').insert({
    user_id: profile.id,
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
    return Response.json({ matched: true, intent, appointmentId: appointment.id, reply: REPLIES[locale].cancelled });
  }

  // Reschedule: a human picks the new time, so only flag it for the team.
  return Response.json({ matched: true, intent, appointmentId: appointment.id, reply: REPLIES[locale].reschedule });
}
