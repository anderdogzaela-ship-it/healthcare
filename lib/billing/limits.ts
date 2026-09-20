import { createClient } from '@/lib/supabase/server';
import { planFor, type Plan } from './plans';

export interface ClinicUsage {
  plan: Plan;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  patients: number;
  teamMembers: number;
  remindersThisMonth: number;
}

/** Current plan and usage for a clinic, used for both display and enforcement. */
export async function getClinicUsage(clinicId: string): Promise<ClinicUsage> {
  const supabase = createClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: subscription }, patients, members, reminders] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end, cancel_at_period_end')
      .eq('clinic_id', clinicId)
      .maybeSingle(),
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).neq('status', 'archived'),
    supabase.from('clinic_members').select('user_id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
    supabase
      .from('reminder_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', monthStart.toISOString()),
  ]);

  return {
    plan: planFor(subscription?.plan),
    status: subscription?.status ?? 'trialing',
    currentPeriodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    patients: patients.count ?? 0,
    teamMembers: members.count ?? 0,
    remindersThisMonth: reminders.count ?? 0,
  };
}

/** Whether the clinic may add another patient on its current plan. */
export async function canAddPatient(clinicId: string): Promise<boolean> {
  const usage = await getClinicUsage(clinicId);
  const limit = usage.plan.limits.patients;
  return limit === null || usage.patients < limit;
}
