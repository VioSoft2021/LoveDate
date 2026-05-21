-- 2026-05-21 waitlist — public access request flow
--
-- Privé runs invite-only (public.beta_invites). To grow without
-- abandoning that gate, this migration adds a public waitlist:
-- strangers visiting prive-app.club submit their email, an admin
-- reviews each entry, and approving generates a fresh single-use
-- invite code automatically and emails it (manually for now).
--
-- Tables:
--   public.waitlist — one row per access request
--
-- RPCs:
--   submit_waitlist(p_email, p_note)
--     Open to anon. Rate-limited to 1 entry per email per 24h to
--     prevent spam. Inserts a row with status='pending'.
--
--   admin_list_waitlist(p_status)
--     Gated by public.is_admin(). Returns waitlist rows filtered
--     by status (or 'all').
--
--   admin_approve_waitlist(p_id)
--     Gated by is_admin(). Generates a 12-char URL-safe invite code,
--     inserts it into public.beta_invites (active=true, expires in
--     30 days), updates the waitlist row to status='approved' with
--     the generated code stored alongside. Returns the code so the
--     admin UI can show it for manual email.
--
--   admin_decline_waitlist(p_id)
--     Gated by is_admin(). Marks the row as status='declined'.
--
-- Idempotent.

set search_path = public;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  invite_code text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

create unique index if not exists waitlist_email_pending_unique
  on public.waitlist (lower(email))
  where status = 'pending';

alter table public.waitlist enable row level security;

-- No SELECT/INSERT policies for anon or authenticated. All access goes
-- through SECURITY DEFINER RPCs below, so the table contents are
-- never readable directly.

-- ────────────────────────────────────────────────────────────────────
-- submit_waitlist(email, note) — anon-accessible
-- ────────────────────────────────────────────────────────────────────
create or replace function public.submit_waitlist(
  p_email text,
  p_note text default null
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

  -- Spam guard: max 1 pending entry per email + max 3 entries from
  -- the same email in any 24h window.
  select count(*) into v_recent_count
    from public.waitlist
   where lower(email) = v_email
     and created_at > now() - interval '24 hours';

  if v_recent_count >= 3 then
    raise exception 'too many requests, try again later'
      using errcode = '42P14';
  end if;

  insert into public.waitlist (email, note)
  values (v_email, nullif(trim(coalesce(p_note, '')), ''))
  on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.submit_waitlist(text, text) from public;
grant execute on function public.submit_waitlist(text, text) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- admin_list_waitlist(status) — admin-only
-- ────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_waitlist(p_status text default 'pending')
returns table (
  id uuid,
  email text,
  note text,
  status text,
  invite_code text,
  created_at timestamptz,
  reviewed_at timestamptz
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
    select w.id, w.email, w.note, w.status, w.invite_code, w.created_at, w.reviewed_at
      from public.waitlist w
     where p_status = 'all' or w.status = p_status
     order by w.created_at desc
     limit 200;
end;
$$;

revoke all on function public.admin_list_waitlist(text) from public;
grant execute on function public.admin_list_waitlist(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- admin_approve_waitlist(id) — admin-only
-- Generates a 12-char URL-safe invite code, inserts it into
-- public.beta_invites with a 30-day expiry, marks the waitlist row
-- as approved. Returns the generated code for the admin UI.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.admin_approve_waitlist(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_status text;
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  select email, status into v_email, v_status
    from public.waitlist where id = p_id for update;

  if v_email is null then
    raise exception 'waitlist entry not found' using errcode = 'P0002';
  end if;

  if v_status <> 'pending' then
    raise exception 'waitlist entry is not pending (status: %)', v_status
      using errcode = '42P01';
  end if;

  -- Generate a 12-character URL-safe code by stripping non-alphanumerics
  -- from a uuid and uppercasing. Loop until we hit a code not already in
  -- beta_invites (collisions essentially never happen but guard anyway).
  loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (select 1 from public.beta_invites where code = v_code);
  end loop;

  insert into public.beta_invites (code, active, expires_at)
  values (v_code, true, now() + interval '30 days');

  update public.waitlist
     set status = 'approved',
         invite_code = v_code,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_id;

  return v_code;
end;
$$;

revoke all on function public.admin_approve_waitlist(uuid) from public;
grant execute on function public.admin_approve_waitlist(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- admin_decline_waitlist(id) — admin-only
-- ────────────────────────────────────────────────────────────────────
create or replace function public.admin_decline_waitlist(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  update public.waitlist
     set status = 'declined',
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_id
     and status = 'pending';

  return found;
end;
$$;

revoke all on function public.admin_decline_waitlist(uuid) from public;
grant execute on function public.admin_decline_waitlist(uuid) to authenticated;
