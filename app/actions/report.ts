'use server';

import { createClient, requireUser } from '@/lib/supabase/server';
import { localDate } from '@/lib/data/health';
import { getWeeklyReport } from '@/lib/data/weekly-report';
import { emailConfigured, sendEmail } from '@/lib/email/send';
import { weeklyReportEmail } from '@/lib/email/weekly-report';
import { siteUrl } from '@/lib/supabase/env';
import { isLocale } from '@/lib/i18n/config';

export type SendReportResult =
  | { status: 'sent'; email: string }
  | { status: 'error'; reason: 'not_configured' | 'no_email' | 'failed' };

/** Emails the signed-in user their own weekly report, right now. */
export async function sendMyWeeklyReport(): Promise<SendReportResult> {
  const user = await requireUser();
  if (!emailConfigured()) return { status: 'error', reason: 'not_configured' };
  if (!user.email) return { status: 'error', reason: 'no_email' };

  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, timezone, locale')
    .eq('id', user.id)
    .single();

  const report = await getWeeklyReport(supabase, user.id, localDate(profile?.timezone ?? 'UTC'));
  const locale = isLocale(profile?.locale) ? profile.locale : 'en';

  const result = await sendEmail(
    weeklyReportEmail(report, {
      locale,
      name: (profile?.full_name ?? '').split(' ')[0],
      to: user.email,
      reportUrl: `${siteUrl()}/report`,
    })
  );

  return result.ok ? { status: 'sent', email: user.email } : { status: 'error', reason: 'failed' };
}
