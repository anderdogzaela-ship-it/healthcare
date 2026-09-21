import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/get-locale';
import { messages } from '@/lib/i18n/messages';
import LegalPage from '@/components/legal/LegalPage';

export function generateMetadata(): Metadata {
  const { terms } = messages[getLocale()].legal;
  return { title: terms.metaTitle, description: terms.intro };
}

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
