import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedAutomation } from '@/lib/automation/auth';
import { localDate } from '@/lib/data/health';
import { getWeeklyReport } from '@/lib/data/weekly-report';
import { emailConfigured, sendEmail } from '@/lib/email/send';
import { weeklyReportEmail } from '@/lib/email/weekly-report';
import { siteUrl } from '@/lib/supabase/env';
import { isLocale } from '@/lib/i18n/config';

export const runtime = 'nodejs';
// One email at a time keeps within Resend's rate limit; give the run room.
export const maxDuration = 60;

/** A cap per run, so a large user base cannot outlast the function's time limit. */
const MAX_PER_RUN = 100;

/**
 * Emails the weekly report to everyone who has it turned on in Settings.
 *
 * Vercel Cron calls this every Monday with `Authorization: Bearer
 * $CRON_SECRET`; the automation key also works, so n8n can drive it instead.
 * Nothing is sent for a week with no records, and nothing at all when email
 * is not configured.
 */
function authorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;
  return isAuthorizedAutomation(request);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!emailConfigured()) return Response.json({ ok: true, skipped: 'email_not_configured' });

  const admin = createAdminClient();
  const { data: subscribers, error } = await admin
    .from('user_settings')
    .select('user_id')
    .eq('weekly_report', true)
    .limit(MAX_PER_RUN);

  if (error) {
    console.error('weekly report: could not list subscribers', error.message);
    return Response.json({ error: 'failed' }, { status: 500 });
  }

  const summary = { sent: 0, skippedNoData: 0, skippedNoEmail: 0, failed: 0 };

  for (const { user_id: userId } of subscribers ?? []) {
    const [{ data: account }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from('profiles').select('full_name, timezone, locale').eq('id', userId).maybeSingle(),
    ]);

    const email = account?.user?.email;
    if (!email) {
      summary.skippedNoEmail += 1;
      continue;
    }

    // The admin client bypasses row level security; getWeeklyReport filters
    // every query by this user id.
    const report = await getWeeklyReport(admin, userId, localDate(profile?.timezone ?? 'UTC'));
    if (!report.hasData) {
      summary.skippedNoData += 1;
      continue;
    }

    const result = await sendEmail(
      weeklyReportEmail(report, {
        locale: isLocale(profile?.locale) ? profile.locale : 'en',
        name: (profile?.full_name ?? '').split(' ')[0],
        to: email,
        reportUrl: `${siteUrl()}/report`,
      })
    );
    if (result.ok) summary.sent += 1;
    else summary.failed += 1;
  }

  return Response.json({ ok: true, ...summary });
}
