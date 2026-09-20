import { createClient, requireUser } from '@/lib/supabase/server';
import SettingsForm, { type SettingsFormData } from '@/components/settings/SettingsForm';

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: profile }, { data: settings }, { data: goals }] = await Promise.all([
    supabase.from('profiles').select('full_name, phone, date_of_birth, unit_system, timezone, plan, created_at').eq('id', user.id).single(),
    supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
    supabase.from('goals').select('metric, target, effective_from').eq('user_id', user.id).order('effective_from', { ascending: false }),
  ]);

  const latestGoal = (metric: string, fallback: number) =>
    Number(goals?.find((goal) => goal.metric === metric)?.target ?? fallback);

  const initial: SettingsFormData = {
    fullName: profile?.full_name ?? '',
    email: user.email ?? '',
    phone: profile?.phone ?? '',
    dateOfBirth: profile?.date_of_birth ?? '',
    unitSystem: profile?.unit_system ?? 'metric',
    timezone: profile?.timezone ?? 'UTC',
    plan: profile?.plan ?? 'starter',
    memberSince: profile?.created_at ?? new Date().toISOString(),
    notifications: {
      reminders: settings?.reminders ?? true,
      insights: settings?.insights ?? true,
      weeklyReport: settings?.weekly_report ?? true,
      achievements: settings?.achievements ?? false,
    },
    privacy: {
      shareData: settings?.share_data ?? false,
      analytics: settings?.analytics ?? true,
    },
    stepsGoal: latestGoal('steps', 7500),
    sleepGoal: latestGoal('sleep_hours', 8),
  };

  return <SettingsForm initial={initial} />;
}
