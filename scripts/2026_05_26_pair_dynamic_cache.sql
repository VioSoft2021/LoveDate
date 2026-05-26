-- 2026-05-26 Tier B — server-side cache for AI Pair Dynamic reveals
--
-- Stores Claude-generated "your dynamic together" reveals keyed on a
-- stable pair_cache_key (computed client-side as a hash of sorted user
-- IDs + both users' rounded Big Five scores + attachment styles +
-- language). The ai-pair-dynamic-reveal Edge Function checks this table
-- before invoking Claude — if a fresh reveal exists for the same pair +
-- scores + language, return it. Otherwise call Claude, write the new
-- reveal, return it.
--
-- This means: when User A first reveals their dynamic with User B, the
-- result is cached server-side. When User B opens the same match's
-- profile and taps "Reveal our dynamic", the function returns the
-- cached row in ~200ms instead of paying for a fresh $0.02 Claude call.
-- localStorage on each device still acts as the L1 cache (instant, no
-- network round-trip).
--
-- TTL: 30 days from created_at. Rows older than that are treated as
-- stale and trigger a fresh Claude call. A scheduled job to vacuum
-- stale rows can be added later — for v1 the row count will be tiny.
--
-- Cache invalidation: whenever either user retakes the Love Personality
-- quiz, their derived Big Five + attachment scores change → the
-- client-computed pair_cache_key changes → next reveal request misses
-- and triggers a fresh Claude call.
--
-- Security: no policies. Only the Edge Function (which runs with
-- SUPABASE_SERVICE_ROLE_KEY) can read or write this table. Reveals
-- aren't sensitive (no PII beyond the psychological framing), but
-- keeping them service-only avoids any chance of clients enumerating
-- pair-by-pair.

set search_path = public;

create table if not exists public.pair_dynamic_cache (
  cache_key  text         primary key,
  language   text         not null check (language in ('en', 'ro')),
  reveal     jsonb        not null,
  created_at timestamptz  not null default now()
);

comment on table public.pair_dynamic_cache is
  'Server-side cache for AI Pair Dynamic reveals (Tier B, 2026-05-26). Keyed on a hash of sorted user IDs + both users'' scores + language. 30-day TTL enforced at read time.';
comment on column public.pair_dynamic_cache.cache_key is
  'Stable hash of sorted user IDs + both users'' rounded BigFive + attachment + language. Identical key from both members of the pair so they share one cached reveal.';
comment on column public.pair_dynamic_cache.reveal is
  'The full reveal JSON: { pairArchetype, headline, description, strengths, frictions, sharedGrowthEdge }.';
comment on column public.pair_dynamic_cache.created_at is
  'When this reveal was written. Reveals older than 30 days are treated as stale and re-generated.';

create index if not exists pair_dynamic_cache_created_at_idx
  on public.pair_dynamic_cache(created_at);

-- RLS on, no policies — table is service-role only. Edge Function reads
-- and writes via the service_role key; nothing else can touch it.
alter table public.pair_dynamic_cache enable row level security;
