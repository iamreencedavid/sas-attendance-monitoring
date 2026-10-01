-- Where a kiosk punch came from (IP + approximate city from the host's IP
-- geolocation). Record only: it never blocks a punch. Null for manual punches
-- and for punches made before this migration.

alter table public.punches
  add column ip_address    inet,
  add column geo_city      text check (char_length(geo_city) <= 100),
  add column geo_region    text check (char_length(geo_region) <= 100),
  add column geo_country   text check (char_length(geo_country) <= 2),   -- ISO code, e.g. PH
  add column geo_latitude  numeric(8,5) check (geo_latitude between -90 and 90),
  add column geo_longitude numeric(8,5) check (geo_longitude between -180 and 180);

-- record_punch gains the location arguments; the checks and the lock are unchanged.
drop function public.record_punch(uuid, uuid, public.punch_type, text, text, text);

create function public.record_punch(
  p_id uuid, p_staff_id uuid, p_type public.punch_type, p_photo_path text, p_user_agent text, p_timezone text,
  p_ip inet, p_city text, p_region text, p_country text, p_latitude numeric, p_longitude numeric
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
    ip_address, geo_city, geo_region, geo_country, geo_latitude, geo_longitude
  )
  values (
    p_id, p_staff_id, p_type, p_photo_path, left(p_user_agent, 512),
    p_ip, left(p_city, 100), left(p_region, 100), left(p_country, 2), p_latitude, p_longitude
  )
  returning punched_at into last_at;
  return last_at;
end $$;

-- Only the server (secret key → service_role) may call it.
revoke execute on function public.record_punch(uuid, uuid, public.punch_type, text, text, text, inet, text, text, text, numeric, numeric) from public, anon, authenticated;
grant  execute on function public.record_punch(uuid, uuid, public.punch_type, text, text, text, inet, text, text, text, numeric, numeric) to service_role;
