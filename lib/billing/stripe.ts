import Stripe from 'stripe';

let client: Stripe | null = null;

/**
 * Lazily created Stripe client. Lazy so that the rest of the app still builds
 * and runs when billing is not configured yet.
 */
export function stripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY: billing is not configured.');

  client = new Stripe(key);
  return client;
}

export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
