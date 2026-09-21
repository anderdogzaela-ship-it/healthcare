'use client';

import Link from 'next/link';
import { Heart, ArrowLeft, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Footer } from '@/components/landing/Pricing';

const heading = { fontFamily: 'Nunito, sans-serif' };

/** The privacy policy and the terms share one layout; only the text differs. */
export default function LegalPage({ doc }: { doc: 'privacy' | 'terms' }) {
  const { m } = useI18n();
  const page = m.legal[doc];

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-gray-100">
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900" style={heading}>HealthAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="hidden sm:block" />
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-emerald-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{m.legal.back}</span>
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight" style={heading}>{page.title}</h1>
        <p className="mt-3 text-sm text-gray-400">{m.legal.updated}</p>
        <p className="mt-6 max-w-3xl text-lg text-gray-600 leading-relaxed">{page.intro}</p>

        <div role="note" className="mt-8 max-w-3xl flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
          <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{m.legal.demoNotice}</p>
        </div>

        <div className="mt-12 grid lg:grid-cols-[14rem_1fr] gap-10">
          {/* Table of contents */}
          <nav aria-label={m.legal.onThisPage} className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{m.legal.onThisPage}</p>
              <ul className="mt-3 space-y-1.5 border-l border-gray-100">
                {page.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block -ml-px pl-4 py-1 text-sm text-gray-500 border-l border-transparent hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="max-w-3xl space-y-10">
            {page.sections.map((section, i) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-xl font-bold text-gray-900" style={heading}>
                  <span className="text-emerald-500 mr-2">{i + 1}.</span>
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-gray-600 leading-relaxed">{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
