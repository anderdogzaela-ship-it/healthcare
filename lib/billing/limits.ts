import { createClient } from '@/lib/supabase/server';
import { planFor, type Plan, type PlanId } from './plans';
import { billingConfigured } from './stripe';

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
    // Scoped to this clinic's appointments; without the join it would also
    // count the staff member's own personal reminders.
    supabase
      .from('reminder_jobs')
      .select('id, appointments!inner(clinic_id)', { count: 'exact', head: true })
      .eq('appointments.clinic_id', clinicId)
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

/**
 * Whether the patient limit applies. It only does when billing is configured:
 * without Stripe nobody can upgrade, so enforcing it would lock people out of
 * features with no way forward.
 *
 * Team seats are different, see checkTeamSeat.
 */
export function limitsEnforced(): boolean {
  return billingConfigured();
}

/** Whether the clinic may add another patient on its current plan. */
export async function canAddPatient(clinicId: string): Promise<boolean> {
  if (!limitsEnforced()) return true;
  const usage = await getClinicUsage(clinicId);
  const limit = usage.plan.limits.patients;
  return limit === null || usage.patients < limit;
}

export interface SeatCheck {
  allowed: boolean;
  planId: PlanId;
}

/**
 * Whether the clinic has a seat left for another team member.
 *
 * Applies whether or not billing is configured: the free plan is defined as
 * the owner plus two teammates. Pending invitations count as taken seats,
 * otherwise an owner could send more invitations than the plan allows and the
 * extra people would find the door shut when they accept.
 */
export async function checkTeamSeat(clinicId: string): Promise<SeatCheck> {
  const supabase = createClient();

  const [usage, pending] = await Promise.all([
    getClinicUsage(clinicId),
    supabase
      .from('clinic_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString()),
  ]);

  const seats = usage.plan.limits.teamMembers;
  const taken = usage.teamMembers + (pending.count ?? 0);

  return { allowed: seats === null || taken < seats, planId: usage.plan.id };
}
