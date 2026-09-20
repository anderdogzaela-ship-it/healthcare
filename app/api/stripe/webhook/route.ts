import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe, billingConfigured } from '@/lib/billing/stripe';
import { isPlanId } from '@/lib/billing/plans';
import type { SubscriptionStatus } from '@/lib/supabase/database.types';

// Signature verification needs the raw body, and the Stripe SDK needs Node.
export const runtime = 'nodejs';

const STATUSES: SubscriptionStatus[] = [
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid',
];

function toStatus(value: string): SubscriptionStatus {
  return (STATUSES as string[]).includes(value) ? (value as SubscriptionStatus) : 'incomplete';
}

/** Mirrors a Stripe subscription into our table, and the plan onto the clinic. */
async function syncSubscription(subscription: Stripe.Subscription) {
  const clinicId = subscription.metadata?.clinic_id;
  if (!clinicId) return;

  const plan = isPlanId(subscription.metadata?.plan) ? subscription.metadata.plan : 'starter';
  const admin = createAdminClient();

  // `current_period_end` is seconds since the epoch.
  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;

  await admin.from('subscriptions').upsert(
    {
      clinic_id: clinicId,
      stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      plan,
      status: toStatus(subscription.status),
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    },
    { onConflict: 'clinic_id' }
  );

  // The clinic's plan drives the limits, so keep it in step. A cancelled
  // subscription falls back to starter rather than keeping paid limits.
  const effectivePlan = subscription.status === 'active' || subscription.status === 'trialing' ? plan : 'starter';
  await admin.from('clinics').update({ plan: effectivePlan }).eq('id', clinicId);
}

export async function POST(request: Request) {
  if (!billingConfigured()) return Response.json({ error: 'not_configured' }, { status: 503 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return Response.json({ error: 'unsigned' }, { status: 400 });

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, signature, secret);
  } catch (error) {
    console.error('stripe signature verification failed', error);
    return Response.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const id = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const subscription = await stripe().subscriptions.retrieve(id);
          // Checkout metadata is the authoritative source of the clinic id.
          subscription.metadata = { ...subscription.metadata, ...session.metadata };
          await syncSubscription(subscription);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as unknown as { subscription?: string | { id: string } }).subscription;
        if (subscriptionId) {
          const id = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
          await syncSubscription(await stripe().subscriptions.retrieve(id));
        }
        break;
      }

      default:
        // Everything else is acknowledged and ignored on purpose.
        break;
    }
  } catch (error) {
    console.error('stripe webhook handling failed', event.type, error);
    // 500 asks Stripe to retry; the handlers above are safe to run twice.
    return Response.json({ error: 'handler_failed' }, { status: 500 });
  }

  return Response.json({ received: true });
}
