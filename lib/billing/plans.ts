export type PlanId = 'starter' | 'clinic' | 'enterprise';

export interface Plan {
  id: PlanId;
  /** Monthly price in US dollars, for display. Stripe holds the real prices. */
  monthlyPrice: number | null;
  /** Environment variable holding the Stripe price id. */
  priceEnv: string | null;
  limits: {
    patients: number | null;
    teamMembers: number | null;
    remindersPerMonth: number | null;
  };
}

/**
 * Plan limits are enforced in the app (see lib/billing/limits.ts), not just
 * advertised on the landing page: a plan that does not actually limit anything
 * is a pricing page, not a product.
 */
export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    monthlyPrice: 29,
    priceEnv: 'STRIPE_PRICE_STARTER',
    // The owner plus two teammates.
    limits: { patients: 100, teamMembers: 3, remindersPerMonth: 200 },
  },
  clinic: {
    id: 'clinic',
    monthlyPrice: 89,
    priceEnv: 'STRIPE_PRICE_CLINIC',
    limits: { patients: 1000, teamMembers: 10, remindersPerMonth: 2000 },
  },
  enterprise: {
    id: 'enterprise',
    monthlyPrice: null,
    priceEnv: null,
    limits: { patients: null, teamMembers: null, remindersPerMonth: null },
  },
};

export function isPlanId(value: string | undefined | null): value is PlanId {
  return value === 'starter' || value === 'clinic' || value === 'enterprise';
}

export function planFor(value: string | undefined | null): Plan {
  return isPlanId(value) ? PLANS[value] : PLANS.starter;
}

/** The Stripe price id for a plan, or null when it is not sold self-service. */
export function priceIdFor(plan: PlanId): string | null {
  const envName = PLANS[plan].priceEnv;
  if (!envName) return null;
  return process.env[envName] ?? null;
}
