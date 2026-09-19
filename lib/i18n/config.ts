export const locales = ['en', 'es', 'pt'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';
export const LOCALE_COOKIE = 'locale';

// BCP 47 tags used for <html lang> and all Intl formatting.
export const localeTags: Record<Locale, string> = {
  en: 'en-US',
  es: 'es',
  pt: 'pt-BR',
};

// Each language is listed in its own name so users can always find theirs.
export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

export function isLocale(value: string | undefined): value is Locale {
  return (locales as readonly string[]).includes(value ?? '');
}
