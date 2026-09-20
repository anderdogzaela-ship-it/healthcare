'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, requireUser } from '@/lib/supabase/server';

export type AppointmentResult = { status: 'ok' } | { status: 'error'; reason: 'invalid' | 'failed' };

const appointmentSchema = z.object({
  // Local date and time from the browser, e.g. 2026-09-20 and 14:30.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.coerce.number().int().min(5).max(480).default(30),
  professional: z.string().trim().max(120).default(''),
  location: z.string().trim().max(160).optional(),
  reason: z.string().trim().max(500).optional(),
  // Minutes between the browser and UTC, from getTimezoneOffset().
  timezoneOffset: z.coerce.number().int().min(-840).max(840),
});

const HOUR = 60 * 60 * 1000;

/** Reminder offsets before the appointment. */
const REMINDERS: { kind: '24h' | '2h'; before: number }[] = [
  { kind: '24h', before: 24 * HOUR },
  { kind: '2h', before: 2 * HOUR },
];

/**
 * Queues the reminders for an appointment. Reminders whose time has already
 * passed are marked skipped rather than fired late, so booking something for
 * this afternoon never sends a "tomorrow" message.
 */
async function scheduleReminders(appointmentId: string, userId: string, startsAt: Date) {
  const supabase = createClient();
  const now = Date.now();

  const jobs = REMINDERS.map(({ kind, before }) => {
    const sendAt = new Date(startsAt.getTime() - before);
    return {
      appointment_id: appointmentId,
      user_id: userId,
      kind,
      send_at: sendAt.toISOString(),
      status: sendAt.getTime() <= now ? ('skipped' as const) : ('pending' as const),
    };
  });

  await supabase.from('reminder_jobs').upsert(jobs, { onConflict: 'appointment_id,kind' });
}

export async function createAppointment(formData: FormData): Promise<AppointmentResult> {
  const user = await requireUser();

  const parsed = appointmentSchema.safeParse({
    date: formData.get('date'),
    time: formData.get('time'),
    durationMin: formData.get('durationMin') || 30,
    professional: formData.get('professional') ?? '',
    location: formData.get('location') || undefined,
    reason: formData.get('reason') || undefined,
    timezoneOffset: formData.get('timezoneOffset') ?? 0,
  });

  if (!parsed.success) return { status: 'error', reason: 'invalid' };
  const input = parsed.data;

  // The browser sends local wall-clock time plus its offset; store UTC.
  const localMs = Date.parse(`${input.date}T${input.time}:00Z`);
  if (Number.isNaN(localMs)) return { status: 'error', reason: 'invalid' };
  const startsAt = new Date(localMs + input.timezoneOffset * 60 * 1000);

  const supabase = createClient();
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: user.id,
      starts_at: startsAt.toISOString(),
      duration_min: input.durationMin,
      professional: input.professional,
      location: input.location ?? null,
      reason: input.reason ?? null,
    })
    .select('id')
    .single();

  if (error || !data) return { status: 'error', reason: 'failed' };

  await scheduleReminders(data.id, user.id, startsAt);

  revalidatePath('/appointments');
  revalidatePath('/dashboard');
  return { status: 'ok' };
}

export async function cancelAppointment(formData: FormData): Promise<AppointmentResult> {
  const user = await requireUser();
  const id = formData.get('id');
  if (typeof id !== 'string') return { status: 'error', reason: 'invalid' };

  const supabase = createClient();
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { status: 'error', reason: 'failed' };

  // Pending reminders for a cancelled appointment must never go out.
  await supabase
    .from('reminder_jobs')
    .update({ status: 'skipped' })
    .eq('appointment_id', id)
    .eq('status', 'pending');

  revalidatePath('/appointments');
  return { status: 'ok' };
}

export async function confirmAppointment(formData: FormData): Promise<AppointmentResult> {
  const user = await requireUser();
  const id = formData.get('id');
  if (typeof id !== 'string') return { status: 'error', reason: 'invalid' };

  const supabase = createClient();
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath('/appointments');
  return { status: 'ok' };
}
