-- 2026-05-24 Tier A — replace DMFR personality with Big Five + Attachment
--
-- The old 8-question A/B quiz (DMFR letter codes) is replaced by the
-- validated BFI-10 + Bartholomew RQ instrument (14 Likert items). Raw
-- answers live in profile_private (owner-only RLS). The server-side
-- sync_discoverable_profile RPC derives the public Big Five vector +
-- primary attachment style and writes them to public.profiles so they
-- can power matching without leaking raw answers.
--
-- Idempotent. Applies after the 2026-05-19 privatization migration.
-- Old personality_code / personality_answers columns are kept around for
-- one cleanup-window to avoid breaking beta users mid-flight; a follow-up
-- migration in ~30 days drops them once everyone has retaken.

set search_path = public;

-- ── Private storage: raw Likert answers + completion timestamp ──────
alter table public.profile_private
  add column if not exists big_five_answers integer[] default null,
  add column if not exists attachment_ratings integer[] default null,
  add column if not exists personality_completed_at timestamptz default null;

comment on column public.profile_private.big_five_answers is
  'BFI-10 raw Likert answers (10 integers, each 1..5). NEVER readable to other users (RLS owner-only).';
comment on column public.profile_private.attachment_ratings is
  'Bartholomew RQ raw Likert ratings (4 integers each 1..5 in order: secure, anxious, avoidant, disorganized). NEVER readable to other users.';
comment on column public.profile_private.personality_completed_at is
  'ISO timestamp of most-recent assessment completion. Drives the 6-month retake nudge.';

-- ── Public derived fields: Big Five vector + primary attachment style ──
-- These are computed server-side from the owner's private answers when
-- sync_discoverable_profile runs, so they can never go out of sync with
-- the raw data and a hostile client can't inject scores directly.
alter table public.profiles
  add column if not exists big_five jsonb default null,
  add column if not exists attachment_style text default null
    check (
      attachment_style is null
      or attachment_style in ('secure', 'anxious', 'avoidant', 'disorganized')
    );

comment on column public.profiles.big_five is
  'Public Big Five scores derived server-side from BFI-10 answers. Shape: {openness,conscientiousness,extraversion,agreeableness,neuroticism}, each 0..100. NULL until the user takes the new Tier A assessment.';
comment on column public.profiles.attachment_style is
  'Primary attachment style derived server-side from the four RQ ratings. NULL until the user takes the new Tier A assessment.';

-- ── sync_discoverable_profile: accept the new payload, store privately,
--     derive publicly ─────────────────────────────────────────────────
-- The Tier A payload extends the existing one with two arrays:
--   p_payload->'bigFiveAnswers'      → 10 integers (1..5)
--   p_payload->'attachmentRatings'   → 4 integers (1..5) in fixed style order
-- Everything else in the function body is unchanged from the 2026-05-21
-- shipped version; only the new branches are appended.

create or replace function public.sync_discoverable_profile(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_age int;
  v_city text;
  v_gender text;
  v_bio text;
  v_vibe text;
  v_interests text[];
  v_photos text[];
  v_distance_km int;
  v_relationship_goal text;
  v_zodiac text;
  v_extras jsonb;
  v_is_active boolean;
  -- Tier A
  v_bfi int[];
  v_att int[];
  v_o numeric; v_c numeric; v_e numeric; v_a numeric; v_n numeric;
  v_big_five jsonb;
  v_att_style text;
  v_att_max int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_name := nullif(trim(coalesce(p_payload->>'name', '')), '');
  v_age := (p_payload->>'age')::int;
  v_city := nullif(trim(coalesce(p_payload->>'city', '')), '');
  v_gender := nullif(coalesce(p_payload->>'gender', ''), '');
  if v_gender not in ('Woman', 'Man', 'Non-binary') then
    v_gender := 'Woman';
  end if;

  v_bio := coalesce(p_payload->>'bio', '');
  v_vibe := coalesce(nullif(trim(coalesce(p_payload->>'vibe', '')), ''), 'Good energy');

  v_interests := coalesce(
    (select array_agg(value) from jsonb_array_elements_text(p_payload->'interests')),
    '{}'::text[]
  );
  v_photos := coalesce(
    (select array_agg(value) from jsonb_array_elements_text(p_payload->'photos')
       where value is not null and length(value) > 0),
    '{}'::text[]
  );

  v_distance_km := greatest(1, coalesce((p_payload->>'distanceKm')::int, 10));
  v_relationship_goal := coalesce(nullif(p_payload->>'relationshipIntent', ''), 'Long-term');
  if v_relationship_goal not in ('Long-term', 'Short-term', 'Friends', 'Figuring it out') then
    v_relationship_goal := 'Long-term';
  end if;
  v_zodiac := coalesce(nullif(p_payload->>'zodiac', ''), 'Libra');

  v_extras := coalesce(p_payload->'extras', '{}'::jsonb);

  if v_name is null or v_age is null or v_age < 18 or v_age > 99 or v_city is null then
    return;
  end if;

  v_is_active := array_length(v_photos, 1) is not null and array_length(v_photos, 1) >= 1;

  -- ── Tier A: parse + derive personality if the new arrays are present ──
  if jsonb_typeof(p_payload->'bigFiveAnswers') = 'array' then
    v_bfi := coalesce(
      (select array_agg((value)::int) from jsonb_array_elements_text(p_payload->'bigFiveAnswers')),
      '{}'::int[]
    );
  end if;
  if jsonb_typeof(p_payload->'attachmentRatings') = 'array' then
    v_att := coalesce(
      (select array_agg((value)::int) from jsonb_array_elements_text(p_payload->'attachmentRatings')),
      '{}'::int[]
    );
  end if;

  -- Validate ranges. Reject silently (leave derived columns NULL) on bad data.
  if v_bfi is not null and array_length(v_bfi, 1) = 10
     and (select bool_and(x between 1 and 5) from unnest(v_bfi) x) then
    -- BFI-10 dimension recipes (1-indexed; reverse(x) = 6 - x):
    --   openness          = avg(reverse(Q5),  Q10)
    --   conscientiousness = avg(reverse(Q3),  Q8)
    --   extraversion      = avg(reverse(Q1),  Q6)
    --   agreeableness     = avg(Q2,           reverse(Q7))
    --   neuroticism       = avg(reverse(Q4),  Q9)
    v_o := ((6 - v_bfi[5])  + v_bfi[10]) / 2.0;
    v_c := ((6 - v_bfi[3])  + v_bfi[8])  / 2.0;
    v_e := ((6 - v_bfi[1])  + v_bfi[6])  / 2.0;
    v_a := (v_bfi[2]        + (6 - v_bfi[7])) / 2.0;
    v_n := ((6 - v_bfi[4])  + v_bfi[9])  / 2.0;
    -- Rescale 1..5 → 0..100. (avg - 1) * 25.
    v_big_five := jsonb_build_object(
      'openness',          round((v_o - 1) * 25)::int,
      'conscientiousness', round((v_c - 1) * 25)::int,
      'extraversion',      round((v_e - 1) * 25)::int,
      'agreeableness',     round((v_a - 1) * 25)::int,
      'neuroticism',       round((v_n - 1) * 25)::int
    );
  end if;

  if v_att is not null and array_length(v_att, 1) = 4
     and (select bool_and(x between 1 and 5) from unnest(v_att) x) then
    -- Order in the array: secure, anxious, avoidant, disorganized.
    -- Highest rating wins; tie-break in that same functional order.
    v_att_max := greatest(v_att[1], v_att[2], v_att[3], v_att[4]);
    if v_att[1] = v_att_max then v_att_style := 'secure';
    elsif v_att[2] = v_att_max then v_att_style := 'anxious';
    elsif v_att[3] = v_att_max then v_att_style := 'avoidant';
    else v_att_style := 'disorganized';
    end if;
  end if;

  -- Store raw answers privately
  insert into public.profile_private (
    auth_user_id, big_five_answers, attachment_ratings, personality_completed_at
  )
  values (v_uid, v_bfi, v_att,
    case when v_bfi is not null or v_att is not null then now() else null end)
  on conflict (auth_user_id) do update set
    big_five_answers          = coalesce(excluded.big_five_answers, profile_private.big_five_answers),
    attachment_ratings        = coalesce(excluded.attachment_ratings, profile_private.attachment_ratings),
    personality_completed_at  = coalesce(excluded.personality_completed_at, profile_private.personality_completed_at);

  insert into public.profiles (
    auth_user_id, name, age, city, gender, vibe, bio, interests,
    photos, distance_km, relationship_goal, zodiac, extras, is_active,
    big_five, attachment_style
  )
  values (
    v_uid, v_name, v_age, v_city, v_gender, v_vibe, v_bio, v_interests,
    v_photos, v_distance_km, v_relationship_goal, v_zodiac, v_extras, v_is_active,
    v_big_five, v_att_style
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
        is_active = excluded.is_active,
        big_five = coalesce(excluded.big_five, profiles.big_five),
        attachment_style = coalesce(excluded.attachment_style, profiles.attachment_style);
end;
$$;

revoke all on function public.sync_discoverable_profile(jsonb) from public;
grant execute on function public.sync_discoverable_profile(jsonb) to authenticated;
