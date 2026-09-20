import { retryFailedDeliveries } from '@/lib/api/webhooks';
import { isAuthorizedAutomation } from '@/lib/automation/auth';

export const runtime = 'nodejs';

/**
 * Retries webhook deliveries that failed and are due.
 *
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`; the
 * automation key also works, so the same job can be driven from n8n if you
 * would rather not use Vercel Cron.
 */
function authorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;
  return isAuthorizedAutomation(request);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const summary = await retryFailedDeliveries();
  return Response.json({ ok: true, ...summary });
}
