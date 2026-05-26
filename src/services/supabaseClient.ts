import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Re-export so existing callers can keep importing INITIAL_URL_HASH
// from this module. The actual snapshot lives in services/initialHash
// (imported first in main.tsx) so it runs BEFORE backendApi.ts
// creates its own Supabase client and clears the URL fragment.
export { INITIAL_URL_HASH } from './initialHash'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined)

const supabaseKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined)

/**
 * Singleton Supabase client. Earlier versions of this module created
 * a NEW client on every call, which meant each consumer of the auth
 * API had its own auth state — events fired on one instance didn't
 * reach subscribers on another. Caching the instance gives all
 * callers a consistent auth state + event stream.
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
