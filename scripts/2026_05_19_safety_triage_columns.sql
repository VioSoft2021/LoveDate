-- 2026-05-19 add AI triage columns to safety_reports
--
-- Migration applied after scripts/supabase_beta_setup.sql and after
-- scripts/2026_05_19_privatize_sensitive_fields.sql. Idempotent.
--
-- The ai-safety-triage Edge Function calls Claude Haiku 4.5 with the
-- report contents + reported profile snapshot and writes the verdict
-- back here via the service role. Operator views in Moderation Center
-- sort the queue by risk_level DESC + created_at DESC so the worst
-- new reports surface first.

set search_path = public;

alter table public.safety_reports
  add column if not exists ai_risk_level text
    check (ai_risk_level is null or ai_risk_level in ('low','medium','high')),
  add column if not exists ai_categories text[] not null default '{}',
  add column if not exists ai_summary text,
  add column if not exists ai_triaged_at timestamptz;

create index if not exists safety_reports_ai_risk_idx
  on public.safety_reports (ai_risk_level, created_at desc);

comment on column public.safety_reports.ai_risk_level is
  'low/medium/high — written by ai-safety-triage Edge Function. NULL until triaged.';
comment on column public.safety_reports.ai_categories is
  'AI-classified categories (one or more from the safety_reports.category check list). May or may not match the reporter-chosen category — operators see both.';
comment on column public.safety_reports.ai_summary is
  'Short admin-facing summary the operator reads instead of the full report. Empty until triaged.';
