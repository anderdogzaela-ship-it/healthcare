'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Menu, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const sections = [
  { key: 'features', href: '#features' },
  { key: 'how', href: '#how' },
  { key: 'pricing', href: '#pricing' },
  { key: 'faq', href: '#faq' },
  { key: 'caseStudy', href: '/case-study' },
] as const;

export default function LandingNav() {
  const { m } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/85 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200 transition-transform duration-300 group-hover:scale-110">
            <Heart className="w-5 h-5 lg:w-6 lg:h-6 text-white fill-white" />
          </div>
          <span className="text-xl lg:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
          <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
            {m.landing.demoBadge}
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-1">
          {sections.map((section) => (
            <a
              key={section.key}
              href={section.href}
              className="relative px-4 py-2 text-sm font-semibold text-gray-600 hover:text-emerald-700 transition-colors after:absolute after:left-4 after:right-4 after:-bottom-0.5 after:h-0.5 after:bg-emerald-500 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
            >
              {m.landing.nav[section.key]}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-emerald-700 transition-colors">
            {m.landing.nav.signIn}
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all transform hover:scale-[1.04] active:scale-[0.98]"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {m.landing.nav.getStarted}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={m.common.openMenu}
          aria-expanded={menuOpen}
          className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`lg:hidden overflow-hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 transition-all duration-300 ${
          menuOpen ? 'max-h-[30rem] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-4 space-y-1">
          {sections.map((section) => (
            <a
              key={section.key}
              href={section.href}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              {m.landing.nav[section.key]}
            </a>
          ))}
          <div className="pt-3 space-y-3 border-t border-gray-100">
            <LanguageSwitcher className="w-full [&>select]:w-full" />
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 text-center hover:bg-gray-50 transition-colors"
            >
              {m.landing.nav.signIn}
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-bold text-white text-center bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-200"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              {m.landing.nav.getStarted}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
