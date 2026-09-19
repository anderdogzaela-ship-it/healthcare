import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { getLocale } from '@/lib/i18n/get-locale';
import { localeTags } from '@/lib/i18n/config';
import { messages } from '@/lib/i18n/messages';

export function generateMetadata(): Metadata {
  const { meta } = messages[getLocale()];
  return { title: meta.title, description: meta.description };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={localeTags[locale]}>
      <body>
        <I18nProvider locale={locale} messages={messages[locale]}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
