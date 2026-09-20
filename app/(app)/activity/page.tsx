import { createClient, requireUser } from '@/lib/supabase/server';
import { getActivityData, localDate } from '@/lib/data/health';
import ActivityView from '@/components/activity/ActivityView';

export default async function ActivityPage() {
  const user = await requireUser();
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .single();

  const today = localDate(profile?.timezone ?? 'UTC');
  const data = await getActivityData(user.id, today);

  return <ActivityView data={data} today={today} />;
}
