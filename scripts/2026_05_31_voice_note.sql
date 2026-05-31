-- Profile voice note (2026-05-31) — discoverable projection.
--
-- The SELF side already works without this migration: voiceNoteUrl round-trips
-- in profile_data JSONB + localStorage, so you can record + replay your own clip
-- today. This migration exposes it on the DISCOVERABLE projection so MATCHES
-- hear it on your card.
--
-- SAFETY: the function below is byte-identical to sync_discoverable_profile in
-- scripts/2026_05_31_stability_assessment.sql EXCEPT for the 5 lines marked
-- "-- + voice note". Before applying, verify that:
--     diff <(sed -n '/create or replace function public.sync_discoverable_profile/,/^\$\$;/p' scripts/2026_05_31_stability_assessment.sql) \
--          <(sed -n '/create or replace function public.sync_discoverable_profile/,/^\$\$;/p' scripts/2026_05_31_voice_note.sql)
-- shows ONLY the voice_note_url additions. `create or replace` is reversible
-- (re-apply the stability migration's function to roll back).

-- 1. The public column matches read from priveApi.ts (row.voice_note_url).
alter table public.profiles
  add column if not exists voice_note_url text default null;

comment on column public.profiles.voice_note_url is
  'Optional profile voice intro (audio/webm in the profile-photos bucket). Surfaced on the candidate card.';

-- 2. Teach sync_discoverable_profile to project voiceNoteUrl from the payload.
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
  -- Stability Assessment
  v_stab int[];
  v_cr numeric; v_cm numeric; v_co numeric;
  v_children text; v_finances text; v_pace text;
  v_stability jsonb;
  v_voice_note text;  -- + voice note
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
  v_voice_note := nullif(trim(coalesce(p_payload->>'voiceNoteUrl', '')), '');  -- + voice note

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

  if v_bfi is not null and array_length(v_bfi, 1) = 10
     and (select bool_and(x between 1 and 5) from unnest(v_bfi) x) then
    v_o := ((6 - v_bfi[5])  + v_bfi[10]) / 2.0;
    v_c := ((6 - v_bfi[3])  + v_bfi[8])  / 2.0;
    v_e := ((6 - v_bfi[1])  + v_bfi[6])  / 2.0;
    v_a := (v_bfi[2]        + (6 - v_bfi[7])) / 2.0;
    v_n := ((6 - v_bfi[4])  + v_bfi[9])  / 2.0;
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
    v_att_max := greatest(v_att[1], v_att[2], v_att[3], v_att[4]);
    if v_att[1] = v_att_max then v_att_style := 'secure';
    elsif v_att[2] = v_att_max then v_att_style := 'anxious';
    elsif v_att[3] = v_att_max then v_att_style := 'avoidant';
    else v_att_style := 'disorganized';
    end if;
  end if;

  -- ── Stability: parse + derive if the array is present ────────────────
  -- Item order (1-indexed; reverse(x) = 6 - x), matching services/stability.ts:
  --   conflictRepair = avg(reverse(Q1), Q2, reverse(Q3))
  --   commitment     = avg(Q4, reverse(Q5), Q6)
  --   communication  = avg(Q7, Q8, reverse(Q9))
  --   children  = Q10 (>=4 yes, <=2 no, else unsure)
  --   finances  = Q11 (>=4 saver, <=2 spender, else balanced)
  --   pace      = Q12 (>=4 fast, <=2 slow, else balanced)
  if jsonb_typeof(p_payload->'stabilityAnswers') = 'array' then
    v_stab := coalesce(
      (select array_agg((value)::int) from jsonb_array_elements_text(p_payload->'stabilityAnswers')),
      '{}'::int[]
    );
  end if;

  if v_stab is not null and array_length(v_stab, 1) = 12
     and (select bool_and(x between 1 and 5) from unnest(v_stab) x) then
    v_cr := ((6 - v_stab[1]) + v_stab[2] + (6 - v_stab[3])) / 3.0;
    v_cm := (v_stab[4] + (6 - v_stab[5]) + v_stab[6]) / 3.0;
    v_co := (v_stab[7] + v_stab[8] + (6 - v_stab[9])) / 3.0;
    v_children := case when v_stab[10] >= 4 then 'yes' when v_stab[10] <= 2 then 'no' else 'unsure' end;
    v_finances := case when v_stab[11] >= 4 then 'saver' when v_stab[11] <= 2 then 'spender' else 'balanced' end;
    v_pace     := case when v_stab[12] >= 4 then 'fast' when v_stab[12] <= 2 then 'slow' else 'balanced' end;
    v_stability := jsonb_build_object(
      'conflictRepair', greatest(0, least(100, round((v_cr - 1) * 25)::int)),
      'commitment',     greatest(0, least(100, round((v_cm - 1) * 25)::int)),
      'communication',  greatest(0, least(100, round((v_co - 1) * 25)::int)),
      'values', jsonb_build_object(
        'children', v_children,
        'finances', v_finances,
        'pace',     v_pace
      ),
      'completedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
  end if;

  insert into public.profile_private (
    user_id, big_five_answers, attachment_ratings, personality_completed_at,
    stability_answers, stability_completed_at
  )
  values (v_uid, v_bfi, v_att,
    case when v_bfi is not null or v_att is not null then now() else null end,
    v_stab,
    case when v_stability is not null then now() else null end)
  on conflict (user_id) do update set
    big_five_answers          = coalesce(excluded.big_five_answers, profile_private.big_five_answers),
    attachment_ratings        = coalesce(excluded.attachment_ratings, profile_private.attachment_ratings),
    personality_completed_at  = coalesce(excluded.personality_completed_at, profile_private.personality_completed_at),
    stability_answers         = coalesce(excluded.stability_answers, profile_private.stability_answers),
    stability_completed_at    = coalesce(excluded.stability_completed_at, profile_private.stability_completed_at);

  insert into public.profiles (
    auth_user_id, name, age, city, gender, vibe, bio, interests,
    photos, distance_km, relationship_goal, zodiac, extras, is_active,
    big_five, attachment_style, stability_profile, voice_note_url  -- + voice note
  )
  values (
    v_uid, v_name, v_age, v_city, v_gender, v_vibe, v_bio, v_interests,
    v_photos, v_distance_km, v_relationship_goal, v_zodiac, v_extras, v_is_active,
    v_big_five, v_att_style, v_stability, v_voice_note  -- + voice note
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
        attachment_style = coalesce(excluded.attachment_style, profiles.attachment_style),
        stability_profile = coalesce(excluded.stability_profile, profiles.stability_profile),
        voice_note_url = coalesce(excluded.voice_note_url, profiles.voice_note_url);  -- + voice note
end;
$$;

revoke all on function public.sync_discoverable_profile(jsonb) from public;
grant execute on function public.sync_discoverable_profile(jsonb) to authenticated;
