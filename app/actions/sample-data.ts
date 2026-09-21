'use server';

import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { getClinicContext } from '@/lib/data/clinic';
import { localDate } from '@/lib/data/health';
import { canAddPatient } from '@/lib/billing/limits';
import { logDbError } from '@/lib/supabase/log';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Fills an account with a month of believable, entirely fictitious data, so a
 * demo shows charts, trends and a clinic that looks in use.
 *
 * Everything written here is marked so it can be removed again without
 * touching what the user entered themselves: vitals carry an external id
 * starting with `sample-`, and patients use the reserved example.com domain.
 */

export type SampleDataResult =
  | { status: 'ok'; days: number; patients: number }
  | { status: 'error'; reason: 'failed' };

const DAYS = 30;
const MARKER = 'sample-';
const PATIENT_DOMAIN = '@sample.example.com';

/** Deterministic noise, so the data looks natural but loads the same each time. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function between(seed: number, min: number, max: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round((min + noise(seed) * (max - min)) * factor) / factor;
}

function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const EXERCISES = ['walking', 'running', 'cycling', 'yoga', 'swimming', 'weightlifting', 'none'] as const;

// Names and numbers are invented. +1 202 555 01xx is a range reserved for
// fiction, so no real phone can receive anything from these records.
const PATIENTS = [
  { name: 'Ana Souza', status: 'active', locale: 'pt', note: 'Prefers morning appointments. Follow-up on blood pressure in two weeks.' },
  { name: 'Carlos Méndez', status: 'active', locale: 'es', note: 'Annual check-up done. Asked about a nutrition referral.' },
  { name: 'Emily Carter', status: 'active', locale: 'en', note: 'Physiotherapy after a knee sprain, session 3 of 8.' },
  { name: 'João Pereira', status: 'lead', locale: 'pt', note: 'Came in through the website form, wants a first consultation.' },
  { name: 'Lucía Fernández', status: 'active', locale: 'es', note: 'Monitoring sleep quality; keeping a sleep diary.' },
  { name: 'Mariana Lima', status: 'lead', locale: 'pt', note: 'Asked on WhatsApp about prices for the check-up package.' },
  { name: 'David Kim', status: 'inactive', locale: 'en', note: 'Moved to another city. Records kept on request.' },
  { name: 'Sofía Ramírez', status: 'active', locale: 'es', note: 'Diabetes education, monthly review.' },
] as const;

const REASONS = ['Follow-up', 'First consultation', 'Check-up', 'Test results review', 'Physiotherapy session'];

export async function loadSampleData(): Promise<SampleDataResult> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, timezone')
    .eq('id', user.id)
    .single();
  const today = localDate(profile?.timezone ?? 'UTC');
  const firstDay = shiftDate(today, -(DAYS - 1));

  // Days the user logged themselves are left alone.
  const { data: existing } = await supabase
    .from('daily_logs')
    .select('log_date')
    .eq('user_id', user.id)
    .gte('log_date', firstDay);
  const taken = new Set((existing ?? []).map((row) => row.log_date));

  const days = Array.from({ length: DAYS }, (_, i) => shiftDate(firstDay, i)).filter((day) => !taken.has(day));

  if (days.length > 0) {
    const { data: logs, error } = await supabase
      .from('daily_logs')
      .insert(days.map((day, i) => ({
        user_id: user.id,
        log_date: day,
        no_symptoms: noise(i + 900) > 0.2,
      })))
      .select('id, log_date');

    logDbError('sample.daily_logs', error);
    if (error || !logs) return { status: 'error', reason: 'failed' };

    const measurements = [];
    const sleep = [];
    const activity = [];
    const symptoms = [];

    for (const log of logs) {
      const i = days.indexOf(log.log_date);
      const recordedAt = `${log.log_date}T08:00:00Z`;
      const base = { user_id: user.id, daily_log_id: log.id, recorded_at: recordedAt };

      measurements.push(
        { ...base, metric: 'heart_rate' as const, value: between(i + 1, 61, 74), unit: 'bpm', external_id: `${MARKER}hr-${log.log_date}` },
        {
          ...base,
          metric: 'blood_pressure' as const,
          value: between(i + 101, 114, 129),
          value_secondary: between(i + 201, 72, 84),
          unit: 'mmHg',
          external_id: `${MARKER}bp-${log.log_date}`,
        }
      );
      // Weighed every few days, drifting slowly down.
      if (i % 3 === 0) {
        measurements.push({
          ...base,
          metric: 'weight' as const,
          value: Math.round((74.2 - i * 0.04 + between(i + 301, -0.3, 0.3, 1)) * 10) / 10,
          unit: 'kg',
          external_id: `${MARKER}wt-${log.log_date}`,
        });
      }

      const hours = between(i + 401, 5.8, 8.4, 1);
      sleep.push({
        user_id: user.id,
        daily_log_id: log.id,
        recorded_on: log.log_date,
        hours,
        quality: Math.min(5, Math.max(1, Math.round(hours - 3 + between(i + 501, -1, 1)))),
      });

      const exercise = EXERCISES[Math.floor(noise(i + 601) * EXERCISES.length)];
      const steps = between(i + 701, 4200, 12800);
      activity.push({
        user_id: user.id,
        daily_log_id: log.id,
        recorded_on: log.log_date,
        exercise_type: exercise,
        duration_min: exercise === 'none' ? null : between(i + 801, 20, 65),
        steps,
        calories_kcal: Math.round(steps * 0.04) + (exercise === 'none' ? 0 : 180),
        distance_m: Math.round(steps * 0.75),
      });

      if (noise(i + 900) <= 0.2) {
        symptoms.push({ user_id: user.id, daily_log_id: log.id, symptom: noise(i + 950) > 0.5 ? 'headache' : 'fatigue' });
      }
    }

    const results = await Promise.all([
      supabase.from('measurements').insert(measurements),
      supabase.from('sleep_sessions').insert(sleep),
      supabase.from('activity_sessions').insert(activity),
      symptoms.length > 0 ? supabase.from('symptom_entries').insert(symptoms) : Promise.resolve({ error: null }),
    ]);
    for (const result of results) logDbError('sample.health', result.error);
    if (results.some((result) => result.error)) return { status: 'error', reason: 'failed' };
  }

  const patients = await loadSamplePatients(user.id, profile?.full_name || 'Dr. Demo', today);

  revalidatePath('/dashboard');
  revalidatePath('/health');
  revalidatePath('/activity');
  revalidatePath('/clinic');
  revalidatePath('/appointments');

  return { status: 'ok', days: days.length, patients };
}

/** Adds sample patients, notes and appointments to the active clinic, once. */
async function loadSamplePatients(userId: string, professional: string, today: string): Promise<number> {
  const clinic = await getClinicContext(userId);
  if (!clinic) return 0;

  const supabase = createClient();
  const { count } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinic.id)
    .like('email', `%${PATIENT_DOMAIN}`);
  if ((count ?? 0) > 0) return 0;
  if (!(await canAddPatient(clinic.id))) return 0;

  const { data: rows, error } = await supabase
    .from('patients')
    .insert(PATIENTS.map((patient, i) => ({
      clinic_id: clinic.id,
      full_name: patient.name,
      email: `${patient.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '.')}${PATIENT_DOMAIN}`,
      phone: `+1202555${String(100 + i).padStart(4, '0')}`,
      locale: patient.locale,
      status: patient.status,
      notes: null,
      last_visit_at: patient.status === 'lead' ? null : `${shiftDate(today, -(3 + i * 4))}T14:00:00Z`,
    })))
    .select('id, full_name, status');

  logDbError('sample.patients', error);
  if (error || !rows) return 0;

  const notes = rows.map((row) => ({
    clinic_id: clinic.id,
    patient_id: row.id,
    author_id: userId,
    body: PATIENTS.find((patient) => patient.name === row.full_name)?.note ?? 'Sample note.',
  }));

  // Past visits for current patients, and a week of upcoming ones.
  const appointments: Database['public']['Tables']['appointments']['Insert'][] = [];
  const seen = rows.filter((row) => row.status !== 'lead');
  seen.forEach((row, i) => {
    appointments.push({
      clinic_id: clinic.id,
      patient_id: row.id,
      starts_at: `${shiftDate(today, -(3 + i * 4))}T14:00:00Z`,
      duration_min: 30,
      professional,
      reason: REASONS[i % REASONS.length],
      status: 'completed' as const,
    });
  });
  rows.filter((row) => row.status !== 'inactive').forEach((row, i) => {
    appointments.push({
      clinic_id: clinic.id,
      patient_id: row.id,
      starts_at: `${shiftDate(today, 1 + i)}T${String(9 + (i % 4) * 2).padStart(2, '0')}:00:00Z`,
      duration_min: i % 2 === 0 ? 30 : 45,
      professional,
      reason: REASONS[(i + 1) % REASONS.length],
      status: i % 3 === 0 ? ('confirmed' as const) : ('scheduled' as const),
    });
  });

  const [noteResult, appointmentResult] = await Promise.all([
    supabase.from('patient_notes').insert(notes),
    supabase.from('appointments').insert(appointments),
  ]);
  logDbError('sample.patient_notes', noteResult.error);
  logDbError('sample.appointments', appointmentResult.error);

  return rows.length;
}

/** Deletes only what loadSampleData created. */
export async function removeSampleData(): Promise<{ status: 'ok' } | { status: 'error'; reason: 'failed' }> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: marked, error: findError } = await supabase
    .from('measurements')
    .select('daily_log_id')
    .eq('user_id', user.id)
    .like('external_id', `${MARKER}%`);
  logDbError('sample.find', findError);
  if (findError) return { status: 'error', reason: 'failed' };

  const logIds = Array.from(new Set((marked ?? []).map((row) => row.daily_log_id).filter((id): id is string => !!id)));
  if (logIds.length > 0) {
    // Sleep, activity, symptoms and vitals go with the day, by cascade.
    const { error } = await supabase.from('daily_logs').delete().eq('user_id', user.id).in('id', logIds);
    logDbError('sample.daily_logs.delete', error);
    if (error) return { status: 'error', reason: 'failed' };
  }

  const clinic = await getClinicContext(user.id);
  if (clinic) {
    // Notes and appointments go with the patient, by cascade.
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('clinic_id', clinic.id)
      .like('email', `%${PATIENT_DOMAIN}`);
    logDbError('sample.patients.delete', error);
    if (error) return { status: 'error', reason: 'failed' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/health');
  revalidatePath('/activity');
  revalidatePath('/clinic');
  revalidatePath('/appointments');

  return { status: 'ok' };
}
