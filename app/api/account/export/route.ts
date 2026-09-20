import { createClient, getUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/account/export — everything this account holds, as one JSON file.
 *
 * Required by the LGPD and the GDPR (right of access and portability), and
 * useful on its own: a user who can take their data with them trusts the
 * product more. Every query runs under the user's own session, so row level
 * security guarantees the file contains their data and nobody else's.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = createClient();

  const [
    profile, settings, consents, goals, dailyLogs, measurements,
    sleep, activity, symptoms, appointments, conversations, chatMessages,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('consents').select('*').eq('user_id', user.id),
    supabase.from('goals').select('*').eq('user_id', user.id),
    supabase.from('daily_logs').select('*').eq('user_id', user.id),
    supabase.from('measurements').select('*').eq('user_id', user.id),
    supabase.from('sleep_sessions').select('*').eq('user_id', user.id),
    supabase.from('activity_sessions').select('*').eq('user_id', user.id),
    supabase.from('symptom_entries').select('*').eq('user_id', user.id),
    supabase.from('appointments').select('*').eq('user_id', user.id),
    supabase.from('conversations').select('*').eq('user_id', user.id),
    supabase.from('messages').select('*').eq('user_id', user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data,
    settings: settings.data,
    consents: consents.data ?? [],
    goals: goals.data ?? [],
    health_logs: dailyLogs.data ?? [],
    measurements: measurements.data ?? [],
    sleep_sessions: sleep.data ?? [],
    activity_sessions: activity.data ?? [],
    symptoms: symptoms.data ?? [],
    appointments: appointments.data ?? [],
    conversations: conversations.data ?? [],
    assistant_messages: chatMessages.data ?? [],
  };

  const filename = `healthai-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
