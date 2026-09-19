'use client';

import { createContext, Fragment, useContext, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, localeTags, type Locale } from './config';
import type { Messages } from './messages';

type Params = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  m: Messages;
  /** Replaces {name} placeholders; numbers are formatted for the active locale. */
  fmt: (template: string, params?: Params) => string;
  /** Like fmt, but placeholders can be React nodes (links, bold text, …). */
  rich: (template: string, nodes: Record<string, ReactNode>) => ReactNode;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
  /** Short weekday name, Monday = 0. */
  weekdayShort: (dayIndex: number) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const router = useRouter();

  const value = useMemo<I18nContextValue>(() => {
    const tag = localeTags[locale];

    const formatNumber = (n: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(tag, options).format(n);

    const fmt = (template: string, params: Params = {}) =>
      template.replace(/\{(\w+)\}/g, (match, key: string) => {
        if (!(key in params)) return match;
        const param = params[key];
        return typeof param === 'number' ? formatNumber(param) : param;
      });

    const rich = (template: string, nodes: Record<string, ReactNode>) =>
      template.split(/(\{\w+\})/).map((part, i) => {
        const key = /^\{(\w+)\}$/.exec(part)?.[1];
        return <Fragment key={i}>{key && key in nodes ? nodes[key] : part}</Fragment>;
      });

    return {
      locale,
      m: messages,
      fmt,
      rich,
      formatNumber,
      formatDate: (date, options) => date.toLocaleDateString(tag, options),
      formatRelativeTime: (n, unit) =>
        new Intl.RelativeTimeFormat(tag, { numeric: 'always' }).format(n, unit),
      // 2024-01-01 was a Monday.
      weekdayShort: (dayIndex) =>
        new Date(Date.UTC(2024, 0, 1 + dayIndex)).toLocaleDateString(tag, {
          weekday: 'short',
          timeZone: 'UTC',
        }),
      setLocale: (next) => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        // Re-render server components so the root layout picks up the new cookie.
        router.refresh();
      },
    };
  }, [locale, messages, router]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
