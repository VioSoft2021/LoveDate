-- ==================================================================
-- LoveDate — 2026-05-19 pending migrations (apply in Supabase SQL editor)
-- ==================================================================
--
-- This file bundles three idempotent migrations for one-paste apply.
-- Safe to re-run; each statement uses IF NOT EXISTS / CREATE OR REPLACE.
--
-- After running, also seed yourself as admin (NOT included here — must
-- be a separate, never-committed paste in the same SQL editor):
--   insert into public.admins (user_id)
--   select id from auth.users where email in ('your@email')
--   on conflict do nothing;


-- ════════ 1/3 — privatize personalityAnswers + dealbreakers + admins ═

-- 2026-05-19 privatize sensitive profile fields + admin allowlist
--
-- Migration applied after scripts/supabase_beta_setup.sql. Safe to re-run
-- (every statement is idempotent).
--
-- WHY:
--   1. `profiles.extras` is publicly readable (the profiles_public_read
--      policy returns the whole row). It was carrying personalityAnswers
--      and dealbreakers, which are user-private. This migration moves
--      both into a new public.profile_private table with owner-only RLS
--      and adds a public profiles.personality_code derived column so the
--      app can still show personality codes + compute heuristic
--      compatibility without exposing raw quiz answers.
--   2. is_admin() was an email allowlist hardcoded in committed public
--      SQL. Replaced with a public.admins(user_id) table, owner-only
--      writes via the service role (you seed manually after applying).
--
-- HOW TO APPLY:
--   In Supabase SQL editor, paste this file and Run. Then seed admins
--   yourself (NEVER commit the seed insert):
--     insert into public.admins (user_id) select id from auth.users
--       where email = 'your@email.example' on conflict do nothing;

set search_path = public;

-- ────────────────────────────────────────────────────────────────────
-- Fix 1a: public.personality_code on profiles
-- ────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists personality_code text;

comment on column public.profiles.personality_code is
  'Derived 4-letter personality code (e.g. CSOA). Replaces raw quiz answers as the cross-profile compatibility signal. Raw answers live in public.profile_private and are owner-only.';

-- ────────────────────────────────────────────────────────────────────
-- Fix 1b: public.profile_private — owner-only, mirrors auth.uid()
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  personality_answers text[] not null default '{}',
  dealbreakers text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

drop policy if exists "profile_private_owner_select" on public.profile_private;
create policy "profile_private_owner_select"
on public.profile_private
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profile_private_owner_upsert" on public.profile_private;
create policy "profile_private_owner_upsert"
on public.profile_private
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profile_private_owner_update" on public.profile_private;
create policy "profile_private_owner_update"
on public.profile_private
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- Fix 1c: re-issue sync_discoverable_profile so it (a) strips the now-
-- private fields from extras before persisting, (b) writes them into
-- profile_private, and (c) writes the derived personality_code.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.sync_discoverable_profile(
  p_payload jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_age integer;
  v_city text;
  v_gender text;
  v_vibe text;
  v_bio text;
  v_interests text[];
  v_photos text[];
  v_distance_km integer;
  v_relationship_goal text;
  v_zodiac text;
  v_extras jsonb;
  v_is_active boolean;
  v_personality_answers text[];
  v_dealbreakers text[];
  v_personality_code text;
  v_answers_jsonb jsonb;
  v_b_energy integer;
  v_b_pace integer;
  v_b_social integer;
  v_b_planning integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_name := nullif(p_payload->>'name', '');
  v_age := nullif(p_payload->>'age', '')::integer;
  v_city := nullif(p_payload->>'city', '');
  v_gender := coalesce(nullif(p_payload->>'gender', ''), 'Non-binary');
  if v_gender not in ('Woman', 'Man', 'Non-binary') then
    v_gender := 'Non-binary';
  end if;
  v_vibe := coalesce(nullif(p_payload->>'vibe', ''), '');
  v_bio := coalesce(nullif(p_payload->>'bio', ''), '');
  v_interests := coalesce(
    array(select jsonb_array_elements_text(p_payload->'interests')),
    '{}'
  );
  v_photos := coalesce(
    array(select jsonb_array_elements_text(p_payload->'photos')),
    '{}'
  );
  v_distance_km := coalesce((p_payload->>'distanceKm')::integer, 10);
  v_relationship_goal := coalesce(nullif(p_payload->>'relationshipIntent', ''), 'Long-term');
  if v_relationship_goal not in ('Long-term', 'Short-term', 'Friends', 'Figuring it out') then
    v_relationship_goal := 'Long-term';
  end if;
  v_zodiac := coalesce(nullif(p_payload->>'zodiac', ''), 'Libra');

  v_extras := coalesce(p_payload->'extras', '{}'::jsonb);

  -- Pull private fields out of the payload extras before persisting.
  v_answers_jsonb := coalesce(v_extras->'personalityAnswers', '[]'::jsonb);
  v_personality_answers := coalesce(
    array(select jsonb_array_elements_text(v_answers_jsonb)),
    '{}'
  );
  v_dealbreakers := coalesce(
    array(select jsonb_array_elements_text(coalesce(v_extras->'dealbreakers', '[]'::jsonb))),
    '{}'
  );

  -- Strip both from the public extras blob so they never land in the
  -- publicly-readable profiles row.
  v_extras := v_extras - 'personalityAnswers' - 'dealbreakers';

  -- Derive personality_code mirroring src/services/compatibility.ts
  -- personalityCodeFromAnswers. 8 questions, 2 per axis. Count 'B'
  -- answers per axis; if at least 1 of 2 is 'B' the axis flips to its
  -- "active" letter (D/S/O/A); otherwise its "calm" letter (C/M/F/R).
  --   axis order in PERSONALITY_QUESTIONS: energy, pace, social, planning
  if array_length(v_personality_answers, 1) = 8 then
    v_b_energy := (case when v_personality_answers[1] = 'B' then 1 else 0 end)
                + (case when v_personality_answers[2] = 'B' then 1 else 0 end);
    v_b_pace := (case when v_personality_answers[3] = 'B' then 1 else 0 end)
              + (case when v_personality_answers[4] = 'B' then 1 else 0 end);
    v_b_social := (case when v_personality_answers[5] = 'B' then 1 else 0 end)
                + (case when v_personality_answers[6] = 'B' then 1 else 0 end);
    v_b_planning := (case when v_personality_answers[7] = 'B' then 1 else 0 end)
                  + (case when v_personality_answers[8] = 'B' then 1 else 0 end);
    v_personality_code :=
      (case when v_b_energy >= 1 then 'D' else 'C' end) ||
      (case when v_b_pace >= 1 then 'S' else 'M' end) ||
      (case when v_b_social >= 1 then 'O' else 'F' end) ||
      (case when v_b_planning >= 1 then 'A' else 'R' end);
  else
    v_personality_code := null;
  end if;

  if v_name is null or v_age is null or v_age < 18 or v_age > 99 or v_city is null then
    return;
  end if;

  v_is_active := array_length(v_photos, 1) is not null and array_length(v_photos, 1) >= 1;

  insert into public.profiles (
    auth_user_id, name, age, city, gender, vibe, bio, interests,
    photos, distance_km, relationship_goal, zodiac, extras, personality_code, is_active
  )
  values (
    v_uid, v_name, v_age, v_city, v_gender, v_vibe, v_bio, v_interests,
    v_photos, v_distance_km, v_relationship_goal, v_zodiac, v_extras, v_personality_code, v_is_active
  )
  on conflict (auth_user_id) do update
    set name = excluded.name,
        age = excluded.age,
        city = excluded.city,
        gender = excluded.gender,
        vibe = excluded.vibe,
        bio = excluded.bio,
        interests = excluded.interests,
        photos = excluded.photos,
        distance_km = excluded.distance_km,
        relationship_goal = excluded.relationship_goal,
        zodiac = excluded.zodiac,
        extras = excluded.extras,
        personality_code = excluded.personality_code,
        is_active = excluded.is_active;

  -- Mirror private fields to the owner-only table.
  insert into public.profile_private (user_id, personality_answers, dealbreakers, updated_at)
  values (v_uid, v_personality_answers, v_dealbreakers, now())
  on conflict (user_id) do update
    set personality_answers = excluded.personality_answers,
        dealbreakers = excluded.dealbreakers,
        updated_at = now();
end;
$$;

revoke all on function public.sync_discoverable_profile(jsonb) from public;
grant execute on function public.sync_discoverable_profile(jsonb) to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Fix 2: replace email-allowlist is_admin() with public.admins table
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- No INSERT/UPDATE/DELETE policies — only the service role (out of band)
-- writes to this table. The seed insert lives outside committed SQL.
drop policy if exists "admins_self_read" on public.admins;
create policy "admins_self_read"
on public.admins
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (select 1 from public.admins where user_id = auth.uid());
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- One-time backfill: copy any existing personalityAnswers / dealbreakers
-- out of profiles.extras and into profile_private, then strip from extras.
-- Idempotent; rerunning copies the now-empty arrays harmlessly.
-- ────────────────────────────────────────────────────────────────────
insert into public.profile_private (user_id, personality_answers, dealbreakers, updated_at)
select
  p.auth_user_id,
  coalesce(
    array(select jsonb_array_elements_text(p.extras->'personalityAnswers')),
    '{}'
  ),
  coalesce(
    array(select jsonb_array_elements_text(p.extras->'dealbreakers')),
    '{}'
  ),
  now()
from public.profiles p
where p.auth_user_id is not null
  and (p.extras ? 'personalityAnswers' or p.extras ? 'dealbreakers')
on conflict (user_id) do update
  set personality_answers = excluded.personality_answers,
      dealbreakers = excluded.dealbreakers,
      updated_at = now();

update public.profiles
   set extras = extras - 'personalityAnswers' - 'dealbreakers'
 where extras ? 'personalityAnswers' or extras ? 'dealbreakers';

-- ────────────────────────────────────────────────────────────────────
-- One-time backfill: derive personality_code for any existing rows
-- whose private answers we just imported.
-- ────────────────────────────────────────────────────────────────────
update public.profiles p
set personality_code = (
  select case when array_length(pp.personality_answers, 1) = 8
    then concat(
      case when ((case when pp.personality_answers[1]='B' then 1 else 0 end)
               + (case when pp.personality_answers[2]='B' then 1 else 0 end)) >= 1
        then 'D' else 'C' end,
      case when ((case when pp.personality_answers[3]='B' then 1 else 0 end)
               + (case when pp.personality_answers[4]='B' then 1 else 0 end)) >= 1
        then 'S' else 'M' end,
      case when ((case when pp.personality_answers[5]='B' then 1 else 0 end)
               + (case when pp.personality_answers[6]='B' then 1 else 0 end)) >= 1
        then 'O' else 'F' end,
      case when ((case when pp.personality_answers[7]='B' then 1 else 0 end)
               + (case when pp.personality_answers[8]='B' then 1 else 0 end)) >= 1
        then 'A' else 'R' end
    )
    else null end
  from public.profile_private pp
  where pp.user_id = p.auth_user_id
)
where p.auth_user_id is not null
  and p.personality_code is null;


-- ════════ 2/3 — safety_reports AI triage columns ═════════════════════

-- 2026-05-19 add AI triage columns to safety_reports
--
-- Migration applied after scripts/supabase_beta_setup.sql and after
-- scripts/2026_05_19_privatize_sensitive_fields.sql. Idempotent.
--
-- The ai-safety-triage Edge Function calls Claude Haiku 4.5 with the
-- report contents + reported profile snapshot and writes the verdict
-- back here via the service role. Operator views in Moderation Center
-- sort the queue by risk_level DESC + created_at DESC so the worst
-- new reports surface first.

set search_path = public;

alter table public.safety_reports
  add column if not exists ai_risk_level text
    check (ai_risk_level is null or ai_risk_level in ('low','medium','high')),
  add column if not exists ai_categories text[] not null default '{}',
  add column if not exists ai_summary text,
  add column if not exists ai_triaged_at timestamptz;

create index if not exists safety_reports_ai_risk_idx
  on public.safety_reports (ai_risk_level, created_at desc);

comment on column public.safety_reports.ai_risk_level is
  'low/medium/high — written by ai-safety-triage Edge Function. NULL until triaged.';
comment on column public.safety_reports.ai_categories is
  'AI-classified categories (one or more from the safety_reports.category check list). May or may not match the reporter-chosen category — operators see both.';
comment on column public.safety_reports.ai_summary is
  'Short admin-facing summary the operator reads instead of the full report. Empty until triaged.';


-- ════════ 3/3 — delete_self_account() SECURITY DEFINER function ══════

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

