-- 2026-05-19 SECURITY DEFINER function for user-initiated account deletion
--
-- Apply after scripts/supabase_beta_setup.sql. Idempotent.
--
-- All user-owned tables already use `references auth.users (id) on delete
-- cascade`, so deleting the auth.users row removes everything downstream:
--   public.profiles            (cascades from auth_user_id)
--   public.profile_private     (cascades from user_id)
--   public.user_settings       (cascades from user_id)
--   public.user_preferences    (cascades from user_id)
--   public.user_profiles       (cascades from user_id)
--   public.user_blocks         (cascades from user_id)
--   public.safety_reports      (reporter_id ON DELETE SET NULL; row kept
--                               for admin review, reporter just anonymized)
--   public.swipes              (cascades from liker_id)
--   public.chat_messages       (cascades from sender_id / recipient_id)
--   public.push_subscriptions  (cascades from user_id)
--   public.admins              (cascades from user_id)
--
-- Storage objects in profile-photos are NOT auto-deleted by the cascade —
-- a follow-up cleanup job should sweep orphan objects whose folder name
-- (== auth.uid()) no longer exists in auth.users. For now they're
-- inaccessible without a logged-in matching user, so leaving them is
-- a soft leak we can address later.

set search_path = public;

create or replace function public.delete_self_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Deleting from auth.users cascades through all referencing tables.
  -- auth.users lives in the supabase-managed auth schema; this function
  -- runs as SECURITY DEFINER (postgres) so the delete is allowed.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_self_account() from public;
grant execute on function public.delete_self_account() to authenticated;

comment on function public.delete_self_account() is
  'User-initiated account deletion. SECURITY DEFINER deletes auth.users.id = auth.uid(), cascading through every public.* user-owned table. Called from the client only after explicit confirmation. Storage objects in profile-photos are left as a soft leak — clean up via a periodic orphan sweep.';
