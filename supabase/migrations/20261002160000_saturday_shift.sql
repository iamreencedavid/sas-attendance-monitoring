-- Optional Saturday shift per staff member: both times null = same as the
-- weekday shift; saturday_off = not scheduled on Saturdays.

alter table public.staff
  add column saturday_start time,
  add column saturday_end   time,
  add column saturday_off   boolean not null default false,
  add constraint staff_saturday_pair      check ((saturday_start is null) = (saturday_end is null)),
  add constraint staff_saturday_not_empty check (saturday_start <> saturday_end),
  add constraint staff_saturday_off_only  check (not (saturday_off and saturday_start is not null));

-- Copy the shift that applies on the punch's own shop date: the Saturday
-- shift when the punch falls on a Saturday and one is set, otherwise the
-- weekday shift (also for staff who are off on Saturday but punch anyway).
-- Using the punch's date means a manual punch added later for a past
-- Saturday still gets that day's shift. Asia/Manila is SHOP_TIMEZONE's default.
-- Past punches are not rewritten.
create or replace function public.punches_copy_shift() returns trigger
language plpgsql set search_path = '' as $$
declare
  s public.staff%rowtype;
begin
  select * into s from public.staff where id = new.staff_id;
  if extract(isodow from new.punched_at at time zone 'Asia/Manila') = 6 and s.saturday_start is not null then
    new.shift_start := s.saturday_start;
    new.shift_end   := s.saturday_end;
  else
    new.shift_start := s.shift_start;
    new.shift_end   := s.shift_end;
  end if;
  return new;
end $$;
