import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined)

const supabaseKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined)

/**
 * Snapshot of `window.location.hash` taken at module-load time —
 * BEFORE any Supabase client gets created. Supabase JS auto-consumes
 * the URL fragment on client creation (when `detectSessionInUrl` is
 * true, the default), so by the time React mounts and our hooks run
 * the hash is already gone. This snapshot lets us inspect it after
 * the fact — critical for detecting `type=recovery` (password-reset
 * email click) which must drive a UI branch in LoginScreen.
 *
 * Captured 2026-05-26 after Master tested the password-reset link
 * and the app couldn't detect the recovery state (hash was empty by
 * the time useAuth's effect ran).
 */
export const INITIAL_URL_HASH: string =
  typeof window !== 'undefined' ? window.location.hash : ''

/**
 * Singleton Supabase client. Earlier versions of this module created
 * a NEW client on every call, which meant each consumer of the auth
 * API had its own auth state — events fired on one instance didn't
 * reach subscribers on another, breaking PASSWORD_RECOVERY detection
 * end-to-end. Caching the instance fixes this: all callers share
 * the same auth state, same event stream, same listeners.
 */
let cachedClient: SupabaseClient | null = null

export const createSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseKey) {
    return null
  }
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseKey)
  }
  return cachedClient
}
