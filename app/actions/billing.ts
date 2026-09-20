'use server';

import { requireUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { siteUrl } from '@/lib/supabase/env';
import { getClinicContext } from '@/lib/data/clinic';
import { stripe, billingConfigured } from '@/lib/billing/stripe';
import { isPlanId, priceIdFor } from '@/lib/billing/plans';

export type BillingResult =
  | { status: 'ok'; url: string }
  | { status: 'error'; reason: 'forbidden' | 'not_configured' | 'invalid' | 'failed' };

/**
 * Finds or creates the Stripe customer for a clinic.
 *
 * Writes go through the admin client because the subscriptions table is
 * written only by billing code; membership and role are checked before we get
 * here.
 */
async function customerFor(clinicId: string, clinicName: string, email: string | undefined) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await stripe().customers.create({
    name: clinicName,
    email,
    metadata: { clinic_id: clinicId },
  });

  await admin
    .from('subscriptions')
    .upsert({ clinic_id: clinicId, stripe_customer_id: customer.id }, { onConflict: 'clinic_id' });

  return customer.id;
}

/** Starts a Stripe Checkout session for a plan and returns the URL to open. */
export async function startCheckout(formData: FormData): Promise<BillingResult> {
  if (!billingConfigured()) return { status: 'error', reason: 'not_configured' };

  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  // Only the owner can put the clinic on a paid plan.
  if (!clinic || clinic.role !== 'owner') return { status: 'error', reason: 'forbidden' };

  const plan = formData.get('plan');
  if (typeof plan !== 'string' || !isPlanId(plan)) return { status: 'error', reason: 'invalid' };

  const priceId = priceIdFor(plan);
  if (!priceId) return { status: 'error', reason: 'not_configured' };

  try {
    const customerId = await customerFor(clinic.id, clinic.name, user.email ?? undefined);

    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Both ends of the flow land back in the app.
      success_url: `${siteUrl()}/clinic/billing?checkout=success`,
      cancel_url: `${siteUrl()}/clinic/billing?checkout=cancelled`,
      client_reference_id: clinic.id,
      subscription_data: { metadata: { clinic_id: clinic.id, plan } },
      metadata: { clinic_id: clinic.id, plan },
      allow_promotion_codes: true,
    });

    if (!session.url) return { status: 'error', reason: 'failed' };
    return { status: 'ok', url: session.url };
  } catch (error) {
    console.error('stripe checkout failed', error);
    return { status: 'error', reason: 'failed' };
  }
}

/** Opens the Stripe customer portal so the clinic can manage its subscription. */
export async function openBillingPortal(): Promise<BillingResult> {
  if (!billingConfigured()) return { status: 'error', reason: 'not_configured' };

  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic || clinic.role !== 'owner') return { status: 'error', reason: 'forbidden' };

  try {
    const customerId = await customerFor(clinic.id, clinic.name, user.email ?? undefined);
    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl()}/clinic/billing`,
    });

    return { status: 'ok', url: session.url };
  } catch (error) {
    console.error('stripe portal failed', error);
    return { status: 'error', reason: 'failed' };
  }
}
