'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { openBillingPortal, startCheckout } from '@/app/actions/billing';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import type { Messages } from '@/lib/i18n/messages';

type SubscriptionStatus = keyof Messages['billing']['statuses'];

export interface BillingData {
  planId: PlanId;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  usage: { patients: number; teamMembers: number; remindersThisMonth: number };
  isOwner: boolean;
  configured: boolean;
  checkout: 'success' | 'cancelled' | null;
}

const planOrder: PlanId[] = ['starter', 'clinic', 'enterprise'];

export default function BillingView({ data }: { data: BillingData }) {
  const { m, fmt, formatNumber, formatDate } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const go = (work: () => Promise<{ status: string; url?: string; reason?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (result.status === 'ok' && result.url) {
        window.location.href = result.url;
        return;
      }
      setError(
        result.reason === 'not_configured' ? m.billing.notConfigured
        : result.reason === 'forbidden' ? m.billing.ownerOnly
        : m.billing.error
      );
    });
  };

  const choose = (plan: PlanId) => {
    const formData = new FormData();
    formData.set('plan', plan);
    go(() => startCheckout(formData));
  };

  const currentPlan = PLANS[data.planId];

  const usageRows = [
    { label: m.billing.patients, used: data.usage.patients, limit: currentPlan.limits.patients },
    { label: m.billing.teamMembers, used: data.usage.teamMembers, limit: currentPlan.limits.teamMembers },
    { label: m.billing.reminders, used: data.usage.remindersThisMonth, limit: currentPlan.limits.remindersPerMonth },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <Link href="/clinic" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {m.clinic.backToPatients}
      </Link>

      <div className="mt-4 max-w-4xl">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.billing.title}</h1>
        <p className="text-gray-500 mt-1">{m.billing.subtitle}</p>

        {data.checkout === 'success' && (
          <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">{m.billing.checkoutSuccess}</p>
          </div>
        )}
        {data.checkout === 'cancelled' && (
          <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">{m.billing.checkoutCancelled}</p>
          </div>
        )}
        {!data.configured && (
          <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{m.billing.notConfigured}</p>
          </div>
        )}
        {error && (
          <div role="alert" className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Current plan and usage */}
        <div className="mt-6 grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{m.billing.currentPlan}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {m.landing.pricing.plans[data.planId].name}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                {m.billing.statuses[data.status]}
              </span>
            </div>

            {data.currentPeriodEnd && (
              <p className="mt-3 text-sm text-gray-500">
                {fmt(data.cancelAtPeriodEnd ? m.billing.endsOn : m.billing.renews, {
                  date: formatDate(new Date(data.currentPeriodEnd), { day: 'numeric', month: 'long', year: 'numeric' }),
                })}
              </p>
            )}

            {data.isOwner && (
              <button
                onClick={() => go(openBillingPortal)}
                disabled={pending || !data.configured}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-all disabled:opacity-60"
              >
                <CreditCard className="w-4 h-4" />
                {pending ? m.billing.opening : m.billing.manage}
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{m.billing.usageTitle}</p>
            <div className="mt-4 space-y-4">
              {usageRows.map((row) => {
                const pct = row.limit ? Math.min(Math.round((row.used / row.limit) * 100), 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-semibold text-gray-900">
                        {formatNumber(row.used)}
                        {row.limit === null ? ` / ${m.billing.unlimited}` : ` / ${formatNumber(row.limit)}`}
                      </span>
                    </div>
                    {row.limit !== null && (
                      <div className="mt-1.5 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="mt-8 grid lg:grid-cols-3 gap-6">
          {planOrder.map((planId) => {
            const plan = PLANS[planId];
            const copy = m.landing.pricing.plans[planId];
            const isCurrent = planId === data.planId;

            return (
              <div
                key={planId}
                className={`rounded-2xl p-6 border transition-all ${isCurrent ? 'border-emerald-300 bg-emerald-50/40 shadow-md' : 'border-gray-100 bg-white shadow-sm hover:shadow-md'}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{copy.name}</h3>
                  {isCurrent && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      {m.billing.currentBadge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">{copy.description}</p>

                <p className="mt-4 text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {plan.monthlyPrice === null ? m.billing.custom : `$${formatNumber(plan.monthlyPrice)}`}
                  {plan.monthlyPrice !== null && <span className="text-xs font-normal text-gray-400">{m.billing.perMonth}</span>}
                </p>

                <ul className="mt-4 space-y-2">
                  {copy.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-1" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {!isCurrent && data.isOwner && (
                  plan.priceEnv ? (
                    <button
                      onClick={() => choose(planId)}
                      disabled={pending || !data.configured}
                      className="mt-6 w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-200 transition-all disabled:opacity-60"
                      style={{ fontFamily: 'Nunito, sans-serif' }}
                    >
                      {pending ? m.billing.opening : m.billing.choose}
                    </button>
                  ) : (
                    <a
                      href="mailto:sales@example.com"
                      className="mt-6 block w-full py-2.5 rounded-xl text-sm font-bold text-center text-gray-700 bg-white border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                      style={{ fontFamily: 'Nunito, sans-serif' }}
                    >
                      {m.billing.contactSales}
                    </a>
                  )
                )}
              </div>
            );
          })}
        </div>

        {!data.isOwner && <p className="mt-6 text-sm text-gray-400">{m.billing.ownerOnly}</p>}
      </div>
    </main>
  );
}
