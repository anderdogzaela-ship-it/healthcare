-- API keys get a scope: 'read' keys may only call GET endpoints, 'write' keys
-- may also create, change and cancel. Existing keys keep full access, so no
-- integration that works today breaks.

alter table public.api_keys
  add column scope text not null default 'write'
  check (scope in ('read', 'write'));
