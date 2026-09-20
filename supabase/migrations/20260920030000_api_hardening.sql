-- Rate limiting for the public API, and retries for webhook deliveries.

-- ------------------------------------------------------ rate limiting ----

-- One row per key per time window. Rows are disposable; old windows can be
-- deleted at any time without affecting correctness.
create table public.api_rate_limits (
  key_id uuid not null references public.api_keys (id) on delete cascade,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key_id, window_start)
);

create index api_rate_limits_window_idx on public.api_rate_limits (window_start);

-- Atomic "count this request and tell me whether it is still allowed".
-- Doing it in one statement is what makes two simultaneous requests unable to
-- both slip past the limit.
create or replace function public.consume_rate_limit(
  p_key_id uuid,
  p_window_seconds integer,
  p_max integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.api_rate_limits (key_id, window_start, count)
  values (p_key_id, v_window, 1)
  on conflict (key_id, window_start)
    do update set count = public.api_rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

revoke execute on function public.consume_rate_limit(uuid, integer, integer) from public, anon, authenticated;

alter table public.api_rate_limits enable row level security;
-- No policy: only the service role touches this table.

-- --------------------------------------------------- webhook retries ----

alter table public.webhook_deliveries
  -- Kept so a failed delivery can be replayed exactly as it was first sent.
  add column payload jsonb not null default '{}'::jsonb,
  add column attempts integer not null default 0,
  add column next_attempt_at timestamptz;

create index webhook_deliveries_retry_idx
  on public.webhook_deliveries (status, next_attempt_at)
  where status = 'failed';
