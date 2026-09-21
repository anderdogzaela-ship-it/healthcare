-- Three fixes found when the schema was first applied to a live project.

-- 1. Accounts created before this schema existed have no profile, settings or
--    goals, because the trigger only fires on new sign-ups. Backfill them.
insert into public.profiles (id, full_name, locale)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  coalesce((u.raw_user_meta_data ->> 'locale')::public.app_locale, 'en')
from auth.users u
on conflict (id) do nothing;

insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.goals (user_id, metric, target)
select u.id, defaults.metric, defaults.target
from auth.users u
cross join (
  values
    ('steps'::public.goal_metric, 7500),
    ('sleep_hours'::public.goal_metric, 8),
    ('water_glasses'::public.goal_metric, 8)
) as defaults(metric, target)
on conflict (user_id, metric, effective_from) do nothing;

-- 2. Creating a clinic could not add its own owner.
--
--    The roster policy checked `exists (select 1 from clinics ...)`, but that
--    subquery runs under the clinics select policy, which requires membership
--    — the very row being inserted. A creator could therefore never become a
--    member: a chicken and egg that only shows up against a real database.
--
--    The membership is now created by a trigger that runs as the definer, so
--    the application never inserts it and the policy no longer has to allow
--    that case.
create or replace function public.handle_new_clinic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clinic_members (clinic_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (clinic_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_clinic_created
  after insert on public.clinics
  for each row execute function public.handle_new_clinic();

-- The creator can read their clinic even in the instant before the membership
-- row exists.
drop policy if exists "members read their clinic" on public.clinics;
create policy "members read their clinic" on public.clinics
  for select to authenticated
  using (public.is_clinic_member(id) or created_by = auth.uid());

-- 3. Saving settings used UPDATE, which silently changes nothing when the row
--    is missing. The application now upserts; these unique constraints are
--    what makes that safe.
--    (profiles.id and user_settings.user_id are already primary keys, so
--    nothing to add here — this comment records the reasoning.)
