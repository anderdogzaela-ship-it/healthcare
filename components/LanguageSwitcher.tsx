'use client';

import { Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, m } = useI18n();

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{m.common.language}</span>
      <Globe className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
      >
        {locales.map((l) => (
          <option key={l} value={l}>{localeNames[l]}</option>
        ))}
      </select>
    </label>
  );
}
