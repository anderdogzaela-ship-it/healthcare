'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ArrowRight, Heart } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Reveal from './Reveal';

const plans = [
  { key: 'starter', monthly: 29, highlight: false, href: '/signup' },
  { key: 'clinic', monthly: 89, highlight: true, href: '/signup' },
  { key: 'enterprise', monthly: null, highlight: false, href: '/signup' },
] as const;

const faqKeys = ['security', 'app', 'integrations', 'languages', 'cancel'] as const;

export function Pricing() {
  const { m, formatNumber } = useI18n();
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {m.landing.pricing.title}
          </h2>
          <p className="mt-4 text-lg text-gray-500">{m.landing.pricing.subtitle}</p>
        </Reveal>

        {/* Billing toggle */}
        <Reveal delay={80}>
          <div className="mt-10 flex items-center justify-center gap-3">
            <span className={`text-sm font-semibold transition-colors ${yearly ? 'text-gray-400' : 'text-gray-900'}`}>
              {m.landing.pricing.monthly}
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              role="switch"
              aria-checked={yearly}
              aria-label={yearly ? m.landing.pricing.yearly : m.landing.pricing.monthly}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 ${yearly ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-300 ${yearly ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-semibold transition-colors ${yearly ? 'text-gray-900' : 'text-gray-400'}`}>
              {m.landing.pricing.yearly}
            </span>
            <span className="ml-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              {m.landing.pricing.save}
            </span>
          </div>
        </Reveal>

        <div className="mt-12 grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan, i) => {
            const copy = m.landing.pricing.plans[plan.key];
            const price = plan.monthly === null ? null : yearly ? Math.round(plan.monthly * 0.8) : plan.monthly;

            return (
              <Reveal key={plan.key} delay={i * 110}>
                <div
                  className={`relative h-full rounded-3xl p-8 border transition-all duration-300 card-hover ${
                    plan.highlight
                      ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 border-emerald-500 shadow-2xl glow-emerald lg:-mt-4 lg:pb-12'
                      : 'bg-white border-gray-100 shadow-sm hover:shadow-xl'
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-emerald-950 text-[11px] font-bold uppercase tracking-wide shadow-lg">
                      {m.landing.pricing.popular}
                    </span>
                  )}

                  <h3 className={`text-lg font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                    {copy.name}
                  </h3>
                  <p className={`mt-1 text-sm ${plan.highlight ? 'text-emerald-100' : 'text-gray-400'}`}>{copy.description}</p>

                  <div className="mt-6 flex items-end gap-1">
                    <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                      {price === null ? m.landing.pricing.custom : `$${formatNumber(price)}`}
                    </span>
                    {price !== null && (
                      <span className={`pb-1.5 text-xs ${plan.highlight ? 'text-emerald-100' : 'text-gray-400'}`}>
                        {yearly ? m.landing.pricing.perMonthYearly : m.landing.pricing.perMonth}
                      </span>
                    )}
                  </div>

                  <ul className="mt-7 space-y-3">
                    {copy.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <span className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${plan.highlight ? 'bg-white/20' : 'bg-emerald-50'}`}>
                          <Check className={`w-3 h-3 ${plan.highlight ? 'text-white' : 'text-emerald-600'}`} />
                        </span>
                        <span className={`text-sm ${plan.highlight ? 'text-emerald-50' : 'text-gray-600'}`}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={`mt-8 w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all transform hover:scale-[1.03] active:scale-[0.98] ${
                      plan.highlight
                        ? 'bg-white text-emerald-700 shadow-lg hover:shadow-xl'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  >
                    {copy.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const { m } = useI18n();
  const [open, setOpen] = useState<string | null>('security');

  return (
    <section id="faq" className="py-20 lg:py-28 bg-gradient-to-b from-white to-emerald-50/40 scroll-mt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {m.landing.faq.title}
          </h2>
        </Reveal>

        <div className="mt-12 space-y-3">
          {faqKeys.map((key, i) => {
            const item = m.landing.faq.items[key];
            const isOpen = open === key;
            return (
              <Reveal key={key} delay={i * 70}>
                <div className={`bg-white rounded-2xl border transition-all duration-300 ${isOpen ? 'border-emerald-200 shadow-md' : 'border-gray-100 shadow-sm hover:border-emerald-100'}`}>
                  <button
                    onClick={() => setOpen(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-sm lg:text-base font-semibold text-gray-900">{item.question}</span>
                    <ChevronDown className={`w-5 h-5 flex-shrink-0 text-emerald-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  const { m } = useI18n();

  return (
    <section className="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700">
      <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-blob" />
      <div className="absolute -bottom-24 right-0 w-[28rem] h-[28rem] rounded-full bg-amber-300/10 blur-3xl animate-blob" style={{ animationDelay: '6s' }} />

      <Reveal className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-5xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
          {m.landing.cta.title}
        </h2>
        <p className="mt-5 text-lg text-emerald-50/90">{m.landing.cta.subtitle}</p>
        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-emerald-700 bg-white shadow-2xl hover:shadow-white/20 transition-all transform hover:scale-[1.03] active:scale-[0.98]"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {m.landing.cta.button}
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-4 rounded-2xl text-base font-bold text-white border border-white/40 hover:bg-white/10 transition-all"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {m.landing.cta.secondary}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  const { m, fmt } = useI18n();
  const year = new Date().getFullYear();

  const columns = [
    { title: m.landing.footer.product, links: [m.landing.footer.links.features, m.landing.footer.links.pricing, m.landing.footer.links.integrations, m.landing.footer.links.api] },
    { title: m.landing.footer.company, links: [m.landing.footer.links.about, m.landing.footer.links.blog, m.landing.footer.links.contact] },
    { title: m.landing.footer.legal, links: [m.landing.footer.links.privacy, m.landing.footer.links.terms, m.landing.footer.links.security] },
  ];

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-xl font-bold text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
            </div>
            <p className="mt-4 text-sm max-w-xs leading-relaxed">{m.common.tagline}</p>
            <div className="mt-6">
              <LanguageSwitcher className="[&>select]:bg-gray-900 [&>select]:border-gray-800 [&>select]:text-gray-300" />
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm hover:text-emerald-400 transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* String, not number: the year must not be formatted with thousand separators. */}
          <p className="text-xs">{fmt(m.landing.footer.rights, { year: String(year) })}</p>
          <p className="text-xs text-amber-400/80">{m.landing.footer.demoNote}</p>
        </div>
      </div>
    </footer>
  );
}
