-- Permanently erases a staff member and ALL of their punches (kiosk, manual
-- and voided). This is the one exception to "punches are never deleted": the
-- owner's Delete staff button on /admin/staff. Returns the photo paths so the
-- server can remove the files from the punch-photos bucket afterwards.

create function public.delete_staff(p_staff_id uuid)
returns setof text
language plpgsql set search_path = '' as $$
declare
  paths text[];
begin
  -- Same lock as record_punch: a punch in flight either lands before this
  -- delete (and is erased with the rest) or waits and then fails its FK.
  perform pg_advisory_xact_lock(hashtextextended(p_staff_id::text, 0));

  if not exists (select 1 from public.staff where id = p_staff_id) then
    raise exception 'staff_not_found';
  end if;

  select coalesce(array_agg(distinct photo_path), '{}') into paths
  from public.punches
  where staff_id = p_staff_id and photo_path is not null;

  delete from public.punches where staff_id = p_staff_id;
  delete from public.staff where id = p_staff_id;

  return query select unnest(paths);
end $$;

-- Only the server (secret key → service_role) may call it.
revoke execute on function public.delete_staff(uuid) from public, anon, authenticated;
grant  execute on function public.delete_staff(uuid) to service_role;
