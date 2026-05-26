-- 2026-05-26 Recovery requests — replaces the Resend-based admin notify
--
-- When a user taps "Forgot password" in Privé:
--   1. Client calls notify-admin-recovery Edge Function with their email.
--   2. The Edge Function uses the service_role key to call
--      auth.admin.generateLink (type='recovery'), which returns a URL
--      containing a one-time recovery token. NO email is sent by anyone.
--   3. The Edge Function inserts a row into recovery_requests with the
--      user's email + the recovery link + status='pending'.
--   4. Master opens InviteAdmin, sees the pending request, copies the
--      link, and delivers it to the user via WhatsApp / Signal / email
--      (whatever channel works for that person).
--   5. Master taps "Mark as sent" → row moves to status='sent'.
--
-- No email service required. No DNS verification. No rate limits beyond
-- Supabase itself. One admin inbox (InviteAdmin) instead of two.
--
-- The previous Resend-based path can be removed (revoke RESEND_API_KEY
-- from the Edge Function secrets, optionally delete the Resend account).
--
-- Idempotent.

set search_path = public;

create table if not exists public.recovery_requests (
  id            uuid         primary key default gen_random_uuid(),
  email         text         not null,
  recovery_link text         not null,
  status        text         not null default 'pending'
                  check (status in ('pending', 'sent', 'dismissed')),
  created_at    timestamptz  not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid         references auth.users(id) on delete set null
);

comment on table public.recovery_requests is
  'Inbox of pending "forgot password" requests. The Edge Function notify-admin-recovery inserts a row containing a recovery link generated via auth.admin.generateLink. Master delivers the link manually from InviteAdmin and marks the row as sent.';

create index if not exists recovery_requests_status_created_idx
  on public.recovery_requests (status, created_at desc);

-- Service-role-only writes. Reads + status updates happen via the
-- SECURITY DEFINER RPCs below. RLS on with no policies means clients
-- (even authenticated ones) cannot select / insert / update directly.
alter table public.recovery_requests enable row level security;

-- ────────────────────────────────────────────────────────────────────
-- admin_list_recovery_requests(status) — admin-only
-- ────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_recovery_requests(p_status text default 'pending')
returns table (
  id            uuid,
  email         text,
  recovery_link text,
  status        text,
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
    select r.id, r.email, r.recovery_link, r.status, r.created_at, r.reviewed_at
      from public.recovery_requests r
     where p_status = 'all' or r.status = p_status
     order by r.created_at desc
     limit 200;
end;
$$;

revoke all on function public.admin_list_recovery_requests(text) from public;
grant execute on function public.admin_list_recovery_requests(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- admin_mark_recovery_sent(id) — admin-only
-- Used after Master has copied the link and delivered it to the user.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.admin_mark_recovery_sent(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  update public.recovery_requests
     set status = 'sent',
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_id
     and status = 'pending';

  return found;
end;
$$;

revoke all on function public.admin_mark_recovery_sent(uuid) from public;
grant execute on function public.admin_mark_recovery_sent(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- admin_dismiss_recovery_request(id) — admin-only
-- For obvious spam / typos where the user wasn't actually trying to
-- reset, or where Master decides not to send a link.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.admin_dismiss_recovery_request(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  update public.recovery_requests
     set status = 'dismissed',
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_id
     and status = 'pending';

  return found;
end;
$$;

revoke all on function public.admin_dismiss_recovery_request(uuid) from public;
grant execute on function public.admin_dismiss_recovery_request(uuid) to authenticated;
