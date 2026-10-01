-- Punches (PRD §8.1): one row per IN or OUT. Never deleted; mistakes are voided.

create type public.punch_type   as enum ('in', 'out');
create type public.punch_source as enum ('kiosk', 'manual');

create table public.punches (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references public.staff(id) on delete restrict, -- history is kept; staff are deactivated, not deleted
  type            public.punch_type not null,
  punched_at      timestamptz not null default now(),   -- DB clock, never the browser's
  shift_start     time not null,                         -- copied from staff at insert (trigger below)
  shift_end       time not null,
  photo_path      text,                                  -- {staffId}/{yyyy-mm-dd}/{punchId}.jpg; null when manual or purged
  photo_purged_at timestamptz,                           -- set by the 90-day retention job (later)
  source          public.punch_source not null default 'kiosk',
  user_agent      text check (char_length(user_agent) <= 512),
  note            text check (char_length(btrim(note)) between 1 and 300),
  voided_at       timestamptz,                           -- null = counts toward hours
  void_reason     text check (char_length(btrim(void_reason)) between 1 and 300),
  created_at      timestamptz not null default now(),

  constraint punches_photo_required check (source = 'manual' or photo_path is not null or photo_purged_at is not null),
  constraint punches_manual_note    check (source = 'kiosk' or note is not null),
  constraint punches_void_reason    check ((voided_at is null) = (void_reason is null))
);

create index punches_staff_time on public.punches (staff_id, punched_at desc);
create index punches_time       on public.punches (punched_at desc);

-- Copy the staff member's current shift onto every new punch (kiosk or manual).
create function public.punches_copy_shift() returns trigger
language plpgsql set search_path = '' as $$
begin
  select s.shift_start, s.shift_end into new.shift_start, new.shift_end
  from public.staff s where s.id = new.staff_id;
  return new;
end $$;

create trigger punches_copy_shift before insert on public.punches
  for each row execute function public.punches_copy_shift();

-- Kiosk punch, PRD §8.3 steps 4 and 6: re-check state and insert in one transaction,
-- serialised per staff member so a double tap can't create two rows.
create function public.record_punch(
  p_id uuid, p_staff_id uuid, p_type public.punch_type, p_photo_path text, p_user_agent text
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
revoke execute on function public.record_punch(uuid, uuid, public.punch_type, text, text) from public, anon, authenticated;
grant  execute on function public.record_punch(uuid, uuid, public.punch_type, text, text) to service_role;

-- Deny-all for browser keys; the server uses the secret key.
alter table public.punches enable row level security;

-- Private photo bucket: JPEG only, ≤ 500 KB, no public access (signed URLs only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('punch-photos', 'punch-photos', false, 512000, array['image/jpeg'])
on conflict (id) do nothing;
