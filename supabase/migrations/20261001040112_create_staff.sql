-- Staff who can punch in/out (PRD §8.1).

create type public.staff_role as enum ('barista', 'kitchen', 'supervisor');

create table public.staff (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(btrim(name)) between 1 and 60),
  role             public.staff_role not null,
  shift_start      time not null,          -- 24h, e.g. 06:00
  shift_end        time not null,          -- may be < start (overnight, e.g. 22:00–06:00)
  pin_hash         text not null,          -- bcrypt, never the raw PIN
  active           boolean not null default true,
  failed_pin_count int not null default 0 check (failed_pin_count >= 0),
  locked_until     timestamptz,
  created_at       timestamptz not null default now(),
  constraint staff_shift_not_empty check (shift_start <> shift_end)
);

-- Two active staff can't share a name (the punch page picks by name).
create unique index staff_active_name_key on public.staff (lower(btrim(name))) where active;

-- Deny-all for browser keys; the server uses the secret key.
alter table public.staff enable row level security;
