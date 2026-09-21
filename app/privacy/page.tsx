import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/get-locale';
import { messages } from '@/lib/i18n/messages';
import LegalPage from '@/components/legal/LegalPage';

export function generateMetadata(): Metadata {
  const { privacy } = messages[getLocale()].legal;
  return { title: privacy.metaTitle, description: privacy.intro };
}

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}
