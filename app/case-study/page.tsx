import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/get-locale';
import { messages } from '@/lib/i18n/messages';
import CaseStudy from '@/components/case-study/CaseStudy';

export function generateMetadata(): Metadata {
  const { caseStudy } = messages[getLocale()];
  return { title: caseStudy.metaTitle, description: caseStudy.metaDescription };
}

export default function CaseStudyPage() {
  return <CaseStudy />;
}
