import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/server';
import { getClinicContext } from '@/lib/data/clinic';
import { getClinicUsage } from '@/lib/billing/limits';
import { billingConfigured } from '@/lib/billing/stripe';
import { isPlanId } from '@/lib/billing/plans';
import BillingView, { type BillingData } from '@/components/clinic/BillingView';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { checkout?: string };
}) {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) redirect('/clinic');

  const usage = await getClinicUsage(clinic.id);

  const data: BillingData = {
    planId: isPlanId(usage.plan.id) ? usage.plan.id : 'starter',
    status: usage.status as BillingData['status'],
    currentPeriodEnd: usage.currentPeriodEnd,
    cancelAtPeriodEnd: usage.cancelAtPeriodEnd,
    usage: {
      patients: usage.patients,
      teamMembers: usage.teamMembers,
      remindersThisMonth: usage.remindersThisMonth,
    },
    isOwner: clinic.role === 'owner',
    configured: billingConfigured(),
    checkout:
      searchParams.checkout === 'success' ? 'success'
      : searchParams.checkout === 'cancelled' ? 'cancelled'
      : null,
  };

  return <BillingView data={data} />;
}
