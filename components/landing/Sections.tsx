'use client';

import Image from 'next/image';
import {
  Activity, Bot, MessageCircle, Workflow, Users, Plug,
  Check, Quote, Star
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import Reveal from './Reveal';

const featureItems = [
  { key: 'tracking', icon: Activity, gradient: 'from-emerald-500 to-teal-500' },
  { key: 'assistant', icon: Bot, gradient: 'from-violet-500 to-purple-500' },
  { key: 'whatsapp', icon: MessageCircle, gradient: 'from-green-500 to-emerald-500' },
  { key: 'automation', icon: Workflow, gradient: 'from-amber-500 to-orange-500' },
  { key: 'crm', icon: Users, gradient: 'from-blue-500 to-cyan-500' },
  { key: 'integrations', icon: Plug, gradient: 'from-rose-500 to-pink-500' },
] as const;

const steps = ['one', 'two', 'three'] as const;
const testimonialItems = [
  { key: 'a', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { key: 'b', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { key: 'c', avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
] as const;

export function Features() {
  const { m } = useI18n();

  return (
    <section id="features" className="relative py-20 lg:py-28 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {m.landing.features.title}
          </h2>
          <p className="mt-4 text-lg text-gray-500">{m.landing.features.subtitle}</p>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureItems.map((feature, i) => (
            <Reveal key={feature.key} delay={i * 80}>
              <div className="group h-full bg-white rounded-3xl p-7 border border-gray-100 shadow-sm card-hover hover:shadow-xl hover:border-emerald-100">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {m.landing.features.items[feature.key].title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {m.landing.features.items[feature.key].description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { m } = useI18n();

  return (
    <section id="how" className="relative py-20 lg:py-28 bg-gradient-to-b from-white via-emerald-50/40 to-white scroll-mt-20 overflow-hidden">
      <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl animate-blob" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {m.landing.how.title}
          </h2>
          <p className="mt-4 text-lg text-gray-500">{m.landing.how.subtitle}</p>
        </Reveal>

        <div className="mt-16 grid lg:grid-cols-3 gap-8 lg:gap-6 relative">
          {/* Connecting line on desktop */}
          <div className="hidden lg:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200" />

          {steps.map((step, i) => (
            <Reveal key={step} delay={i * 140} className="relative">
              <div className="text-center px-4">
                <div className="relative mx-auto w-16 h-16 rounded-2xl bg-white border border-emerald-100 shadow-lg flex items-center justify-center">
                  <span className="text-2xl font-extrabold gradient-text" style={{ fontFamily: 'Nunito, sans-serif' }}>{i + 1}</span>
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {m.landing.how.steps[step].title}
                </h3>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
                  {m.landing.how.steps[step].description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Platform() {
  const { m } = useI18n();

  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <Reveal>
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-tr from-emerald-300/30 to-teal-200/30 rounded-[2rem] blur-2xl" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                <Image
                  src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=80"
                  alt=""
                  width={1200}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-[24rem] object-cover"
                />
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {m.landing.platform.title}
              </h2>
              <p className="mt-4 text-lg text-gray-500">{m.landing.platform.subtitle}</p>
            </Reveal>

            <ul className="mt-8 space-y-4">
              {m.landing.platform.bullets.map((bullet, i) => (
                <Reveal key={bullet} delay={i * 90}>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                    <span className="text-gray-600">{bullet}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhatsAppSection() {
  const { m } = useI18n();
  const bubbles = [
    { text: m.landing.whatsapp.chat.one, from: 'bot' },
    { text: m.landing.whatsapp.chat.two, from: 'user' },
    { text: m.landing.whatsapp.chat.three, from: 'bot' },
    { text: m.landing.whatsapp.chat.four, from: 'user' },
  ];

  return (
    <section className="relative py-20 lg:py-28 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 overflow-hidden">
      <div className="absolute -top-24 -left-24 w-[30rem] h-[30rem] rounded-full bg-emerald-500/20 blur-3xl animate-blob" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl animate-blob" style={{ animationDelay: '5s' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-emerald-200 backdrop-blur-sm">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </span>
              <h2 className="mt-6 text-3xl lg:text-4xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {m.landing.whatsapp.title}
              </h2>
              <p className="mt-4 text-lg text-emerald-100/80 leading-relaxed">{m.landing.whatsapp.description}</p>
            </Reveal>

            <ul className="mt-8 space-y-3">
              {m.landing.whatsapp.bullets.map((bullet, i) => (
                <Reveal key={bullet} delay={i * 90}>
                  <li className="flex items-center gap-3 text-emerald-50">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/25 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    </span>
                    {bullet}
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>

          {/* Phone mockup */}
          <Reveal delay={150}>
            <div className="relative mx-auto w-[19rem] sm:w-[21rem]">
              <div className="absolute -inset-6 bg-emerald-400/20 rounded-[3rem] blur-3xl" />
              <div className="relative rounded-[2.5rem] bg-gray-900 p-3 shadow-2xl ring-1 ring-white/10 animate-float-slow">
                <div className="rounded-[2rem] overflow-hidden bg-[#ECE5DD]">
                  {/* Chat header */}
                  <div className="bg-emerald-700 px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">H</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">HealthAI</p>
                      <p className="text-emerald-200 text-[11px]">{m.chat.online}</p>
                    </div>
                  </div>
                  {/* Bubbles */}
                  <div className="p-4 space-y-3 min-h-[19rem]">
                    {bubbles.map((bubble, i) => (
                      <Reveal key={i} delay={300 + i * 250}>
                        <div className={`flex ${bubble.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <p
                            className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                              bubble.from === 'user'
                                ? 'bg-[#DCF8C6] text-gray-800 rounded-2xl rounded-br-md'
                                : 'bg-white text-gray-700 rounded-2xl rounded-bl-md'
                            }`}
                          >
                            {bubble.text}
                          </p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const { m } = useI18n();

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-emerald-50/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {m.landing.testimonials.title}
          </h2>
          <p className="mt-3 text-sm text-gray-400">{m.landing.testimonials.subtitle}</p>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {testimonialItems.map((item, i) => {
            const person = m.landing.testimonials.items[item.key];
            return (
              <Reveal key={item.key} delay={i * 120}>
                <figure className="h-full bg-white rounded-3xl p-7 border border-gray-100 shadow-sm card-hover hover:shadow-xl relative">
                  <Quote className="absolute top-6 right-6 w-8 h-8 text-emerald-100" />
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-gray-600 leading-relaxed">“{person.quote}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <Image
                      src={item.avatar}
                      alt=""
                      width={44}
                      height={44}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-100"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{person.name}</p>
                      <p className="text-xs text-gray-400">{person.role}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
