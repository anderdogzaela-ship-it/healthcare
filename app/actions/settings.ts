'use server';

import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { goalsSchema, profileSchema, settingsSchema } from '@/lib/validation';
import { localDate } from '@/lib/data/health';
import { logDbError } from '@/lib/supabase/log';

export type SettingsResult = { status: 'ok' } | { status: 'error' };

const checkbox = (formData: FormData, name: string) => formData.get(name) === 'true';

export async function updateSettings(formData: FormData): Promise<SettingsResult> {
  const user = await requireUser();

  const profile = profileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone') ?? '',
    dateOfBirth: formData.get('dateOfBirth') ?? '',
    unitSystem: formData.get('unitSystem'),
    locale: formData.get('locale'),
    timezone: formData.get('timezone') ?? 'UTC',
  });

  const settings = settingsSchema.safeParse({
    reminders: checkbox(formData, 'reminders'),
    insights: checkbox(formData, 'insights'),
    weeklyReport: checkbox(formData, 'weeklyReport'),
    achievements: checkbox(formData, 'achievements'),
    shareData: checkbox(formData, 'shareData'),
    analytics: checkbox(formData, 'analytics'),
  });

  const goals = goalsSchema.safeParse({
    steps: formData.get('stepsGoal'),
    sleepHours: formData.get('sleepGoal'),
  });

  if (!profile.success || !settings.success || !goals.success) {
    console.error('[validation] settings rejected:', {
      profile: profile.success ? null : profile.error.issues,
      settings: settings.success ? null : settings.error.issues,
      goals: goals.success ? null : goals.error.issues,
    });
    return { status: 'error' };
  }

  const supabase = createClient();

  // Stored as +digits so inbound WhatsApp messages match on lookup.
  const digits = (profile.data.phone ?? '').replace(/\D/g, '');
  const phone = digits ? `+${digits}` : null;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: profile.data.fullName,
      phone,
      date_of_birth: profile.data.dateOfBirth ? profile.data.dateOfBirth : null,
      unit_system: profile.data.unitSystem,
      locale: profile.data.locale,
      timezone: profile.data.timezone,
    })
    .eq('id', user.id);

  const { error: settingsError } = await supabase
    .from('user_settings')
    .update({
      reminders: settings.data.reminders,
      insights: settings.data.insights,
      weekly_report: settings.data.weeklyReport,
      achievements: settings.data.achievements,
      share_data: settings.data.shareData,
      analytics: settings.data.analytics,
    })
    .eq('user_id', user.id);

  // A changed goal applies from today, leaving past days with the goal that
  // was in force when they happened.
  const today = localDate(profile.data.timezone);
  const { error: goalsError } = await supabase.from('goals').upsert(
    [
      { user_id: user.id, metric: 'steps' as const, target: goals.data.steps, effective_from: today },
      { user_id: user.id, metric: 'sleep_hours' as const, target: goals.data.sleepHours, effective_from: today },
    ],
    { onConflict: 'user_id,metric,effective_from' }
  );

  logDbError('settings.profile', profileError);
  logDbError('settings.user_settings', settingsError);
  logDbError('settings.goals', goalsError);

  if (profileError || settingsError || goalsError) return { status: 'error' };

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/activity');
  return { status: 'ok' };
}
