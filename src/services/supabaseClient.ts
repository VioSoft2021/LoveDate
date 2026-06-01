import { type SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './backend/client'

// Re-export so existing callers can keep importing INITIAL_URL_HASH from
// here. The actual snapshot lives in services/initialHash (imported FIRST in
// main.tsx) so it runs BEFORE the Supabase client is created and clears the
// URL fragment.
export { INITIAL_URL_HASH } from './initialHash'

/**
 * Single app-wide Supabase client.
 *
 * 2026-06-01 — UNIFIED to ONE client. This module used to create its OWN
 * client, separate from backend/client.ts's. The two had independent auth
 * state, and the recovery token in the URL was consumed by whichever client
 * was created first — the eager backend one (imported app-wide) — which then
 * cleared the hash. useAuth's lazily-created client therefore never saw the
 * session. Result: password recovery's "set a new password" card appeared
 * (driven by the INITIAL_URL_HASH snapshot) but updateUser() ran on the
 * session-less client and failed with "Couldn't update your password."
 *
 * Returning the backend client here means auth + backend share ONE session,
 * so recovery — and every other auth-state read — runs on the same instance
 * that actually processed the URL.
 */
export const createSupabaseClient = (): SupabaseClient | null => supabase
