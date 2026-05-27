-- 2026-05-27 — Collapse admin allowlist to a single email
--
-- Master's directive (2026-05-27): use only admin@prive-app.club for
-- all admin operations going forward. The previous allowlist
-- (viomediere@gmail.com, viorelbox1@gmail.com, admin@prive-app.club)
-- existed because of the gradual rollout of the admin@ identity over
-- the past two days. Now that admin@ is fully wired across Privé,
-- InviteAdmin, the Edge Functions, and the recovery flow, the old
-- emails should no longer have admin privileges.
--
-- IMPORTANT — this does NOT delete the auth.users rows for those
-- emails. Their existing user data (profiles, swipes, messages, etc.)
-- is preserved; they just become regular users instead of admins.
-- Account deletion is a separate explicit decision.
--
-- Idempotent.

set search_path = public;

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return false;
  end if;
  return lower(v_email) = 'admin@prive-app.club';
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
