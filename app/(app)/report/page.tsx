import { createClient, requireUser } from '@/lib/supabase/server';
import { localDate } from '@/lib/data/health';
import { getWeeklyReport } from '@/lib/data/weekly-report';
import { emailConfigured } from '@/lib/email/send';
import ReportView from '@/components/report/ReportView';

export default async function ReportPage() {
  const user = await requireUser();
  const supabase = createClient();

  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single();
  const report = await getWeeklyReport(supabase, user.id, localDate(profile?.timezone ?? 'UTC'));

  return <ReportView report={report} canEmail={emailConfigured() && Boolean(user.email)} />;
}
