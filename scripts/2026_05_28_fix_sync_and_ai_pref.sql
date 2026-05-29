-- 2026-05-28 — Fix two runtime schema mismatches surfaced by client logs:
--
--   1. "Preference hydration failed: column user_preferences.ai_preference_prompt
--      does not exist" — the column is defined in supabase_beta_setup.sql but was
--      never applied to prod. Add it (idempotent).
--
--   2. "Discoverable profile sync skipped: column auth_user_id of relation
--      profile_private does not exist" — sync_discoverable_profile (Tier A,
--      2026-05-24) inserted into public.profile_private using auth_user_id, but
--      that table is keyed by user_id (auth_user_id lives on public.profiles).
--      CREATE OR REPLACE FUNCTION doesn't validate column refs, so it only failed
--      at call time. Re-create the function with the profile_private block fixed.
--
-- Safe to run multiple times.

-- ── Fix 1: missing AI preference prompt column ──────────────────────────
alter table public.user_preferences
  add column if not exists ai_preference_prompt text not null default '';

-- ── Fix 2: re-create sync_discoverable_profile with profile_private keyed
--     by user_id (only the profile_private block changed vs. 2026-05-24) ──
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

  -- Store raw answers privately. profile_private is keyed by user_id
  -- (references auth.users.id); auth_user_id lives on public.profiles.
  insert into public.profile_private (
    user_id, big_five_answers, attachment_ratings, personality_completed_at
  )
  values (v_uid, v_bfi, v_att,
    case when v_bfi is not null or v_att is not null then now() else null end)
  on conflict (user_id) do update set
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
