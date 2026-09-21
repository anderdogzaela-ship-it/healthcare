'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Heart, ArrowLeft, ArrowRight, Bot, MessageCircle, Workflow, Zap, Users, Plug, Building2,
  Monitor, Server, Database, Sparkles, CreditCard, Send, Globe, ShieldCheck, KeyRound,
  Lock, FileCheck, Siren, GitCommit, TestTube, BookOpen, Rocket, AlertTriangle, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Reveal from '@/components/landing/Reveal';
import { Footer } from '@/components/landing/Pricing';

const heading = { fontFamily: 'Nunito, sans-serif' };

const stats = [
  { value: '3', key: 'languages' },
  { value: '7', key: 'areas' },
  { value: '3', key: 'providers' },
  { value: '100%', key: 'rls' },
] as const;

const areas: { key: 'ai' | 'whatsapp' | 'automation' | 'zapier' | 'crm' | 'api' | 'saas'; icon: LucideIcon; gradient: string }[] = [
  { key: 'ai', icon: Bot, gradient: 'from-violet-500 to-purple-500' },
  { key: 'whatsapp', icon: MessageCircle, gradient: 'from-green-500 to-emerald-500' },
  { key: 'automation', icon: Workflow, gradient: 'from-amber-500 to-orange-500' },
  { key: 'zapier', icon: Zap, gradient: 'from-orange-500 to-red-500' },
  { key: 'crm', icon: Users, gradient: 'from-blue-500 to-cyan-500' },
  { key: 'api', icon: Plug, gradient: 'from-rose-500 to-pink-500' },
  { key: 'saas', icon: Building2, gradient: 'from-emerald-500 to-teal-500' },
];

const security: { key: 'rls' | 'keys' | 'secrets' | 'lgpd' | 'safety'; icon: LucideIcon }[] = [
  { key: 'rls', icon: ShieldCheck },
  { key: 'keys', icon: KeyRound },
  { key: 'secrets', icon: Lock },
  { key: 'lgpd', icon: FileCheck },
  { key: 'safety', icon: Siren },
];

const process: { key: 'steps' | 'tests' | 'docs' | 'deploy'; icon: LucideIcon }[] = [
  { key: 'steps', icon: GitCommit },
  { key: 'tests', icon: TestTube },
  { key: 'docs', icon: BookOpen },
  { key: 'deploy', icon: Rocket },
];

const stack = [
  'Next.js 14', 'React', 'TypeScript', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'Row-level security',
  'Claude API', 'Gemini API', 'Stripe', 'n8n', 'WhatsApp', 'REST + OpenAPI', 'Webhooks (HMAC)',
  'Zod', 'Playwright', 'Vercel',
];

type Node = { title: string; detail: string; icon: LucideIcon; tone: string };

function ArchitectureNode({ node, highlight = false }: { node: Node; highlight?: boolean }) {
  return (
    <div
      className={`h-full rounded-2xl p-4 border flex items-start gap-3 ${
        highlight ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white border-gray-200 shadow-sm'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-white/15' : node.tone}`}>
        <node.icon className={`w-5 h-5 ${highlight ? 'text-white' : ''}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-bold ${highlight ? 'text-white' : 'text-gray-900'}`} style={heading}>{node.title}</p>
        <p className={`text-xs mt-0.5 leading-snug ${highlight ? 'text-emerald-50' : 'text-gray-500'}`}>{node.detail}</p>
      </div>
    </div>
  );
}

/** Vertical on phones, horizontal from md up. */
function Connector({ horizontal = false }: { horizontal?: boolean }) {
  return horizontal ? (
    <div aria-hidden className="hidden md:flex items-center justify-center">
      <div className="h-0.5 w-full bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200" />
    </div>
  ) : (
    <div aria-hidden className="flex justify-center py-2">
      <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-200 to-emerald-400" />
    </div>
  );
}

export default function CaseStudy() {
  const { m } = useI18n();
  const cs = m.caseStudy;
  const a = cs.architecture;

  const integrations: Node[] = [
    { title: a.ai, detail: a.aiDetail, icon: Sparkles, tone: 'bg-violet-50 text-violet-600' },
    { title: a.automation, detail: a.automationDetail, icon: Send, tone: 'bg-green-50 text-green-600' },
    { title: a.billing, detail: a.billingDetail, icon: CreditCard, tone: 'bg-blue-50 text-blue-600' },
    { title: a.external, detail: a.externalDetail, icon: Globe, tone: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-gray-100">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900" style={heading}>HealthAI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher className="hidden sm:block" />
            <Link href="/" className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-600 hover:text-emerald-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {cs.back}
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-md shadow-emerald-200 hover:shadow-lg transition-all"
              style={heading}
            >
              {cs.liveDemo}
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section id="top" className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-white scroll-mt-16">
          <div aria-hidden className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-200/40 blur-3xl animate-blob" />
          <div aria-hidden className="absolute top-40 -left-24 w-80 h-80 rounded-full bg-teal-200/40 blur-3xl animate-blob" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 lg:pt-24 lg:pb-20">
            <Reveal>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-white border border-emerald-100 px-3 py-1.5 rounded-full shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                {cs.eyebrow}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.08]" style={heading}>
                {cs.title}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-3xl text-lg lg:text-xl text-gray-600 leading-relaxed">{cs.summary}</p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-xl shadow-emerald-200 hover:shadow-2xl transition-all transform hover:scale-[1.03]"
                  style={heading}
                >
                  {cs.liveDemo}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-semibold text-gray-700 bg-white border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  {cs.back}
                </Link>
              </div>
            </Reveal>

            <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <Reveal key={stat.key} delay={300 + i * 80}>
                  <div className="h-full bg-white/80 backdrop-blur rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-3xl lg:text-4xl font-extrabold text-emerald-600" style={heading}>{stat.value}</p>
                    <p className="mt-1 text-sm text-gray-500 leading-snug">{cs.stats[stat.key]}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Challenge and solution */}
        <section className="py-16 lg:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <Reveal>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                <Image
                  src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=80"
                  alt=""
                  width={1200}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-72 lg:h-[26rem] object-cover"
                />
              </div>
            </Reveal>
            <div className="space-y-6">
              <Reveal>
                <div className="rounded-3xl p-6 lg:p-7 bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                    <h2 className="text-xl font-bold text-gray-900" style={heading}>{cs.challenge.title}</h2>
                  </div>
                  <p className="mt-3 text-gray-600 leading-relaxed">{cs.challenge.body}</p>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <div className="rounded-3xl p-6 lg:p-7 bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <h2 className="text-xl font-bold text-gray-900" style={heading}>{cs.solution.title}</h2>
                  </div>
                  <p className="mt-3 text-gray-600 leading-relaxed">{cs.solution.body}</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* What was built */}
        <section id="built" className="py-16 lg:py-24 bg-gray-50 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-2xl">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight" style={heading}>{cs.builtTitle}</h2>
              <p className="mt-3 text-lg text-gray-500">{cs.builtSubtitle}</p>
            </Reveal>
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {areas.map((area, i) => (
                <Reveal key={area.key} delay={i * 70} className={area.key === 'saas' ? 'lg:col-span-3 sm:col-span-2' : ''}>
                  <div className="group h-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm card-hover hover:shadow-xl hover:border-emerald-100">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${area.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <area.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-gray-900" style={heading}>{cs.areas[area.key].title}</h3>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">{cs.areas[area.key].body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture" className="py-16 lg:py-24 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-2xl">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight" style={heading}>{cs.architectureTitle}</h2>
              <p className="mt-3 text-lg text-gray-500">{cs.architectureSubtitle}</p>
            </Reveal>

            <Reveal delay={100}>
              <div className="mt-12 rounded-3xl bg-gradient-to-br from-gray-50 to-emerald-50/60 border border-gray-100 p-5 sm:p-8">
                <div className="max-w-md mx-auto">
                  <ArchitectureNode node={{ title: a.users, detail: a.usersDetail, icon: Monitor, tone: 'bg-gray-100 text-gray-600' }} />
                </div>
                <Connector />
                <div className="grid md:grid-cols-[1fr_3rem_1fr] items-stretch max-w-3xl mx-auto">
                  <ArchitectureNode highlight node={{ title: a.app, detail: a.appDetail, icon: Server, tone: '' }} />
                  <Connector horizontal />
                  <div className="md:hidden"><Connector /></div>
                  <ArchitectureNode node={{ title: a.db, detail: a.dbDetail, icon: Database, tone: 'bg-emerald-50 text-emerald-600' }} />
                </div>
                <Connector />
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {integrations.map((node) => (
                    <ArchitectureNode key={node.title} node={node} />
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Security, stack and process */}
        <section className="py-16 lg:py-24 bg-gray-950 text-gray-300">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12">
            <div>
              <Reveal>
                <h2 className="text-3xl font-extrabold text-white tracking-tight" style={heading}>{cs.securityTitle}</h2>
              </Reveal>
              <ul className="mt-8 space-y-4">
                {security.map((item, i) => (
                  <Reveal key={item.key} delay={i * 70}>
                    <li className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <p className="text-sm leading-relaxed pt-1.5">{cs.security[item.key]}</p>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>

            <div className="space-y-12">
              <div>
                <Reveal>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight" style={heading}>{cs.stackTitle}</h2>
                </Reveal>
                <Reveal delay={80}>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {stack.map((tech) => (
                      <span key={tech} className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-200 bg-white/5 border border-white/10">
                        {tech}
                      </span>
                    ))}
                  </div>
                </Reveal>
              </div>

              <div>
                <Reveal>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight" style={heading}>{cs.processTitle}</h2>
                </Reveal>
                <ul className="mt-6 space-y-4">
                  {process.map((item, i) => (
                    <Reveal key={item.key} delay={i * 70}>
                      <li className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-sm leading-relaxed pt-1.5">{cs.process[item.key]}</p>
                      </li>
                    </Reveal>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section id="contact" className="py-16 lg:py-24 scroll-mt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 to-teal-600 p-8 sm:p-12 text-center shadow-2xl shadow-emerald-200">
                <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
                <h2 className="relative text-3xl lg:text-4xl font-extrabold text-white tracking-tight" style={heading}>{cs.ctaTitle}</h2>
                <p className="relative mt-4 text-lg text-emerald-50 max-w-2xl mx-auto">{cs.ctaBody}</p>
                <Link
                  href="/signup"
                  className="relative mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold text-emerald-700 bg-white shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.03]"
                  style={heading}
                >
                  {cs.ctaDemo}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </Reveal>
            <p className="mt-6 text-center text-xs text-gray-400">{cs.note}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
