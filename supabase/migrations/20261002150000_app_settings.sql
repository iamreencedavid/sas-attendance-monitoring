-- Shop-wide settings, edited on /admin/settings. Exactly one row (id = true);
-- new settings become new columns on it.

create table public.app_settings (
  id               boolean primary key default true check (id),
  -- Minutes after shift start before an IN counts as late. Not applied to
  -- the Late calculation yet.
  grace_minutes    smallint not null default 0 check (grace_minutes between 0 and 60),
  updated_at       timestamptz,
  updated_by_name  text check (char_length(updated_by_name) <= 120)
);

insert into public.app_settings (id) values (true);

-- Deny-all for browser keys; the server uses the secret key.
alter table public.app_settings enable row level security;
