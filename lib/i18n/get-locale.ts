import { cookies, headers } from 'next/headers';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config';

// Server-side locale resolution: explicit choice (cookie) first, then the
// browser's Accept-Language preference, then the default.
export function getLocale(): Locale {
  const fromCookie = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const acceptLanguage = headers().get('accept-language') ?? '';
  for (const entry of acceptLanguage.split(',')) {
    const base = entry.split(';')[0].trim().split('-')[0].toLowerCase();
    if (isLocale(base)) return base;
  }

  return defaultLocale;
}
