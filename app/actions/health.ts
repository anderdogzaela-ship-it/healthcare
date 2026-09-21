'use server';

import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { healthLogSchema } from '@/lib/validation';
import { logDbError } from '@/lib/supabase/log';

export type SaveResult = { status: 'ok' } | { status: 'error'; reason: 'invalid' | 'failed' };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function numberField(formData: FormData, name: string): number | undefined {
  const raw = formData.get(name);
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Saves (or replaces) the health log for one day.
 *
 * The day is passed in by the browser because "today" depends on the user's
 * own timezone, not the server's.
 */
export async function saveHealthLog(formData: FormData): Promise<SaveResult> {
  const user = await requireUser();

  const logDateRaw = formData.get('logDate');
  const logDate = typeof logDateRaw === 'string' && DATE_PATTERN.test(logDateRaw) ? logDateRaw : null;
  if (!logDate) return { status: 'error', reason: 'invalid' };

  const parsed = healthLogSchema.safeParse({
    heartRate: numberField(formData, 'heartRate'),
    systolic: numberField(formData, 'systolic'),
    diastolic: numberField(formData, 'diastolic'),
    weight: numberField(formData, 'weight'),
    steps: numberField(formData, 'steps'),
    exerciseType: formData.get('exerciseType') ?? 'none',
    durationMin: numberField(formData, 'durationMin'),
    sleepHours: numberField(formData, 'sleepHours'),
    sleepQuality: numberField(formData, 'sleepQuality'),
    symptoms: formData.getAll('symptoms').filter((s): s is string => typeof s === 'string'),
    notes: formData.get('notes') ?? undefined,
  });

  if (!parsed.success) {
    console.error('[validation] health log rejected:', parsed.error.issues);
    return { status: 'error', reason: 'invalid' };
  }
  const input = parsed.data;

  const supabase = createClient();

  // One row per user per day; saving again updates that day.
  const { data: log, error: logError } = await supabase
    .from('daily_logs')
    .upsert(
      {
        user_id: user.id,
        log_date: logDate,
        notes: input.notes ?? null,
        no_symptoms: input.symptoms.includes('none') || input.symptoms.length === 0,
      },
      { onConflict: 'user_id,log_date' }
    )
    .select('id')
    .single();

  logDbError('health.daily_logs', logError);
  if (logError || !log) return { status: 'error', reason: 'failed' };

  // Replace the day's entries rather than accumulating duplicates when the
  // form is submitted twice. Deletes are scoped to this log, and RLS scopes
  // them to this user.
  await Promise.all([
    supabase.from('measurements').delete().eq('daily_log_id', log.id),
    supabase.from('sleep_sessions').delete().eq('daily_log_id', log.id),
    supabase.from('activity_sessions').delete().eq('daily_log_id', log.id),
    supabase.from('symptom_entries').delete().eq('daily_log_id', log.id),
  ]);

  const recordedAt = `${logDate}T12:00:00Z`;
  const measurements = [];

  if (input.heartRate !== undefined) {
    measurements.push({
      user_id: user.id, daily_log_id: log.id, metric: 'heart_rate' as const,
      value: input.heartRate, unit: 'bpm', recorded_at: recordedAt,
    });
  }
  if (input.systolic !== undefined && input.diastolic !== undefined) {
    measurements.push({
      user_id: user.id, daily_log_id: log.id, metric: 'blood_pressure' as const,
      value: input.systolic, value_secondary: input.diastolic, unit: 'mmHg', recorded_at: recordedAt,
    });
  }
  if (input.weight !== undefined) {
    measurements.push({
      user_id: user.id, daily_log_id: log.id, metric: 'weight' as const,
      value: input.weight, unit: 'kg', recorded_at: recordedAt,
    });
  }

  const writes: Promise<unknown>[] = [];
  if (measurements.length > 0) writes.push(Promise.resolve(supabase.from('measurements').insert(measurements)));

  if (input.sleepHours !== undefined) {
    writes.push(Promise.resolve(supabase.from('sleep_sessions').insert({
      user_id: user.id,
      daily_log_id: log.id,
      recorded_on: logDate,
      hours: input.sleepHours,
      quality: input.sleepQuality ?? null,
    })));
  }

  if (input.steps !== undefined || (input.durationMin !== undefined && input.exerciseType !== 'none')) {
    writes.push(Promise.resolve(supabase.from('activity_sessions').insert({
      user_id: user.id,
      daily_log_id: log.id,
      recorded_on: logDate,
      exercise_type: input.exerciseType,
      duration_min: input.durationMin ?? null,
      steps: input.steps ?? null,
    })));
  }

  const symptoms = input.symptoms.filter((symptom) => symptom !== 'none');
  if (symptoms.length > 0) {
    writes.push(Promise.resolve(supabase.from('symptom_entries').insert(
      symptoms.map((symptom) => ({ user_id: user.id, daily_log_id: log.id, symptom }))
    )));
  }

  await Promise.all(writes);

  revalidatePath('/health');
  revalidatePath('/dashboard');
  revalidatePath('/activity');

  return { status: 'ok' };
}
