-- 2026-05-20 client_errors — production crash reporting (MED-15)
--
-- Captures React render errors, unhandled promise rejections, and global
-- window errors from the client. Inserts are open to anonymous users so a
-- crash that happens BEFORE auth can still report itself; selects are
-- restricted to operators in public.admins. Service role bypasses RLS as
-- usual so any future server-side trigger can read the queue.
--
-- The client writes fire-and-forget — a logging failure must never cascade
-- into the already-broken UI. Helper in src/services/backendApi.ts
-- (backendLogClientError) catches and silences any insert error.
--
-- Idempotent.

set search_path = public;

create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  severity text not null
    check (severity in ('react-render', 'unhandled-rejection', 'window-error')),
  message text not null,
  stack text,
  component_stack text,
  url text,
  user_agent text,
  app_version text,
  created_at timestamptz not null default now()
);

create index if not exists client_errors_created_at_idx
  on public.client_errors (created_at desc);

create index if not exists client_errors_severity_created_at_idx
  on public.client_errors (severity, created_at desc);

alter table public.client_errors enable row level security;

-- Anonymous + authenticated clients can insert their own crash reports.
-- We do not let them read or update — operators see everything via admin
-- policy below, and replays are intentionally one-way.
drop policy if exists client_errors_insert_anyone on public.client_errors;
create policy client_errors_insert_anyone
  on public.client_errors
  for insert
  to anon, authenticated
  with check (true);

-- Operators in public.admins read the queue.
drop policy if exists client_errors_admins_read on public.client_errors;
create policy client_errors_admins_read
  on public.client_errors
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admins a
      where a.user_id = auth.uid()
    )
  );

comment on table public.client_errors is
  'Client-side crash queue. Inserts are open (anon allowed) so pre-auth crashes can self-report; reads are admin-only.';
comment on column public.client_errors.severity is
  'react-render = caught by ErrorBoundary. unhandled-rejection = window.onunhandledrejection. window-error = window.onerror.';
comment on column public.client_errors.app_version is
  'Build hash injected at build time (__BUILD_HASH__) so we can correlate spikes with a deploy.';
