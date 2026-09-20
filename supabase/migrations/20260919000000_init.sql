-- HealthAI initial schema.
--
-- Every row belongs to a user. Row level security is enabled on all tables and
-- each policy compares auth.uid() with the owning user, so the database itself
-- prevents one account from reading another's health data.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums ----

create type public.unit_system as enum ('metric', 'imperial');
create type public.app_locale as enum ('en', 'es', 'pt');
create type public.measurement_metric as enum ('heart_rate', 'blood_pressure', 'weight');
create type public.goal_metric as enum ('steps', 'sleep_hours', 'water_glasses');
create type public.data_source as enum ('manual', 'fitbit', 'apple_health', 'health_connect');
create type public.message_role as enum ('user', 'ai');

-- ------------------------------------------------------------- helpers ----

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------ profiles ----

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  date_of_birth date,
  unit_system public.unit_system not null default 'metric',
  locale public.app_locale not null default 'en',
  timezone text not null default 'UTC',
  plan text not null default 'starter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reminders boolean not null default true,
  insights boolean not null default true,
  weekly_report boolean not null default true,
  achievements boolean not null default false,
  share_data boolean not null default false,
  analytics boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Consent records: health data is sensitive personal data under the LGPD and
-- the GDPR, so consent must be explicit, versioned and auditable.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null,
  version text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index consents_user_idx on public.consents (user_id, consent_type);

-- --------------------------------------------------------------- goals ----

-- Goals are versioned by effective_from so past days keep the goal that
-- applied at the time.
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  metric public.goal_metric not null,
  target numeric(10, 2) not null check (target > 0),
  effective_from date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, metric, effective_from)
);

create index goals_user_metric_idx on public.goals (user_id, metric, effective_from desc);

-- ---------------------------------------------------------- daily logs ----

create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  notes text,
  no_symptoms boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index daily_logs_user_date_idx on public.daily_logs (user_id, log_date desc);

create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row execute function public.set_updated_at();

-- Vitals. Blood pressure uses value (systolic) plus value_secondary
-- (diastolic) so a reading stays a single row.
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_log_id uuid references public.daily_logs (id) on delete cascade,
  metric public.measurement_metric not null,
  value numeric(8, 2) not null,
  value_secondary numeric(8, 2),
  unit text not null,
  recorded_at timestamptz not null default now(),
  source public.data_source not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create index measurements_user_metric_idx
  on public.measurements (user_id, metric, recorded_at desc);

create table public.sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_log_id uuid references public.daily_logs (id) on delete cascade,
  recorded_on date not null default current_date,
  hours numeric(4, 2) not null check (hours >= 0 and hours <= 24),
  quality smallint check (quality between 1 and 5),
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now()
);

create index sleep_sessions_user_date_idx
  on public.sleep_sessions (user_id, recorded_on desc);

create table public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_log_id uuid references public.daily_logs (id) on delete cascade,
  recorded_on date not null default current_date,
  exercise_type text not null default 'none',
  duration_min integer check (duration_min >= 0),
  steps integer check (steps >= 0),
  calories_kcal integer check (calories_kcal >= 0),
  distance_m integer check (distance_m >= 0),
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now()
);

create index activity_sessions_user_date_idx
  on public.activity_sessions (user_id, recorded_on desc);

create table public.symptom_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_log_id uuid not null references public.daily_logs (id) on delete cascade,
  symptom text not null,
  created_at timestamptz not null default now(),
  unique (daily_log_id, symptom)
);

-- ---------------------------------------------------- AI conversations ----

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_idx on public.conversations (user_id, updated_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.message_role not null,
  content text not null,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------- new user bootstrap ----

-- Creates the profile, default settings and starting goals the moment an
-- account is created, so the app never has to handle a user without a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'locale')::public.app_locale, 'en')
  );

  insert into public.user_settings (user_id) values (new.id);

  insert into public.goals (user_id, metric, target) values
    (new.id, 'steps', 7500),
    (new.id, 'sleep_hours', 8),
    (new.id, 'water_glasses', 8);

  -- Consent accepted on the sign-up form, passed as user metadata.
  if new.raw_user_meta_data ? 'consent_version' then
    insert into public.consents (user_id, consent_type, version)
    values (new.id, 'terms_privacy_health_data', new.raw_user_meta_data ->> 'consent_version');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------- row level security ----

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.consents enable row level security;
alter table public.goals enable row level security;
alter table public.daily_logs enable row level security;
alter table public.measurements enable row level security;
alter table public.sleep_sessions enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.symptom_entries enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- profiles and user_settings are keyed by the user id itself
create policy "own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "own settings" on public.user_settings
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- every other table carries user_id
create policy "own consents" on public.consents
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goals" on public.goals
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own daily logs" on public.daily_logs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own measurements" on public.measurements
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sleep sessions" on public.sleep_sessions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own activity sessions" on public.activity_sessions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own symptom entries" on public.symptom_entries
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own conversations" on public.conversations
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own messages" on public.messages
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Supabase grants these by default for tables created in public; repeated here
-- so the migration also works on a database without those defaults.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
