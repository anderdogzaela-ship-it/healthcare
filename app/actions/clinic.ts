'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, requireUser } from '@/lib/supabase/server';
import { getClinicContext } from '@/lib/data/clinic';
import { canAddPatient } from '@/lib/billing/limits';
import { logDbError } from '@/lib/supabase/log';

export type ClinicResult =
  | { status: 'ok'; id?: string }
  | { status: 'error'; reason: 'invalid' | 'failed' | 'forbidden' | 'limit' };

const clinicSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.string().trim().max(60).default('UTC'),
  locale: z.enum(['en', 'es', 'pt']).default('en'),
});

const patientSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).regex(/^[+\d][\d\s().-]*$/).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  locale: z.enum(['en', 'es', 'pt']).default('en'),
  status: z.enum(['lead', 'active', 'inactive', 'archived']).default('lead'),
});

const HOUR = 60 * 60 * 1000;

function normalizePhone(value: string | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits ? `+${digits}` : null;
}

/** Creates a clinic and makes the creator its owner. */
export async function createClinic(formData: FormData): Promise<ClinicResult> {
  const user = await requireUser();

  const parsed = clinicSchema.safeParse({
    name: formData.get('name'),
    timezone: formData.get('timezone') ?? 'UTC',
    locale: formData.get('locale') ?? 'en',
  });
  if (!parsed.success) return { status: 'error', reason: 'invalid' };

  const supabase = createClient();
  const { data: clinic, error } = await supabase
    .from('clinics')
    .insert({ name: parsed.data.name, timezone: parsed.data.timezone, locale: parsed.data.locale, created_by: user.id })
    .select('id')
    .single();

  logDbError('clinic.insert', error);
  if (error || !clinic) return { status: 'error', reason: 'failed' };

  // The owner membership is created by the on_clinic_created trigger: doing it
  // here would need to read the clinic back, which the select policy refuses
  // until the membership exists.

  revalidatePath('/clinic');
  return { status: 'ok', id: clinic.id };
}

export async function createPatient(formData: FormData): Promise<ClinicResult> {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) return { status: 'error', reason: 'forbidden' };

  // Plan limits are enforced here, not only advertised on the pricing page.
  if (!(await canAddPatient(clinic.id))) return { status: 'error', reason: 'limit' };

  const parsed = patientSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone') ?? '',
    email: formData.get('email') ?? '',
    dateOfBirth: formData.get('dateOfBirth') ?? '',
    locale: formData.get('locale') ?? 'en',
    status: formData.get('status') ?? 'lead',
  });
  if (!parsed.success) return { status: 'error', reason: 'invalid' };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('patients')
    .insert({
      clinic_id: clinic.id,
      full_name: parsed.data.fullName,
      phone: normalizePhone(parsed.data.phone),
      email: parsed.data.email || null,
      date_of_birth: parsed.data.dateOfBirth || null,
      locale: parsed.data.locale,
      status: parsed.data.status,
    })
    .select('id')
    .single();

  logDbError('clinic.patients.insert', error);
  if (error || !data) return { status: 'error', reason: 'failed' };

  revalidatePath('/clinic');
  return { status: 'ok', id: data.id };
}

export async function updatePatientStatus(formData: FormData): Promise<ClinicResult> {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) return { status: 'error', reason: 'forbidden' };

  const id = formData.get('id');
  const status = formData.get('status');
  const parsed = z.enum(['lead', 'active', 'inactive', 'archived']).safeParse(status);
  if (typeof id !== 'string' || !parsed.success) return { status: 'error', reason: 'invalid' };

  const supabase = createClient();
  const { error } = await supabase
    .from('patients')
    .update({ status: parsed.data })
    .eq('id', id)
    .eq('clinic_id', clinic.id);

  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath('/clinic');
  revalidatePath(`/clinic/patients/${id}`);
  return { status: 'ok' };
}

export async function addPatientNote(formData: FormData): Promise<ClinicResult> {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) return { status: 'error', reason: 'forbidden' };

  const patientId = formData.get('patientId');
  const body = formData.get('body');
  if (typeof patientId !== 'string' || typeof body !== 'string' || body.trim().length === 0) {
    return { status: 'error', reason: 'invalid' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('patient_notes').insert({
    clinic_id: clinic.id,
    patient_id: patientId,
    author_id: user.id,
    body: body.trim().slice(0, 4000),
  });

  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath(`/clinic/patients/${patientId}`);
  return { status: 'ok' };
}

const clinicAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.coerce.number().int().min(5).max(480).default(30),
  professional: z.string().trim().max(120).default(''),
  location: z.string().trim().max(160).optional(),
  reason: z.string().trim().max(500).optional(),
  timezoneOffset: z.coerce.number().int().min(-840).max(840),
});

/** Books an appointment for a patient and queues its WhatsApp reminders. */
export async function createClinicAppointment(formData: FormData): Promise<ClinicResult> {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) return { status: 'error', reason: 'forbidden' };

  const parsed = clinicAppointmentSchema.safeParse({
    patientId: formData.get('patientId'),
    date: formData.get('date'),
    time: formData.get('time'),
    durationMin: formData.get('durationMin') || 30,
    professional: formData.get('professional') ?? '',
    location: formData.get('location') || undefined,
    reason: formData.get('reason') || undefined,
    timezoneOffset: formData.get('timezoneOffset') ?? 0,
  });
  if (!parsed.success) return { status: 'error', reason: 'invalid' };

  const localMs = Date.parse(`${parsed.data.date}T${parsed.data.time}:00Z`);
  if (Number.isNaN(localMs)) return { status: 'error', reason: 'invalid' };
  const startsAt = new Date(localMs + parsed.data.timezoneOffset * 60 * 1000);

  const supabase = createClient();
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      clinic_id: clinic.id,
      patient_id: parsed.data.patientId,
      starts_at: startsAt.toISOString(),
      duration_min: parsed.data.durationMin,
      professional: parsed.data.professional,
      location: parsed.data.location ?? null,
      reason: parsed.data.reason ?? null,
    })
    .select('id')
    .single();

  if (error || !appointment) return { status: 'error', reason: 'failed' };

  const now = Date.now();
  const jobs = ([
    { kind: '24h' as const, before: 24 * HOUR },
    { kind: '2h' as const, before: 2 * HOUR },
  ]).map(({ kind, before }) => {
    const sendAt = new Date(startsAt.getTime() - before);
    return {
      appointment_id: appointment.id,
      patient_id: parsed.data.patientId,
      kind,
      send_at: sendAt.toISOString(),
      status: sendAt.getTime() <= now ? ('skipped' as const) : ('pending' as const),
    };
  });

  await supabase.from('reminder_jobs').upsert(jobs, { onConflict: 'appointment_id,kind' });

  revalidatePath('/clinic');
  revalidatePath(`/clinic/patients/${parsed.data.patientId}`);
  return { status: 'ok', id: appointment.id };
}
