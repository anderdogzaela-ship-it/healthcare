import { createClient } from '@/lib/supabase/server';
import type { ClinicRole, PatientStatus } from '@/lib/supabase/database.types';

export interface ClinicContext {
  id: string;
  name: string;
  timezone: string;
  plan: string;
  role: ClinicRole;
}

export interface PatientRow {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: PatientStatus;
  lastVisitAt: string | null;
  nextAppointmentAt: string | null;
}

export interface ClinicStats {
  total: number;
  byStatus: Record<PatientStatus, number>;
  upcoming: number;
  confirmedRate: number | null;
  noShowRate: number | null;
}

/** The clinic this user works at, or null if they have not created one. */
export async function getClinicContext(userId: string): Promise<ClinicContext | null> {
  const supabase = createClient();

  const { data: membership } = await supabase
    .from('clinic_members')
    .select('clinic_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, name, timezone, plan')
    .eq('id', membership.clinic_id)
    .single();

  if (!clinic) return null;

  return { id: clinic.id, name: clinic.name, timezone: clinic.timezone, plan: clinic.plan, role: membership.role };
}

export async function getPatients(clinicId: string, search?: string): Promise<PatientRow[]> {
  const supabase = createClient();

  let query = supabase
    .from('patients')
    .select('id, full_name, phone, email, status, last_visit_at')
    .eq('clinic_id', clinicId)
    .neq('status', 'archived')
    .order('full_name', { ascending: true })
    .limit(200);

  if (search && search.trim()) {
    // Commas and parentheses are separators in PostgREST's `or` syntax, so a
    // name like "Souza, Ana" would otherwise break the filter.
    const safe = search.trim().replace(/[,()*]/g, ' ').slice(0, 80);
    const term = `%${safe}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
  }

  const { data: patients } = await query;
  if (!patients || patients.length === 0) return [];

  // Next appointment per patient, in one query rather than one per row.
  const { data: appointments } = await supabase
    .from('appointments')
    .select('patient_id, starts_at')
    .eq('clinic_id', clinicId)
    .in('status', ['scheduled', 'confirmed'])
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  const nextByPatient = new Map<string, string>();
  for (const appointment of appointments ?? []) {
    if (appointment.patient_id && !nextByPatient.has(appointment.patient_id)) {
      nextByPatient.set(appointment.patient_id, appointment.starts_at);
    }
  }

  return patients.map((patient) => ({
    id: patient.id,
    fullName: patient.full_name,
    phone: patient.phone,
    email: patient.email,
    status: patient.status,
    lastVisitAt: patient.last_visit_at,
    nextAppointmentAt: nextByPatient.get(patient.id) ?? null,
  }));
}

export async function getClinicStats(clinicId: string): Promise<ClinicStats> {
  const supabase = createClient();

  const [{ data: patients }, { data: appointments }] = await Promise.all([
    supabase.from('patients').select('status').eq('clinic_id', clinicId),
    supabase
      .from('appointments')
      .select('status, starts_at')
      .eq('clinic_id', clinicId)
      .gte('starts_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const byStatus: Record<PatientStatus, number> = { lead: 0, active: 0, inactive: 0, archived: 0 };
  for (const patient of patients ?? []) byStatus[patient.status] += 1;

  const now = Date.now();
  const past = (appointments ?? []).filter((a) => new Date(a.starts_at).getTime() < now);
  const upcoming = (appointments ?? []).filter(
    (a) => new Date(a.starts_at).getTime() >= now && (a.status === 'scheduled' || a.status === 'confirmed')
  );

  const noShows = past.filter((a) => a.status === 'no_show').length;
  const confirmed = upcoming.filter((a) => a.status === 'confirmed').length;

  return {
    total: (patients ?? []).length,
    byStatus,
    upcoming: upcoming.length,
    confirmedRate: upcoming.length > 0 ? Math.round((confirmed / upcoming.length) * 100) : null,
    noShowRate: past.length > 0 ? Math.round((noShows / past.length) * 100) : null,
  };
}
