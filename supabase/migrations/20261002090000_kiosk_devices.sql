-- Registered kiosk browsers. Only a browser holding a device cookie whose
-- token hashes to an active row may open the punch page or punch. Rows are
-- never deleted: revoking sets revoked_at, and punches keep their device_id.

create table public.kiosk_devices (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(btrim(name)) between 1 and 60),
  token_hash          text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),  -- sha256 hex of the cookie token
  device_label        text check (char_length(device_label) <= 120),  -- e.g. "Android tablet · Samsung SM-X115"
  browser_label       text check (char_length(browser_label) <= 60),  -- e.g. "Chrome 141"
  screen              text check (char_length(screen) <= 20),         -- e.g. "1340 × 800"
  user_agent          text check (char_length(user_agent) <= 512),
  registered_by       uuid,                                           -- auth.users id (not a FK: users can be deleted)
  registered_by_name  text check (char_length(registered_by_name) <= 120),
  created_at          timestamptz not null default now(),
  last_seen_at        timestamptz,
  last_ip             inet,
  last_city           text check (char_length(last_city) <= 100),
  revoked_at          timestamptz,
  revoked_by_name     text check (char_length(revoked_by_name) <= 120)
);

-- Deny-all for browser keys; the server uses the secret key.
alter table public.kiosk_devices enable row level security;

-- Which registered browser made a kiosk punch. Null for manual punches and
-- for punches made before this migration.
alter table public.punches
  add column device_id uuid references public.kiosk_devices (id) on delete restrict;

create index punches_device_id_idx on public.punches (device_id) where device_id is not null;

-- record_punch gains p_device_id; the checks and the lock are unchanged.
drop function public.record_punch(uuid, uuid, public.punch_type, text, text, text, inet, text, text, text, numeric, numeric);

create function public.record_punch(
  p_id uuid, p_staff_id uuid, p_type public.punch_type, p_photo_path text, p_user_agent text, p_timezone text,
  p_ip inet, p_city text, p_region text, p_country text, p_latitude numeric, p_longitude numeric,
  p_device_id uuid default null  -- default keeps the already-deployed app (12 args) working until it ships
) returns timestamptz
language plpgsql set search_path = '' as $$
declare
  last_type public.punch_type;
  last_at   timestamptz;
  allowed   public.punch_type;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_staff_id::text, 0));

  select type, punched_at into last_type, last_at
  from public.punches
  where staff_id = p_staff_id and voided_at is null
  order by punched_at desc limit 1;

  if last_at is not null and now() - last_at < interval '60 seconds' then
    raise exception 'double_tap';
  end if;

  -- Only one IN per shop date (an overnight shift's IN belongs to the day it started).
  if p_type = 'in' and exists (
    select 1 from public.punches
    where staff_id = p_staff_id and type = 'in' and voided_at is null
      and (punched_at at time zone p_timezone)::date = (now() at time zone p_timezone)::date
  ) then
    raise exception 'in_today';
  end if;

  -- An IN older than 16h is a forgotten OUT: the person counts as clocked out.
  allowed := case
    when last_type is null or last_type = 'out' or now() - last_at > interval '16 hours' then 'in'
    else 'out'
  end;
  if p_type <> allowed then
    raise exception '%', case when p_type = 'in' then 'already_in' else 'not_in' end;
  end if;

  insert into public.punches (
    id, staff_id, type, photo_path, user_agent,
    ip_address, geo_city, geo_region, geo_country, geo_latitude, geo_longitude,
    device_id
  )
  values (
    p_id, p_staff_id, p_type, p_photo_path, left(p_user_agent, 512),
    p_ip, left(p_city, 100), left(p_region, 100), left(p_country, 2), p_latitude, p_longitude,
    p_device_id
  )
  returning punched_at into last_at;
  return last_at;
end $$;

-- Only the server (secret key → service_role) may call it.
revoke execute on function public.record_punch(uuid, uuid, public.punch_type, text, text, text, inet, text, text, text, numeric, numeric, uuid) from public, anon, authenticated;
grant  execute on function public.record_punch(uuid, uuid, public.punch_type, text, text, text, inet, text, text, text, numeric, numeric, uuid) to service_role;
