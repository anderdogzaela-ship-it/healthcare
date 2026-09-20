import { notFound } from 'next/navigation';
import { createClient, requireUser } from '@/lib/supabase/server';
import { getClinicContext } from '@/lib/data/clinic';
import PatientDetail, {
  type PatientAppointment,
  type PatientNote,
} from '@/components/clinic/PatientDetail';

export default async function PatientPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) notFound();

  const supabase = createClient();

  // Row level security already limits this to the user's clinic; the explicit
  // clinic_id filter keeps the intent obvious.
  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, phone, email, date_of_birth, status')
    .eq('id', params.id)
    .eq('clinic_id', clinic.id)
    .maybeSingle();

  if (!patient) notFound();

  const [{ data: noteRows }, { data: appointmentRows }] = await Promise.all([
    supabase
      .from('patient_notes')
      .select('id, body, created_at')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('appointments')
      .select('id, starts_at, professional, status')
      .eq('patient_id', patient.id)
      .order('starts_at', { ascending: false })
      .limit(20),
  ]);

  const notes: PatientNote[] = (noteRows ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
  }));

  const appointments: PatientAppointment[] = (appointmentRows ?? []).map((row) => ({
    id: row.id,
    startsAt: row.starts_at,
    professional: row.professional,
    status: row.status,
  }));

  return (
    <PatientDetail
      patient={{
        id: patient.id,
        fullName: patient.full_name,
        phone: patient.phone,
        email: patient.email,
        dateOfBirth: patient.date_of_birth,
        status: patient.status,
      }}
      notes={notes}
      appointments={appointments}
    />
  );
}
