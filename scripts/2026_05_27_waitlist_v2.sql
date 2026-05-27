-- 2026-05-27 — Waitlist v2: mini-questionnaire + needs-info follow-up
--
-- Master's invite-acceptance policy decision (2026-05-27):
--   1. Collect a 7-field mini-questionnaire instead of just email+note.
--   2. Borderline requests get a "needs-info" status + a magic-link
--      reply page so Master can ask one follow-up question and the
--      answer lands structured back in InviteAdmin.
--   3. Active gender-balance gating at 2:1 (enforced in InviteAdmin UI;
--      this migration just exposes the per-gender counts).
--
-- New columns on public.waitlist:
--   first_name   text   — applicant's first name
--   age          int    — applicant's age (>= 18)
--   gender       text   — 'Man' | 'Woman' | 'Other'
--   city         text   — applicant's city
--   looking_for  text   — 'Long-term' | 'Open' | 'Not sure'
--   admin_note   text   — Master's follow-up question (needs-info flow)
--   reply_token  text   — random token for the magic-link reply page
--   user_reply   text   — the applicant's answer to the follow-up
--   replied_at   timestamptz — when the applicant replied
--
-- The legacy `note` column is repurposed as the "why Privé" paragraph
-- (kept the column name to avoid a destructive rename; the client now
-- sends the why-paragraph as p_note).
--
-- Idempotent.

set search_path = public;

-- ── Columns ───────────────────────────────────────────────────────
alter table public.waitlist add column if not exists first_name  text;
alter table public.waitlist add column if not exists age         integer;
alter table public.waitlist add column if not exists gender      text;
alter table public.waitlist add column if not exists city        text;
alter table public.waitlist add column if not exists looking_for text;
alter table public.waitlist add column if not exists admin_note  text;
alter table public.waitlist add column if not exists reply_token text;
alter table public.waitlist add column if not exists user_reply  text;
alter table public.waitlist add column if not exists replied_at  timestamptz;

create unique index if not exists waitlist_reply_token_unique
  on public.waitlist (reply_token)
  where reply_token is not null;

-- ── Status check: add 'needs-info' ───────────────────────────────
-- The original CHECK was created inline with an auto-generated name.
-- Drop whatever status check exists, then add the widened one.
do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
    from pg_constraint
   where conrelid = 'public.waitlist'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%status%';
  if v_constraint is not null then
    execute format('alter table public.waitlist drop constraint %I', v_constraint);
  end if;
end $$;

alter table public.waitlist
  add constraint waitlist_status_check
  check (status in ('pending', 'approved', 'declined', 'needs-info'));

-- ────────────────────────────────────────────────────────────────────
-- submit_waitlist — v2 signature (7 fields). anon-accessible.
-- Keeps the old 2-arg version droppable below; the client now always
-- sends the full set.
-- ────────────────────────────────────────────────────────────────────
drop function if exists public.submit_waitlist(text, text);

create or replace function public.submit_waitlist(
  p_email       text,
  p_first_name  text,
  p_age         integer,
  p_gender      text,
  p_city        text,
  p_looking_for text,
  p_note        text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_recent_count integer;
begin
  v_email := lower(trim(p_email));

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if coalesce(trim(p_first_name), '') = '' then
    raise exception 'first name is required' using errcode = '22023';
  end if;
  if p_age is null or p_age < 18 or p_age > 120 then
    raise exception 'age must be 18 or older' using errcode = '22023';
  end if;
  if p_gender not in ('Man', 'Woman', 'Other') then
    raise exception 'invalid gender' using errcode = '22023';
  end if;
  if coalesce(trim(p_city), '') = '' then
    raise exception 'city is required' using errcode = '22023';
  end if;
  if p_looking_for not in ('Long-term', 'Open', 'Not sure') then
    raise exception 'invalid looking_for' using errcode = '22023';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'tell us why Privé' using errcode = '22023';
  end if;

  -- Spam guard: max 3 entries from the same email in any 24h window.
  select count(*) into v_recent_count
    from public.waitlist
   where lower(email) = v_email
     and created_at > now() - interval '24 hours';
  if v_recent_count >= 3 then
    raise exception 'too many requests, try again later'
      using errcode = '42P14';
  end if;

  insert into public.waitlist (
    email, first_name, age, gender, city, looking_for, note
  ) values (
    v_email,
    trim(p_first_name),
    p_age,
    p_gender,
    trim(p_city),
    p_looking_for,
    nullif(trim(p_note), '')
  )
  on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.submit_waitlist(text, text, integer, text, text, text, text) from public;
grant execute on function public.submit_waitlist(text, text, integer, text, text, text, text) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- admin_list_waitlist — return shape now includes the new fields.
-- Must DROP + CREATE because the RETURNS TABLE signature changed.
-- ────────────────────────────────────────────────────────────────────
drop function if exists public.admin_list_waitlist(text);

create or replace function public.admin_list_waitlist(p_status text default 'pending')
returns table (
  id            uuid,
  email         text,
  first_name    text,
  age           integer,
  gender        text,
  city          text,
  looking_for   text,
  note          text,
  status        text,
  invite_code   text,
  admin_note    text,
  reply_token   text,
  user_reply    text,
  replied_at    timestamptz,
  created_at    timestamptz,
  reviewed_at   timestamptz
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
    select w.id, w.email, w.first_name, w.age, w.gender, w.city,
           w.looking_for, w.note, w.status, w.invite_code, w.admin_note,
           w.reply_token, w.user_reply, w.replied_at, w.created_at, w.reviewed_at
      from public.waitlist w
     where p_status = 'all' or w.status = p_status
     order by w.created_at desc
     limit 200;
end;
$$;

revoke all on function public.admin_list_waitlist(text) from public;
grant execute on function public.admin_list_waitlist(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- admin_waitlist_gender_counts — for the 2:1 ratio header + gating.
-- Returns approved-member counts per gender.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.admin_waitlist_gender_counts()
returns table (gender text, approved_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  return query
    select coalesce(w.gender, 'Other') as gender, count(*) as approved_count
      from public.waitlist w
     where w.status = 'approved'
     group by coalesce(w.gender, 'Other');
end;
$$;

revoke all on function public.admin_waitlist_gender_counts() from public;
grant execute on function public.admin_waitlist_gender_counts() to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- admin_request_more_info(id, question) — borderline follow-up.
-- Stores Master's question, mints a random reply_token, flips the row
-- to 'needs-info'. Returns the reply_token so InviteAdmin can build the
-- magic link (prive-app.club/#/waitlist-reply/<token>) for Master to
-- send the applicant.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.admin_request_more_info(
  p_id       uuid,
  p_question text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_token  text;
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if coalesce(trim(p_question), '') = '' then
    raise exception 'question is required' using errcode = '22023';
  end if;

  select status into v_status from public.waitlist where id = p_id for update;
  if v_status is null then
    raise exception 'waitlist entry not found' using errcode = 'P0002';
  end if;

  -- 32-char URL-safe token (strip dashes from two uuids, take 32).
  v_token := substring(
    replace(gen_random_uuid()::text, '-', '') ||
    replace(gen_random_uuid()::text, '-', ''),
    1, 32
  );

  update public.waitlist
     set status      = 'needs-info',
         admin_note  = trim(p_question),
         reply_token = v_token,
         user_reply  = null,
         replied_at  = null,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_id;

  return v_token;
end;
$$;

revoke all on function public.admin_request_more_info(uuid, text) from public;
grant execute on function public.admin_request_more_info(uuid, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- get_waitlist_question(token) — anon. The reply page calls this to
-- show the applicant Master's question. Returns ONLY the question +
-- first name (never the email or other PII), and only while the row is
-- still in 'needs-info' status (so consumed/expired tokens reveal
-- nothing).
-- ────────────────────────────────────────────────────────────────────
create or replace function public.get_waitlist_question(p_token text)
returns table (first_name text, question text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select w.first_name, w.admin_note
      from public.waitlist w
     where w.reply_token = p_token
       and w.status = 'needs-info'
     limit 1;
end;
$$;

revoke all on function public.get_waitlist_question(text) from public;
grant execute on function public.get_waitlist_question(text) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- submit_waitlist_reply(token, reply) — anon. The applicant's answer
-- to the follow-up. Stores the reply, flips the row back to 'pending'
-- so it re-surfaces in Master's queue, and burns the token (sets it
-- null) so the link can't be reused.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.submit_waitlist_reply(
  p_token text,
  p_reply text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_reply), '') = '' then
    raise exception 'reply is required' using errcode = '22023';
  end if;

  select id into v_id
    from public.waitlist
   where reply_token = p_token
     and status = 'needs-info'
   for update;

  if v_id is null then
    raise exception 'invalid or expired link' using errcode = 'P0002';
  end if;

  update public.waitlist
     set user_reply  = left(trim(p_reply), 2000),
         replied_at  = now(),
         status      = 'pending',
         reply_token = null
   where id = v_id;

  return true;
end;
$$;

revoke all on function public.submit_waitlist_reply(text, text) from public;
grant execute on function public.submit_waitlist_reply(text, text) to anon, authenticated;
