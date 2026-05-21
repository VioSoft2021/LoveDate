-- 2026-05-21 admin_set_profile_active — D5 from the discovery plan
--
-- During friend tests Master had multiple test accounts (Viorel + Viocanada)
-- showing up to the same friend, with no in-app way to deactivate one.
-- This RPC lets a moderation admin flip any profile's is_active flag, so
-- the profile disappears from everyone's deck immediately (the existing
-- getProfiles query filters by is_active = true).
--
-- Authorization: gated by the existing public.is_admin() function, which
-- checks the caller's auth.uid() is in public.admins. Non-admins get a
-- permission_denied exception that the client surfaces as an error toast.
--
-- Idempotent.

set search_path = public;

create or replace function public.admin_set_profile_active(
  p_profile_id bigint,
  p_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean;
begin
  if not public.is_admin() then
    raise exception 'permission denied: caller is not a moderation admin'
      using errcode = '42501';
  end if;

  update public.profiles
     set is_active = p_active
   where id = p_profile_id;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.admin_set_profile_active(bigint, boolean) from public;
grant execute on function public.admin_set_profile_active(bigint, boolean) to authenticated;
