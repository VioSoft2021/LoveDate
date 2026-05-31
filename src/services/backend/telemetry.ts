// src/services/backend/telemetry.ts — split from backendApi.ts (2026-05-31).
import { supabase, getCurrentUserId } from './client'

/**
 * MED-15 — fire-and-forget crash logging. Captures React render errors
 * (via ErrorBoundary), unhandled promise rejections, and window errors
 * to the public.client_errors table. Anonymous inserts are allowed so a
 * crash that happens before auth can still self-report.
 *
 * The caller MUST NOT await this in error-path code — a logging failure
 * must never compound the already-broken state. We catch every throw and
 * swallow it silently.
 */
export type ClientErrorSeverity = 'react-render' | 'unhandled-rejection' | 'window-error'
export type ClientErrorRow = {
  id: string
  user_id: string | null
  severity: ClientErrorSeverity
  message: string
  stack: string | null
  component_stack: string | null
  url: string | null
  user_agent: string | null
  app_version: string | null
  created_at: string
}
/**
 * Admin-only read of recent crash reports. RLS allows the query only for
 * users in public.admins; for everyone else the SELECT returns 0 rows.
 * The crash inbox in ModerationScreen calls this on mount + refresh.
 */
export const backendListClientErrors = async (limit = 50): Promise<ClientErrorRow[]> => {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('client_errors')
    .select('id, user_id, severity, message, stack, component_stack, url, user_agent, app_version, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) {
    return []
  }
  return data as ClientErrorRow[]
}
export const backendLogClientError = (input: {
  severity: ClientErrorSeverity
  message: string
  stack?: string | null
  componentStack?: string | null
}): void => {
  if (!supabase) return
  // Alias the null-checked client to a local const so the narrowing survives
  // into the async .then/.catch closures below (an imported binding's narrowing
  // does not, unlike the module-local const this used to be in backendApi.ts).
  const db = supabase
  if (typeof window === 'undefined') return

  // Truncate any unbounded fields so a giant stack can't blow up the
  // insert. Postgres text is unlimited but the network round-trip and
  // the operator UI both prefer reasonable sizes.
  const cap = (value: string | null | undefined, limit: number): string | null => {
    if (!value) return null
    return value.length > limit ? value.slice(0, limit) : value
  }

  const payload = {
    severity: input.severity,
    message: cap(input.message, 2000) ?? '(no message)',
    stack: cap(input.stack ?? null, 8000),
    component_stack: cap(input.componentStack ?? null, 8000),
    url: cap(window.location?.href ?? null, 2000),
    user_agent: cap(window.navigator?.userAgent ?? null, 500),
    app_version:
      typeof __BUILD_HASH__ === 'string' && __BUILD_HASH__.length > 0
        ? __BUILD_HASH__
        : null,
  }

  // user_id is auto-populated by Postgres from the request JWT via the
  // anon key — actually no, we don't have a default value or trigger. We
  // attach auth.uid() manually below so the FK to auth.users resolves.
  void getCurrentUserId()
    .then(async (userId) => {
      const insertPayload: Record<string, unknown> = { ...payload }
      if (userId) insertPayload.user_id = userId
      try {
        await db.from('client_errors').insert(insertPayload)
      } catch {
        // Silently drop — the page is already broken; don't recurse.
      }
    })
    .catch(() => {
      // Same as above — getCurrentUserId() can throw if the network is
      // gone. We still try the insert without a user_id; if that also
      // fails it just disappears.
      try {
        void db.from('client_errors').insert(payload)
      } catch {
        /* noop */
      }
    })
}
