import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAutomation, unauthorized } from '@/lib/automation/auth';
import { handleReply, type ReplySender } from '@/lib/automation/inbound';

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

  let sender: ReplySender | null = profile
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

  const outcome = await handleReply(admin, sender, parsed.data.text, {
    providerMessageId: parsed.data.providerMessageId ?? null,
  });

  return Response.json({
    matched: true,
    intent: outcome.intent,
    ...(outcome.appointmentId && { appointmentId: outcome.appointmentId }),
    reply: outcome.reply,
  });
}
