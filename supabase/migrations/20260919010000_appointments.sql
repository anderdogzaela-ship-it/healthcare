-- Appointments, the reminder queue that drives the WhatsApp automation, and an
-- event log of every message sent or received.
--
-- Reminder jobs are a plain table used as a queue: an external scheduler (n8n)
-- asks for the jobs that are due, sends them, and reports back. Keeping the
-- queue in Postgres means every reminder is auditable next to the appointment
-- it belongs to.

create type public.appointment_status as enum ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show');
create type public.reminder_kind as enum ('24h', '2h', 'follow_up');
create type public.reminder_status as enum ('pending', 'sent', 'failed', 'skipped');
create type public.automation_channel as enum ('whatsapp', 'email', 'sms');
create type public.automation_direction as enum ('outbound', 'inbound');

-- WhatsApp needs a phone number to reach the user.
alter table public.profiles
  add column phone text,
  add column phone_verified boolean not null default false;

-- One account per number, so inbound messages map to exactly one user.
create unique index profiles_phone_key on public.profiles (phone) where phone is not null;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  starts_at timestamptz not null,
  duration_min integer not null default 30 check (duration_min between 5 and 480),
  professional text not null default '',
  location text,
  reason text,
  status public.appointment_status not null default 'scheduled',
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_user_starts_idx on public.appointments (user_id, starts_at desc);
create index appointments_upcoming_idx on public.appointments (starts_at) where status in ('scheduled', 'confirmed');

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create table public.reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.reminder_kind not null,
  channel public.automation_channel not null default 'whatsapp',
  send_at timestamptz not null,
  status public.reminder_status not null default 'pending',
  attempts integer not null default 0,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  -- One reminder of each kind per appointment, so re-scheduling cannot
  -- produce duplicate messages.
  unique (appointment_id, kind)
);

-- The query the scheduler runs every few minutes.
create index reminder_jobs_due_idx on public.reminder_jobs (status, send_at);

create table public.automation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  direction public.automation_direction not null,
  channel public.automation_channel not null default 'whatsapp',
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index automation_events_user_idx on public.automation_events (user_id, created_at desc);

-- -------------------------------------------------- row level security ----

alter table public.appointments enable row level security;
alter table public.reminder_jobs enable row level security;
alter table public.automation_events enable row level security;

create policy "own appointments" on public.appointments
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own reminder jobs" on public.reminder_jobs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Read-only for the user: automation events are written server-side by the
-- integration routes, which use the service role.
create policy "own automation events" on public.automation_events
  for select to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on all tables in schema public to authenticated;
