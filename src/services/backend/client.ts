// src/services/backend/client.ts — split from backendApi.ts (2026-05-31).
import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { runtimeConfig } from '../runtimeConfig'

type BackendMode = 'supabase' | 'local-fallback'
const LOCAL_SETTINGS_KEY = 'lovedate:settings'
const LOCAL_PREFERENCES_KEY = 'lovedate:preferences'
const LOCAL_INVITE_PASS_KEY = 'lovedate:invite-pass'
const LOCAL_INVITE_ATTEMPTS_KEY = 'lovedate:invite-attempts'
const LOCAL_SELF_PROFILE_KEY = 'lovedate:self-profile'
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined)
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined)
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
const persistLocal = <T>(key: string, payload: T): void => {
  window.localStorage.setItem(key, JSON.stringify(payload))
}
const profileKeyForEmail = (email: string): string => {
  const safe = email.trim().toLowerCase()
  return safe.length > 0 ? `${LOCAL_SELF_PROFILE_KEY}:${safe}` : `${LOCAL_SELF_PROFILE_KEY}:guest`
}
const getCurrentUserId = async (): Promise<string | null> => {
  if (!supabase) {
    return null
  }

  // Prefer the cached session — getSession() reads from the in-memory
  // client and is populated synchronously by the sign-in call. getUser()
  // hits the server and races with the just-completed sign-in on a fresh
  // install, occasionally returning null before the token is accepted.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.user?.id) {
    return session.user.id
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}
export const getBackendMode = (): BackendMode => {
  if (!supabase && import.meta.env.PROD && !runtimeConfig.backend.allowLocalFallbackInProduction) {
    return 'local-fallback'
  }
  return supabase ? 'supabase' : 'local-fallback'
}
/**
 * Self-profile cache scrubbing — defense-in-depth against shared-device leaks.
 *
 * Removing the global-fallback read (already in place above) prevents User B
 * from seeing User A's profile in the UI. But User A's data still sits at rest
 * in localStorage under `lovedate:self-profile:userA@x.com`, readable via
 * devtools, an Android backup, or any code path that doesn't honor the
 * per-email gating. These helpers actively delete that data at every auth
 * transition.
 *
 * Two flavours:
 *   - purgeOtherSelfProfileCaches(currentEmail): wipes every per-email cache
 *     except the current user's. Call on sign-in/register.
 *   - purgeAllSelfProfileCaches(): wipes everything. Call on sign-out so the
 *     next person on the device starts from cloud, not from User A's leftovers.
 *
 * Both also remove the bare legacy `lovedate:self-profile` key — orphaned by
 * the earlier fallback removal but still present on devices that used
 * pre-fix builds.
 */
const removeSelfProfileKeysExcept = (keepKey: string | null): void => {
  const prefix = `${LOCAL_SELF_PROFILE_KEY}:`
  const removals: string[] = []
  // Always clear the bare legacy key (orphaned from pre-fix global fallback).
  removals.push(LOCAL_SELF_PROFILE_KEY)
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i)
    if (key && key.startsWith(prefix) && key !== keepKey) {
      removals.push(key)
    }
  }
  for (const key of removals) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // continue — localStorage operations are best-effort
    }
  }
}
const VALID_GENDERS = new Set(['Woman', 'Man', 'Non-binary'])
const PROFILE_PHOTOS_BUCKET = 'profile-photos'
const VERIFICATION_BUCKET = 'verification-selfies'
const dataUrlToBlob = (dataUrl: string): { blob: Blob; mimeType: string } | null => {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(dataUrl)
  if (!match) {
    return null
  }
  const mimeType = match[1]
  const base64 = match[2]
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return { blob: new Blob([bytes], { type: mimeType }), mimeType }
  } catch {
    return null
  }
}
const generatePhotoFilename = (mimeType: string): string => {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const random = Math.random().toString(36).slice(2, 10)
  return `${Date.now()}-${random}.${ext}`
}
const isDataUrl = (value: string): boolean => value.startsWith('data:')

// internal exports for ./backend/* domain modules
export type { BackendMode }
export { LOCAL_SETTINGS_KEY, LOCAL_PREFERENCES_KEY, LOCAL_INVITE_PASS_KEY, LOCAL_INVITE_ATTEMPTS_KEY, LOCAL_SELF_PROFILE_KEY, supabaseUrl, supabaseAnonKey, supabase, wait, persistLocal, profileKeyForEmail, getCurrentUserId, removeSelfProfileKeysExcept, VALID_GENDERS, PROFILE_PHOTOS_BUCKET, VERIFICATION_BUCKET, dataUrlToBlob, generatePhotoFilename, isDataUrl }
