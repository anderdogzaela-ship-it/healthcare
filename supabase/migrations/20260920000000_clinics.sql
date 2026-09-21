-- Multi-tenant foundation: clinics, their staff, and their patients.
--
-- Until now every row belonged to one user. A clinic is a second kind of
-- owner: several staff accounts share the same patients. Access is decided by
-- membership, checked through a security-definer function so the policies do
-- not recurse when clinic_members itself is queried.

create type public.clinic_role as enum ('owner', 'professional', 'receptionist');
create type public.patient_status as enum ('lead', 'active', 'inactive', 'archived');

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  timezone text not null default 'UTC',
  locale public.app_locale not null default 'en',
  plan text not null default 'starter',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clinics_set_updated_at
  before update on public.clinics
  for each row execute function public.set_updated_at();

create table public.clinic_members (
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.clinic_role not null default 'professional',
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

create index clinic_members_user_idx on public.clinic_members (user_id);

-- Patients belong to a clinic. user_id links a patient to an app account when
-- they also use the patient portal; it stays null for records the clinic keeps
-- on someone who never signs in.
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null check (char_length(trim(full_name)) > 0),
  email text,
  phone text,
  date_of_birth date,
  locale public.app_locale not null default 'en',
  status public.patient_status not null default 'lead',
  notes text,
  last_visit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patients_clinic_idx on public.patients (clinic_id, status, full_name);
create index patients_phone_idx on public.patients (phone) where phone is not null;

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- Timeline entries a clinician writes about a patient.
create table public.patient_notes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index patient_notes_patient_idx on public.patient_notes (patient_id, created_at desc);

-- Appointments can now belong to a clinic and a patient. Both stay nullable,
-- so personal appointments keep working exactly as before.
alter table public.appointments
  add column clinic_id uuid references public.clinics (id) on delete cascade,
  add column patient_id uuid references public.patients (id) on delete cascade;

create index appointments_clinic_idx on public.appointments (clinic_id, starts_at desc);

-- A clinic appointment may be for a patient who has no app account, so the
-- owning user becomes optional; one of the two owners must still be present.
alter table public.appointments alter column user_id drop not null;
alter table public.appointments
  add constraint appointments_has_owner check (user_id is not null or clinic_id is not null);

-- Reminders follow the same rule and carry the patient they are addressed to.
alter table public.reminder_jobs alter column user_id drop not null;
alter table public.reminder_jobs
  add column patient_id uuid references public.patients (id) on delete cascade,
  add constraint reminder_jobs_has_recipient check (user_id is not null or patient_id is not null);

alter table public.automation_events
  add column patient_id uuid references public.patients (id) on delete set null;

-- ------------------------------------------------------- membership ----

-- Security definer: reads clinic_members with RLS bypassed, which is what
-- stops the membership policy from calling itself forever.
create or replace function public.is_clinic_member(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = target_clinic and user_id = auth.uid()
  );
$$;

create or replace function public.clinic_role_of(target_clinic uuid)
returns public.clinic_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.clinic_members
  where clinic_id = target_clinic and user_id = auth.uid();
$$;

-- -------------------------------------------------- row level security ----

alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.patients enable row level security;
alter table public.patient_notes enable row level security;

create policy "members read their clinic" on public.clinics
  for select to authenticated
  using (public.is_clinic_member(id));

create policy "anyone can create a clinic" on public.clinics
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "owners update their clinic" on public.clinics
  for update to authenticated
  using (public.clinic_role_of(id) = 'owner')
  with check (public.clinic_role_of(id) = 'owner');

create policy "members read the roster" on public.clinic_members
  for select to authenticated
  using (public.is_clinic_member(clinic_id));

-- The first membership is the creator making themselves owner; after that,
-- only owners may change the roster.
create policy "owners manage the roster" on public.clinic_members
  for all to authenticated
  using (public.clinic_role_of(clinic_id) = 'owner')
  with check (
    public.clinic_role_of(clinic_id) = 'owner'
    or (user_id = auth.uid() and exists (
      select 1 from public.clinics c where c.id = clinic_id and c.created_by = auth.uid()
    ))
  );

create policy "members manage patients" on public.patients
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

create policy "members manage patient notes" on public.patient_notes
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

-- Clinic staff also reach the appointments of their own clinic, on top of the
-- personal appointments each user already owns.
create policy "clinic staff manage clinic appointments" on public.appointments
  for all to authenticated
  using (clinic_id is not null and public.is_clinic_member(clinic_id))
  with check (clinic_id is not null and public.is_clinic_member(clinic_id));

-- Staff read the reminders of their clinic's appointments. Defined here,
-- after is_clinic_member exists: a policy's expression is resolved when the
-- policy is created, not when it runs.
create policy "clinic staff read clinic reminders" on public.reminder_jobs
  for select to authenticated
  using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and a.clinic_id is not null
        and public.is_clinic_member(a.clinic_id)
    )
  );

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_clinic_member(uuid) to authenticated;
grant execute on function public.clinic_role_of(uuid) to authenticated;
