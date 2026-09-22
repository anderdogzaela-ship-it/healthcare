'use server';

import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClinicContext } from '@/lib/data/clinic';
import { composeReminder } from '@/lib/automation/templates';
import { handleReply } from '@/lib/automation/inbound';
import { logDbError } from '@/lib/supabase/log';

/**
 * The in-app WhatsApp simulator: shows a clinic how reminders and replies work
 * without a WhatsApp provider. Nothing reaches a real phone, but replies run
 * through the same handler as the live integration, so appointments really
 * change and the clinic's webhooks really fire.
 *
 * Ownership is checked with the user's own session (row level security) first;
 * only then is the admin client used, because automation events and the reply
 * handler work outside any single user's rows.
 */

export type SimulatorResult = { status: 'ok' } | { status: 'error'; reason: 'forbidden' | 'invalid' | 'failed' };

export async function simulateReminder(formData: FormData): Promise<SimulatorResult> {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) return { status: 'error', reason: 'forbidden' };

  const appointmentId = formData.get('appointmentId');
  const kind = formData.get('kind') === '2h' ? '2h' : '24h';
  if (typeof appointmentId !== 'string') return { status: 'error', reason: 'invalid' };

  const supabase = createClient();
  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, patient_id, starts_at, professional, location, status, clinic_id')
    .eq('id', appointmentId)
    .eq('clinic_id', clinic.id)
    .maybeSingle();
  if (!appointment?.patient_id) return { status: 'error', reason: 'forbidden' };

  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, locale')
    .eq('id', appointment.patient_id)
    .eq('clinic_id', clinic.id)
    .maybeSingle();
  if (!patient) return { status: 'error', reason: 'forbidden' };

  const { message } = composeReminder(
    kind,
    { name: patient.full_name, locale: patient.locale, timezone: clinic.timezone },
    appointment
  );

  const { error } = await createAdminClient().from('automation_events').insert({
    patient_id: patient.id,
    appointment_id: appointment.id,
    direction: 'outbound',
    channel: 'whatsapp',
    event_type: `reminder_${kind}_sent`,
    payload: { text: message, simulated: true },
  });
  logDbError('simulator.reminder', error);
  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath('/clinic/whatsapp');
  return { status: 'ok' };
}

export async function simulateReply(formData: FormData): Promise<SimulatorResult> {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) return { status: 'error', reason: 'forbidden' };

  const patientId = formData.get('patientId');
  const text = String(formData.get('text') ?? '').trim().slice(0, 1000);
  if (typeof patientId !== 'string' || !text) return { status: 'error', reason: 'invalid' };

  const { data: patient } = await createClient()
    .from('patients')
    .select('id, locale')
    .eq('id', patientId)
    .eq('clinic_id', clinic.id)
    .maybeSingle();
  if (!patient) return { status: 'error', reason: 'forbidden' };

  try {
    await handleReply(createAdminClient(), { patientId: patient.id, locale: patient.locale }, text, { simulated: true });
  } catch (error) {
    console.error('simulator reply failed', error);
    return { status: 'error', reason: 'failed' };
  }

  revalidatePath('/clinic/whatsapp');
  revalidatePath('/clinic');
  return { status: 'ok' };
}
