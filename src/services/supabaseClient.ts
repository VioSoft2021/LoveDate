import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined)

const supabaseKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined)

export const createSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseKey)
}
