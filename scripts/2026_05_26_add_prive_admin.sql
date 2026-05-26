-- 2026-05-26 — Add admin@prive-app.club to the admin allowlist
--
-- Two-place admin gating in Privé:
--   1. Client (src/App.tsx) — UI gating (Moderation Center tab, admin
--      buttons). Updated in the same commit as this migration.
--   2. Server (this file) — RLS gating via the is_admin() SQL function.
--      The function is consulted by RLS policies on safety_reports,
--      profile activation, crash reports, etc.
--
-- This migration replaces is_admin() to add admin@prive-app.club to the
-- existing allowlist (viomediere@gmail.com, viorelbox1@gmail.com).
-- Existing admin accounts keep their rights.
--
-- Idempotent — uses create or replace function.

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
  return lower(v_email) in (
    'viomediere@gmail.com',
    'viorelbox1@gmail.com',
    'admin@prive-app.club'
  );
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
