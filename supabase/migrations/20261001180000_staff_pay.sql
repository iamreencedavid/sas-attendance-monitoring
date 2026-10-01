-- Pay rates on staff: current rate only, optional until the owner fills them in.
alter table public.staff
  add column daily_rate    numeric(10,2) check (daily_rate >= 0),    -- basic pay per day, ₱
  add column overtime_rate numeric(10,2) check (overtime_rate >= 0); -- overtime pay per hour, ₱
