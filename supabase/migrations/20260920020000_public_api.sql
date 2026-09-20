-- Public API: per-clinic API keys and outbound webhooks.
--
-- Keys are stored only as a SHA-256 hash, so a database leak does not hand
-- anyone a working credential. The plaintext key is shown once, at creation.

create type public.webhook_status as enum ('pending', 'delivered', 'failed');

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null default '',
  -- First characters of the key, shown in the UI so a key can be recognised.
  prefix text not null,
  key_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index api_keys_clinic_idx on public.api_keys (clinic_id, created_at desc);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  url text not null check (url ~* '^https?://'),
  -- Used to sign deliveries so the receiver can verify they came from us.
  secret text not null,
  events text[] not null default array['patient.created', 'appointment.created', 'appointment.confirmed', 'appointment.cancelled'],
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index webhook_endpoints_clinic_idx on public.webhook_endpoints (clinic_id);

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  event_type text not null,
  status public.webhook_status not null default 'pending',
  response_code integer,
  error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index webhook_deliveries_clinic_idx on public.webhook_deliveries (clinic_id, created_at desc);

-- -------------------------------------------------- row level security ----

alter table public.api_keys enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;

-- Only owners handle credentials; other staff do not need to see them.
create policy "owners manage api keys" on public.api_keys
  for all to authenticated
  using (public.clinic_role_of(clinic_id) = 'owner')
  with check (public.clinic_role_of(clinic_id) = 'owner');

create policy "owners manage webhooks" on public.webhook_endpoints
  for all to authenticated
  using (public.clinic_role_of(clinic_id) = 'owner')
  with check (public.clinic_role_of(clinic_id) = 'owner');

create policy "members read deliveries" on public.webhook_deliveries
  for select to authenticated
  using (public.is_clinic_member(clinic_id));

grant select, insert, update, delete on all tables in schema public to authenticated;
