-- Subscriptions.
--
-- Stripe owns the billing state; this table is a local mirror so the app can
-- check a clinic's plan without calling Stripe on every request. Only the
-- webhook writes to it (through the service role), which is why there is no
-- insert or update policy for normal users.

create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'
);

create table public.subscriptions (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'starter',
  status public.subscription_status not null default 'trialing',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "members read their subscription" on public.subscriptions
  for select to authenticated
  using (public.is_clinic_member(clinic_id));

grant select on public.subscriptions to authenticated;
