'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, PlayCircle, Sparkles, Heart, CheckCircle2, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import Counter from './Counter';
import Reveal from './Reveal';

const logos = ['Clínica Vida', 'Centro Médico Norte', 'Lakeside Wellness', 'Vita Care', 'NordClinic', 'Grupo Saúde+'];

export default function Hero() {
  const { m, formatNumber } = useI18n();

  const stats: { value: number; decimals?: number; prefix?: string; suffix?: string; label: string }[] = [
    { value: 38, prefix: '−', suffix: '%', label: m.landing.stats.noShows },
    { value: 120, suffix: '+', label: m.landing.stats.hours },
    { value: 240, suffix: '+', label: m.landing.stats.clinics },
    { value: 99.9, decimals: 1, suffix: '%', label: m.landing.stats.uptime },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-white pt-28 lg:pt-36 pb-16 lg:pb-24">
      {/* Decorative animated blobs */}
      <div className="absolute -top-32 -right-24 w-[32rem] h-[32rem] rounded-full bg-emerald-200/40 blur-3xl animate-blob" />
      <div className="absolute top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-200/30 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(16,185,129,0.12)_1px,transparent_0)] [background-size:32px_32px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-emerald-100 shadow-sm text-xs font-semibold text-emerald-700">
                <Sparkles className="w-3.5 h-3.5" />
                {m.landing.hero.badge}
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1
                className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.08] tracking-tight"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {m.landing.hero.titleStart}{' '}
                <span className="gradient-text">{m.landing.hero.titleAccent}</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">{m.landing.hero.subtitle}</p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-xl shadow-emerald-200 hover:shadow-2xl hover:shadow-emerald-300 transition-all transform hover:scale-[1.03] active:scale-[0.98]"
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                >
                  {m.landing.hero.ctaPrimary}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#how"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-base font-bold text-gray-700 bg-white border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 shadow-sm hover:shadow-md transition-all"
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                >
                  <PlayCircle className="w-5 h-5" />
                  {m.landing.hero.ctaSecondary}
                </a>
              </div>
              <p className="mt-4 text-sm text-gray-400">{m.landing.hero.note}</p>
            </Reveal>
          </div>

          {/* Visual */}
          <Reveal delay={200} className="relative">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-400/30 via-emerald-200/20 to-amber-200/30 rounded-[2.5rem] blur-2xl" />
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-black/5">
                <Image
                  src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80"
                  alt=""
                  width={1200}
                  height={900}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-[22rem] sm:h-[26rem] lg:h-[30rem] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/45 via-transparent to-transparent" />
              </div>

              {/* Floating metric card */}
              <div className="absolute -left-4 sm:-left-8 top-10 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/70 p-4 animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-gray-400">{m.landing.hero.cardHeartRate}</p>
                    <p className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
                      72 <span className="text-xs font-normal text-gray-400">{m.common.bpm}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating adherence card */}
              <div className="absolute -right-3 sm:-right-6 top-1/2 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/70 p-4 w-48 animate-float-slow" style={{ animationDelay: '1.2s' }}>
                <p className="text-[11px] font-medium text-gray-400">{m.landing.hero.cardAdherence}</p>
                <p className="text-2xl font-bold text-emerald-600" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {formatNumber(0.94, { style: 'percent' })}
                </p>
                <div className="mt-2 h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full w-[94%] bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" />
                </div>
              </div>

              {/* Floating WhatsApp pill */}
              <div className="absolute left-6 -bottom-5 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/70 px-4 py-3 flex items-center gap-3 animate-float" style={{ animationDelay: '2.4s' }}>
                <span className="relative flex w-9 h-9 items-center justify-center rounded-xl bg-emerald-500">
                  <span className="absolute inset-0 rounded-xl bg-emerald-400 animate-pulse-ring" />
                  <MessageCircle className="relative w-5 h-5 text-white" />
                </span>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-700">{m.landing.hero.cardReminder}</p>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Stats */}
        <Reveal delay={120}>
          <div className="mt-20 lg:mt-28 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-extrabold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  <Counter value={stat.value} decimals={stat.decimals} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Marquee of client names */}
      <div className="relative mt-16 lg:mt-24">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">{m.landing.trust}</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-12 pr-12">
            {[...logos, ...logos].map((logo, i) => (
              <span key={i} className="text-lg font-bold text-gray-300 whitespace-nowrap" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
