-- Staff invitations.
--
-- The invitation link carries a random token; only its hash is stored, so the
-- table cannot be used to forge a link. Accepting is done server-side after
-- checking the hash, the expiry and the signed-in user's email.

create table public.clinic_invitations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  email text not null,
  role public.clinic_role not null default 'professional',
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index clinic_invitations_clinic_idx on public.clinic_invitations (clinic_id, created_at desc);
create index clinic_invitations_email_idx on public.clinic_invitations (lower(email));

alter table public.clinic_invitations enable row level security;

-- Owners manage invitations; the accept step runs with the service role, so no
-- policy is needed for the person being invited.
create policy "owners manage invitations" on public.clinic_invitations
  for all to authenticated
  using (public.clinic_role_of(clinic_id) = 'owner')
  with check (public.clinic_role_of(clinic_id) = 'owner');

grant select, insert, update, delete on public.clinic_invitations to authenticated;
