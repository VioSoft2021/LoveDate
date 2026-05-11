-- LoveDate beta_invites RLS lockdown.
-- Run once after supabase_beta_setup.sql. Idempotent — safe to re-run.
--
-- Reason: the previous policy "beta_invites_read_active" allowed anon
-- SELECT on the table, which let anyone with the public anon key dump
-- every active invite code. Replace with a SECURITY DEFINER function
-- that only answers a yes/no for a single supplied code.

drop policy if exists "beta_invites_read_active" on public.beta_invites;
drop policy if exists "invites_select_valid" on public.beta_invites;

create or replace function public.validate_beta_invite(p_code text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.beta_invites
    where code = p_code
      and active = true
      and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.validate_beta_invite(text) from public;
grant execute on function public.validate_beta_invite(text) to anon, authenticated;
