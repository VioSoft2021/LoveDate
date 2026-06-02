-- Privé — native device push tokens for OFFLINE CALL RINGING.
--
-- The installed app (Capacitor/Android) receives background pushes via FCM, not
-- Web Push. This table holds each user's FCM/APNs device token(s); the
-- `send-call-push` Edge Function fans an incoming-call notification out to BOTH
-- these native tokens AND the browser Web-Push rows in `push_subscriptions`.
--
-- Apply in the Supabase SQL editor (idempotent).

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists device_push_tokens_user_idx
  on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

-- Owners manage their own device tokens; the Edge Function reads them via the
-- service role (bypasses RLS).
drop policy if exists "device_push_tokens_owner_select" on public.device_push_tokens;
create policy "device_push_tokens_owner_select"
on public.device_push_tokens for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "device_push_tokens_owner_insert" on public.device_push_tokens;
create policy "device_push_tokens_owner_insert"
on public.device_push_tokens for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "device_push_tokens_owner_update" on public.device_push_tokens;
create policy "device_push_tokens_owner_update"
on public.device_push_tokens for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "device_push_tokens_owner_delete" on public.device_push_tokens;
create policy "device_push_tokens_owner_delete"
on public.device_push_tokens for delete to authenticated
using (auth.uid() = user_id);
