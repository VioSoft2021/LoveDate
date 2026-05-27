-- 2026-05-27 — Server-side cache for AI match-score reveals
--
-- The pair_dynamic_cache table (2026-05-26) already caches Pair Dynamic
-- reveals server-side; this migration adds an equivalent cache for
-- match-score results. Same shape, same TTL, same service-role-only
-- access pattern.
--
-- Why now: yesterday's rate-limit incident (171 hits in 24h on Tier 1)
-- was driven by ai-match-score firing for every card flip during dev
-- testing. The client already caches in localStorage, but rebuilds /
-- new devices / cleared storage all reset that cache → every card
-- becomes a fresh Sonnet call. Server cache stays warm across devices,
-- across builds, and across both members of a pair (User B viewing
-- User A's card hits the same cache row).
--
-- Key shape: SHA-256 hex of a deterministic JSON subset of the request
-- body (the fields that actually affect the score). Computed in the
-- Edge Function via Deno's crypto.subtle.digest.
--
-- TTL: 30 days from created_at, enforced at read time. Rows older than
-- that are treated as stale and trigger a fresh Claude call.
--
-- Cache invalidation: whenever either profile is edited (any field the
-- prompt uses), the new hash misses and a fresh call fires. This is
-- automatic — no manual cache-bust required.
--
-- Idempotent.

set search_path = public;

create table if not exists public.match_score_cache (
  cache_key  text         primary key,
  language   text         not null check (language in ('en', 'ro')),
  payload    jsonb        not null,
  created_at timestamptz  not null default now()
);

comment on table public.match_score_cache is
  'Server-side cache for AI match-score results (2026-05-27). Keyed on a SHA-256 of the request body subset that affects the score. 30-day TTL enforced at read time. Service-role-only, no policies.';

comment on column public.match_score_cache.cache_key is
  'SHA-256 hex of {self profile fields, candidate id + profile fields, language, viewerPreference}. Deterministic across devices and builds.';

comment on column public.match_score_cache.payload is
  'Full match-score result JSON: { score, reasons, redFlags, frictionPoints, tips }.';

comment on column public.match_score_cache.created_at is
  'When this score was written. Rows older than 30 days are treated as stale and re-generated.';

create index if not exists match_score_cache_created_at_idx
  on public.match_score_cache(created_at);

-- Service-role only. No policies — the Edge Function uses the service
-- role key. Clients cannot read or write directly; the cached result
-- comes back through the Edge Function response just like a fresh call.
alter table public.match_score_cache enable row level security;
