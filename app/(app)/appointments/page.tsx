import { createClient, requireUser } from '@/lib/supabase/server';
import AppointmentsView, { type AppointmentItem } from '@/components/appointments/AppointmentsView';

export default async function AppointmentsPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: appointments }, { data: reminders }, { data: profile }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, starts_at, duration_min, professional, location, reason, status')
      .eq('user_id', user.id)
      .order('starts_at', { ascending: false })
      .limit(50),
    supabase
      .from('reminder_jobs')
      .select('id, appointment_id, kind, status, send_at')
      .eq('user_id', user.id),
    supabase.from('profiles').select('phone').eq('id', user.id).single(),
  ]);

  const remindersByAppointment = new Map<string, AppointmentItem['reminders']>();
  for (const reminder of reminders ?? []) {
    const list = remindersByAppointment.get(reminder.appointment_id) ?? [];
    list.push({ id: reminder.id, kind: reminder.kind, status: reminder.status, sendAt: reminder.send_at });
    remindersByAppointment.set(reminder.appointment_id, list);
  }

  const items: AppointmentItem[] = (appointments ?? []).map((row) => ({
    id: row.id,
    startsAt: row.starts_at,
    durationMin: row.duration_min,
    professional: row.professional,
    location: row.location,
    reason: row.reason,
    status: row.status,
    reminders: (remindersByAppointment.get(row.id) ?? []).sort((a, b) => a.sendAt.localeCompare(b.sendAt)),
  }));

  const now = Date.now();
  const upcoming = items
    .filter((item) => new Date(item.startsAt).getTime() >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = items.filter((item) => new Date(item.startsAt).getTime() < now);

  return <AppointmentsView upcoming={upcoming} past={past} hasPhone={Boolean(profile?.phone)} />;
}
