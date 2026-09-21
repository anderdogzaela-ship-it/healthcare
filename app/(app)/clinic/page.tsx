import { createClient, requireUser } from '@/lib/supabase/server';
import { getClinicContext, getClinicStats, getPatients, getUserClinics } from '@/lib/data/clinic';
import ClinicOnboarding from '@/components/clinic/ClinicOnboarding';
import ClinicDashboard from '@/components/clinic/ClinicDashboard';

export default async function ClinicPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);

  if (!clinic) {
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single();
    return <ClinicOnboarding defaultTimezone={profile?.timezone ?? 'UTC'} />;
  }

  const search = searchParams.q ?? '';
  const [stats, patients, clinics] = await Promise.all([
    getClinicStats(clinic.id),
    getPatients(clinic.id, search),
    getUserClinics(user.id),
  ]);

  return <ClinicDashboard clinic={clinic} clinics={clinics} stats={stats} patients={patients} search={search} />;
}
