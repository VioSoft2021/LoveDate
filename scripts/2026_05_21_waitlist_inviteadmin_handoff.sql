-- 2026-05-21 waitlist — hand approval off to the InviteAdmin app
--
-- The original 2026_05_21_waitlist.sql generated invite codes inside the
-- admin_approve_waitlist RPC. Master's call: invite codes should be
-- generated ONLY by the LoveDateInviteAdmin app (where the sophisticated
-- cryptographic formatter + audit log already lives). So:
--
--   - admin_approve_waitlist is rewritten to ACCEPT a pre-generated code
--     instead of creating one. It just marks the waitlist row approved
--     and stores the code reference for traceability.
--   - InviteAdmin queries pending waitlist entries via admin_list_waitlist
--     (unchanged), generates a code using its existing create-invite-code
--     Edge Function with label = requester's email + note, then calls
--     admin_approve_waitlist(id, code) to link the two.
--
-- The previous version of admin_approve_waitlist(p_id uuid) is dropped.
-- The new signature is admin_approve_waitlist(p_id uuid, p_invite_code text).
--
-- Idempotent.

set search_path = public;

-- Drop the old single-arg version (the one that auto-generated codes).
drop function if exists public.admin_approve_waitlist(uuid);

-- New two-arg version: accepts an externally-generated code.
create or replace function public.admin_approve_waitlist(
  p_id uuid,
  p_invite_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  if p_invite_code is null or length(trim(p_invite_code)) = 0 then
    raise exception 'invite code is required' using errcode = '22023';
  end if;

  -- Verify the code exists in beta_invites (InviteAdmin should have
  -- created it just before this call). If it doesn't, we refuse —
  -- otherwise the waitlist row would point at a non-existent invite.
  if not exists (select 1 from public.beta_invites where code = trim(p_invite_code)) then
    raise exception 'invite code % not found in beta_invites — generate it first',
      p_invite_code
      using errcode = 'P0002';
  end if;

  select status into v_status from public.waitlist where id = p_id for update;
  if v_status is null then
    raise exception 'waitlist entry not found' using errcode = 'P0002';
  end if;
  if v_status <> 'pending' then
    raise exception 'waitlist entry is not pending (status: %)', v_status
      using errcode = '42P01';
  end if;

  update public.waitlist
     set status = 'approved',
         invite_code = trim(p_invite_code),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_id;

  return true;
end;
$$;

revoke all on function public.admin_approve_waitlist(uuid, text) from public;
grant execute on function public.admin_approve_waitlist(uuid, text) to authenticated;
