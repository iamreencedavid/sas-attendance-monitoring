-- One punch IN per shop calendar date. After IN and OUT, the person is done
-- for the day; a voided punch never counts. Replaces record_punch with an
-- extra p_timezone argument (the server passes SHOP_TIMEZONE).

drop function public.record_punch(uuid, uuid, public.punch_type, text, text);

create function public.record_punch(
  p_id uuid, p_staff_id uuid, p_type public.punch_type, p_photo_path text, p_user_agent text, p_timezone text
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

  insert into public.punches (id, staff_id, type, photo_path, user_agent)
  values (p_id, p_staff_id, p_type, p_photo_path, left(p_user_agent, 512))
  returning punched_at into last_at;
  return last_at;
end $$;

-- Only the server (secret key → service_role) may call it.
revoke execute on function public.record_punch(uuid, uuid, public.punch_type, text, text, text) from public, anon, authenticated;
grant  execute on function public.record_punch(uuid, uuid, public.punch_type, text, text, text) to service_role;
