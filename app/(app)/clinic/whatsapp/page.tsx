import { redirect } from 'next/navigation';
import { createClient, requireUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClinicContext } from '@/lib/data/clinic';
import SimulatorView, { type SimAppointment, type SimMessage, type SimPatient } from '@/components/clinic/WhatsAppSimulator';

export default async function WhatsAppSimulatorPage({ searchParams }: { searchParams: { p?: string } }) {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) redirect('/clinic');

  const supabase = createClient();
  const nowIso = new Date().toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Row level security limits both lists to this user's clinics.
  const [{ data: patientRows }, { data: upcomingRows }] = await Promise.all([
    supabase
      .from('patients')
      .select('id, full_name, phone, locale')
      .eq('clinic_id', clinic.id)
      .neq('status', 'archived')
      .order('full_name', { ascending: true })
      .limit(100),
    supabase
      .from('appointments')
      .select('patient_id, starts_at')
      .eq('clinic_id', clinic.id)
      .in('status', ['scheduled', 'confirmed'])
      .gt('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(300),
  ]);

  const nextByPatient = new Map<string, string>();
  for (const row of upcomingRows ?? []) {
    if (row.patient_id && !nextByPatient.has(row.patient_id)) nextByPatient.set(row.patient_id, row.starts_at);
  }

  // Patients with something coming up first: they are the ones to demo.
  const patients: SimPatient[] = (patientRows ?? [])
    .map((row) => ({ id: row.id, name: row.full_name, phone: row.phone, locale: row.locale, nextAt: nextByPatient.get(row.id) ?? null }))
    .sort((a, b) => (a.nextAt && b.nextAt ? a.nextAt.localeCompare(b.nextAt) : a.nextAt ? -1 : b.nextAt ? 1 : 0));

  const selected =
    patients.find((patient) => patient.id === searchParams.p) ?? patients.find((patient) => patient.nextAt) ?? patients[0] ?? null;

  let appointments: SimAppointment[] = [];
  let messages: SimMessage[] = [];

  if (selected) {
    // The patient was just confirmed to belong to this clinic (it came back
    // through row level security), so reading their events with the admin
    // client is safe; the events table has no clinic-level policy of its own.
    const [{ data: appointmentRows }, { data: eventRows }] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, starts_at, status, professional, location')
        .eq('clinic_id', clinic.id)
        .eq('patient_id', selected.id)
        .gte('starts_at', dayAgo)
        .order('starts_at', { ascending: true })
        .limit(5),
      createAdminClient()
        .from('automation_events')
        .select('id, direction, event_type, payload, created_at')
        .eq('patient_id', selected.id)
        .eq('channel', 'whatsapp')
        .order('created_at', { ascending: false })
        .limit(60),
    ]);

    appointments = (appointmentRows ?? []).map((row) => ({
      id: row.id,
      startsAt: row.starts_at,
      status: row.status,
      professional: row.professional,
      location: row.location,
    }));

    for (const row of [...(eventRows ?? [])].reverse()) {
      const payload = (row.payload ?? {}) as { text?: string; reply?: string; simulated?: boolean };
      const simulated = Boolean(payload.simulated);
      if (row.direction === 'outbound') {
        messages.push({ id: row.id, from: 'clinic', text: payload.text ?? null, kind: row.event_type, at: row.created_at, simulated });
      } else {
        messages.push({ id: row.id, from: 'patient', text: payload.text ?? '', kind: row.event_type, at: row.created_at, simulated });
        if (payload.reply) {
          messages.push({ id: `${row.id}-reply`, from: 'clinic', text: payload.reply, kind: 'reply', at: row.created_at, simulated });
        }
      }
    }
  }

  return (
    <SimulatorView
      key={selected?.id ?? 'none'}
      clinicName={clinic.name}
      timezone={clinic.timezone}
      patients={patients}
      selectedId={selected?.id ?? null}
      appointments={appointments}
      messages={messages}
    />
  );
}
