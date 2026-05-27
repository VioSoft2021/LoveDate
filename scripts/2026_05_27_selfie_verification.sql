-- 2026-05-27 — Selfie-pose verification (anti-fake "real human" badge)
--
-- The strongest defense against AI-generated fake profiles: a live
-- selfie matching a randomly-prompted gesture, reviewed by a human
-- (Master). An AI face-fake cannot produce a live selfie on a prompted
-- pose, so a passed review is strong evidence the person is real.
--
-- Flow:
--   1. User taps "Verify you're real" → app shows a random pose prompt
--      ("hold up three fingers"), captures a LIVE-camera selfie (no
--      gallery), uploads it to the private verification-selfies bucket,
--      and calls submit_verification(pose, path).
--   2. Master reviews in the Privé Moderation Center: profile photos +
--      the selfie + the pose, side by side. admin_review_verification
--      approves (→ profiles.verified = true + the verified badge) or
--      rejects.
--
-- This REPLACES the old meaning of the "Verified" badge, which was
-- auto-awarded by the AI Photo Coach on photo aesthetics (≥7/10) — a
-- measure that said nothing about whether the person was real (an AI
-- face would score high). The client change drops that auto-award.
--
-- Idempotent.

set search_path = public;

-- ── Private bucket for verification selfies ───────────────────────
insert into storage.buckets (id, name, public)
values ('verification-selfies', 'verification-selfies', false)
on conflict (id) do nothing;

-- Owner may upload selfies into their own folder (userId/...).
drop policy if exists "verification_selfies_owner_insert" on storage.objects;
create policy "verification_selfies_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'verification-selfies'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- The owner can read their own selfie; admins can read any (to review).
-- Private bucket → no public read. Admins fetch via signed URLs created
-- with their own session (the SELECT policy authorises it).
drop policy if exists "verification_selfies_read" on storage.objects;
create policy "verification_selfies_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'verification-selfies'
  and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
);

-- ── verification_requests table ──────────────────────────────────
create table if not exists public.verification_requests (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  pose        text        not null,
  selfie_path text        not null,
  status      text        not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid        references auth.users(id) on delete set null
);

create index if not exists verification_requests_status_idx
  on public.verification_requests (status, created_at desc);
create index if not exists verification_requests_user_idx
  on public.verification_requests (user_id, created_at desc);

alter table public.verification_requests enable row level security;

-- Owner can see their own requests (so the client can show "pending /
-- verified / rejected" state). All writes happen via the RPCs below.
drop policy if exists "verification_requests_owner_select" on public.verification_requests;
create policy "verification_requests_owner_select"
on public.verification_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- submit_verification(pose, selfie_path) — authenticated.
-- Records a pending request for the caller. Supersedes any prior
-- pending request from the same user (only the latest matters).
-- ────────────────────────────────────────────────────────────────────
create or replace function public.submit_verification(
  p_pose        text,
  p_selfie_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if coalesce(trim(p_pose), '') = '' or coalesce(trim(p_selfie_path), '') = '' then
    raise exception 'pose and selfie_path are required' using errcode = '22023';
  end if;
  -- The selfie must live in the caller's own folder.
  if split_part(p_selfie_path, '/', 1) <> v_uid::text then
    raise exception 'selfie path must be in your own folder' using errcode = '42501';
  end if;

  -- Drop any earlier still-pending request from this user.
  delete from public.verification_requests
   where user_id = v_uid and status = 'pending';

  insert into public.verification_requests (user_id, pose, selfie_path)
  values (v_uid, trim(p_pose), trim(p_selfie_path))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_verification(text, text) from public;
grant execute on function public.submit_verification(text, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- admin_list_verifications(status) — admin-only. Joins the applicant's
-- name + profile photos (public URLs) so the reviewer can compare the
-- selfie against the profile. The selfie itself is fetched client-side
-- via a signed URL on selfie_path.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_verifications(p_status text default 'pending')
returns table (
  id           uuid,
  user_id      uuid,
  name         text,
  email        text,
  photos       jsonb,
  pose         text,
  selfie_path  text,
  status       text,
  created_at   timestamptz,
  reviewed_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  return query
    select v.id,
           v.user_id,
           coalesce(up.profile_data->>'name', '') as name,
           coalesce(u.email, '') as email,
           coalesce(up.profile_data->'photos', '[]'::jsonb) as photos,
           v.pose,
           v.selfie_path,
           v.status,
           v.created_at,
           v.reviewed_at
      from public.verification_requests v
      left join public.user_profiles up on up.user_id = v.user_id
      left join auth.users u on u.id = v.user_id
     where p_status = 'all' or v.status = p_status
     order by v.created_at desc
     limit 200;
end;
$$;

revoke all on function public.admin_list_verifications(text) from public;
grant execute on function public.admin_list_verifications(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- admin_review_verification(id, approve) — admin-only.
-- On approve: mark request approved, set the discoverable profile's
-- verified flag, AND stamp verificationBadge='photo-verified' into the
-- user's own profile_data so their app shows the badge immediately and
-- future profile syncs preserve it.
-- On reject: mark request rejected (no badge).
-- ────────────────────────────────────────────────────────────────────
create or replace function public.admin_review_verification(
  p_id      uuid,
  p_approve boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  select user_id into v_user
    from public.verification_requests
   where id = p_id
   for update;
  if v_user is null then
    raise exception 'verification request not found' using errcode = 'P0002';
  end if;

  update public.verification_requests
     set status      = case when p_approve then 'approved' else 'rejected' end,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_id;

  if p_approve then
    update public.profiles
       set verified = true
     where auth_user_id = v_user;

    update public.user_profiles
       set profile_data = jsonb_set(
             coalesce(profile_data, '{}'::jsonb),
             '{verificationBadge}',
             '"photo-verified"'::jsonb,
             true
           )
     where user_id = v_user;
  end if;

  return true;
end;
$$;

revoke all on function public.admin_review_verification(uuid, boolean) from public;
grant execute on function public.admin_review_verification(uuid, boolean) to authenticated;

-- ── Expose `verified` on discoverable reads ──────────────────────
-- The profiles table already has a `verified` boolean (default false).
-- sync_discoverable_profile intentionally never overwrites it, so an
-- admin-set true survives the user's future profile edits. No change
-- needed here — candidate-card queries that select * already get it.
