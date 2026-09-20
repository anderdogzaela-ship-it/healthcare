import { createClient, requireUser } from '@/lib/supabase/server';
import { getDashboardData, localDate } from '@/lib/data/health';
import DashboardView from '@/components/dashboard/DashboardView';

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, timezone')
    .eq('id', user.id)
    .single();

  const today = localDate(profile?.timezone ?? 'UTC');
  const data = await getDashboardData(user.id, today);
  const firstName = (profile?.full_name?.trim() || user.email?.split('@')[0] || '').split(' ')[0];

  return <DashboardView data={data} firstName={firstName} />;
}
