import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SelfProfile } from '../domain/profile'
import { isAllowedEmailDomain, runtimeConfig } from './runtimeConfig'

export type SettingsPayload = {
  pushNotifications: boolean
  emailNotifications: boolean
}

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

export const backendLogin = async (email: string, password: string): Promise<{ email: string }> => {
  if (!isAllowedEmailDomain(email)) {
    throw new Error('Email domain not allowed for this beta.')
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return { email: data.user?.email ?? email }
  }

  await wait(280)
  if (!email.includes('@') || password.length < 6) {
    throw new Error('Invalid credentials')
  }

  return { email }
}

export const backendRegister = async (
  email: string,
  password: string,
): Promise<{ email: string; signedIn: boolean; needsEmailConfirmation: boolean }> => {
  if (!isAllowedEmailDomain(email)) {
    throw new Error('Email domain not allowed for this beta.')
  }

  if (password.length < 6) {
    throw new Error('Password must have at least 6 characters.')
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    const signedIn = Boolean(data.session)

    // If we have an active session, record which invite code this user
    // signed up with. The admin's Codes admin screen joins on this so
    // it can search by user email later. Fire-and-forget: never let an
    // audit/link insert failure break signup.
    if (signedIn) {
      void recordInviteRedemption()
    }

    return {
      email: data.user?.email ?? email,
      signedIn,
      needsEmailConfirmation: !signedIn,
    }
  }

  await wait(320)
  return {
    email,
    signedIn: true,
    needsEmailConfirmation: false,
  }
}

export const backendGuestLogin = async (): Promise<{ email: string }> => {
  if (!runtimeConfig.auth.allowGuestLogin) {
    throw new Error('Guest login disabled')
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signInAnonymously()

    if (!error) {
      return {
        email: data.user?.email ?? 'guest@lovedate.app',
      }
    }
  }

  await wait(180)
  return { email: 'guest@lovedate.app' }
}

export const backendSignOut = async (): Promise<void> => {
  if (supabase) {
    await supabase.auth.signOut()
  }
}

const normalizeInvite = (code: string): string => code.trim().toUpperCase()

const getEnvInviteCodes = (): Set<string> => {
  const raw =
    (import.meta.env.VITE_BETA_INVITE_CODES as string | undefined) ??
    (import.meta.env.NEXT_PUBLIC_BETA_INVITE_CODES as string | undefined) ??
    ''
  const parsed = new Set(
    raw
      .split(',')
      .map((item) => normalizeInvite(item))
      .filter((item) => item.length > 0),
  )
  // Keep guaranteed beta fallback codes so packaged desktop builds never lock out testers.
  parsed.add('LOVE-BETA-001')
  parsed.add('LOVEDATE-BETA-001')
  return parsed
}

const isInviteAlreadyValidated = (inviteCode: string): boolean => {
  const stored = window.localStorage.getItem(LOCAL_INVITE_PASS_KEY)
  return stored === normalizeInvite(inviteCode)
}

const rememberValidatedInvite = (inviteCode: string): void => {
  window.localStorage.setItem(LOCAL_INVITE_PASS_KEY, normalizeInvite(inviteCode))
}

/**
 * Sends the invite code this user signed up with to the
 * record-invite-redemption Edge Function so the admin can later look up
 * "which code did this email use". Fire-and-forget: swallow failures.
 */
const recordInviteRedemption = async (): Promise<void> => {
  if (!supabase) return
  const cached = window.localStorage.getItem(LOCAL_INVITE_PASS_KEY)
  if (!cached) return
  try {
    await supabase.functions.invoke('record-invite-redemption', {
      body: { code: cached },
    })
  } catch {
    // Best-effort. The admin can still find this user by other means.
  }
}

const getRecentInviteAttempts = (): number[] => {
  const raw = window.localStorage.getItem(LOCAL_INVITE_ATTEMPTS_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  } catch {
    return []
  }
}

const recordInviteAttempt = (): void => {
  const now = Date.now()
  const cutoff = now - 15 * 60 * 1000
  const kept = getRecentInviteAttempts().filter((value) => value >= cutoff)
  kept.push(now)
  window.localStorage.setItem(LOCAL_INVITE_ATTEMPTS_KEY, JSON.stringify(kept))
}

const assertInviteAttemptLimit = (): void => {
  const maxAttempts = Math.max(3, runtimeConfig.limits.inviteAttemptsPer15Min)
  const now = Date.now()
  const cutoff = now - 15 * 60 * 1000
  const attempts = getRecentInviteAttempts().filter((value) => value >= cutoff)
  if (attempts.length >= maxAttempts) {
    throw new Error('Too many invite attempts. Please wait and retry.')
  }
}

export const backendValidateInviteCode = async (inviteCode: string): Promise<void> => {
  if (!runtimeConfig.auth.requireInviteCode) {
    return
  }

  const normalized = normalizeInvite(inviteCode)
  if (normalized.length < 4) {
    throw new Error('Invite code too short')
  }

  // Permanent beta bypass codes for local/desktop test builds.
  if (normalized === 'LOVE-BETA-001' || normalized === 'LOVEDATE-BETA-001') {
    rememberValidatedInvite(normalized)
    return
  }

  assertInviteAttemptLimit()
  recordInviteAttempt()

  if (isInviteAlreadyValidated(normalized)) {
    return
  }

  const envCodes = getEnvInviteCodes()
  if (envCodes.has(normalized)) {
    rememberValidatedInvite(normalized)
    return
  }

  if (supabase) {
    // Calls a SECURITY DEFINER RPC instead of selecting from beta_invites
    // directly. Direct SELECT used to be allowed for `anon`, which let
    // anyone with the public anon key dump every active invite code. The
    // RPC only answers a yes/no for the supplied code.
    const { data, error } = await supabase.rpc('validate_beta_invite', {
      p_code: normalized,
    })

    if (!error && data === true) {
      rememberValidatedInvite(normalized)
      return
    }
  }

  throw new Error('Invite code not valid')
}

/**
 * Synchronous local cache read — used at app init for instant render
 * before the cloud copy arrives. Returns null when no cache exists.
 */
export const backendReadSelfProfile = (email: string): Record<string, unknown> | null => {
  // Only read the namespaced profile cache for the provided email.
  // Avoid falling back to the global `lovedate:self-profile` key which
  // can leak another user's cached profile on shared devices.
  const key = profileKeyForEmail(email)
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch {
    // Ignore malformed local cache entries.
  }

  return null
}

/**
 * Async cloud read — call after authentication to pull the latest profile
 * from Supabase. Returns null when:
 *   - Supabase is not configured (local-fallback mode)
 *   - The user is not signed in to Supabase
 *   - No row exists yet for this user (new account)
 *   - The fetch failed (offline, RLS, table missing) — caller falls back to cache
 *
 * On a successful read, the cloud copy is also written back to localStorage
 * so the next cold start renders instantly.
 */
export const backendFetchSelfProfile = async (
  email: string,
): Promise<Record<string, unknown> | null> => {
  if (!supabase) {
    return null
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('profile_data')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const profile = data.profile_data as Record<string, unknown> | null
  if (!profile || typeof profile !== 'object') {
    return null
  }

  // Refresh the local cache so subsequent cold starts render instantly.
  persistLocal(profileKeyForEmail(email), profile)

  return profile
}

/**
 * Save profile to local cache immediately, then sync to Supabase in the
 * background. Throws only when the cloud sync explicitly fails — the local
 * write always succeeds first so the UI stays responsive.
 *
 * Accepts a typed `SelfProfile`. The internal cast to
 * `Record<string, unknown>` (for the JSONB column + the legacy
 * `backendEnsureDiscoverableProfile` defensive parser) lives here so call
 * sites stay clean and type-checked.
 */
export const backendSaveSelfProfile = async (
  email: string,
  profile: SelfProfile,
): Promise<void> => {
  const payload = profile as unknown as Record<string, unknown>
  persistLocal(profileKeyForEmail(email), payload)

  if (!supabase) {
    return
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }

  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      profile_data: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    throw new Error(`Cloud profile sync failed: ${error.message}`)
  }

  await backendEnsureDiscoverableProfile(userId, payload)
}

// Dev helpers: synchronous local-only operations to aid testing in DEV.
export const backendSetLocalSelfProfile = (email: string, profile: SelfProfile): void => {
  persistLocal(profileKeyForEmail(email), profile as unknown as Record<string, unknown>)
}

export const backendResetLocalSelfProfile = (email: string): void => {
  try {
    window.localStorage.removeItem(profileKeyForEmail(email))
  } catch {
    // ignore
  }
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

export const purgeOtherSelfProfileCaches = (currentEmail: string): void => {
  removeSelfProfileKeysExcept(profileKeyForEmail(currentEmail))
}

export const purgeAllSelfProfileCaches = (): void => {
  removeSelfProfileKeysExcept(null)
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

/**
 * Uploads a base64 data URL to the profile-photos storage bucket and returns
 * its public URL. Returns null on any failure (caller should fall back to
 * keeping the data URL so the user is not blocked offline).
 */
export const backendUploadProfilePhoto = async (dataUrl: string): Promise<string | null> => {
  if (!supabase) {
    return null
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return null
  }

  const decoded = dataUrlToBlob(dataUrl)
  if (!decoded) {
    return null
  }

  const path = `${userId}/${generatePhotoFilename(decoded.mimeType)}`
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, decoded.blob, {
      contentType: decoded.mimeType,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
     
    console.warn('Profile photo upload failed:', uploadError.message)
    return null
  }

  const { data } = supabase.storage.from(PROFILE_PHOTOS_BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

// ── Selfie-pose verification (anti-fake, 2026-05-27) ──────────────

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected'

export type AdminVerificationRequest = {
  id: string
  userId: string
  name: string
  email: string
  photos: string[]
  pose: string
  selfiePath: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

/** Upload a live-camera selfie to the PRIVATE verification bucket.
 *  Returns the storage PATH (not a public URL — the bucket is private;
 *  admins fetch it later via a signed URL). */
export const backendUploadVerificationSelfie = async (
  dataUrl: string,
): Promise<string | null> => {
  if (!supabase) return null
  const userId = await getCurrentUserId()
  if (!userId) return null
  const decoded = dataUrlToBlob(dataUrl)
  if (!decoded) return null

  const path = `${userId}/${generatePhotoFilename(decoded.mimeType)}`
  const { error } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .upload(path, decoded.blob, {
      contentType: decoded.mimeType,
      cacheControl: '0',
      upsert: false,
    })
  if (error) {
    console.warn('Verification selfie upload failed:', error.message)
    return null
  }
  return path
}

/** Record a pending verification request for the current user. */
export const backendSubmitVerification = async (
  pose: string,
  selfiePath: string,
): Promise<boolean> => {
  if (!supabase) return false
  const { error } = await supabase.rpc('submit_verification', {
    p_pose: pose,
    p_selfie_path: selfiePath,
  })
  if (error) {
    throw new Error(error.message)
  }
  return true
}

/** The current user's own latest verification status, for UI state. */
export const backendGetMyVerificationStatus = async (): Promise<VerificationStatus> => {
  if (!supabase) return 'none'
  const userId = await getCurrentUserId()
  if (!userId) return 'none'
  const { data, error } = await supabase
    .from('verification_requests')
    .select('status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return 'none'
  const status = (data as { status?: unknown }).status
  return status === 'pending' || status === 'approved' || status === 'rejected'
    ? status
    : 'none'
}

/** Admin: list verification requests with the applicant's name + photos. */
export const backendListVerifications = async (
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
): Promise<AdminVerificationRequest[]> => {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('admin_list_verifications', {
    p_status: status,
  })
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) return []
  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ''),
    userId: String(row.user_id ?? ''),
    name: typeof row.name === 'string' ? row.name : '',
    email: typeof row.email === 'string' ? row.email : '',
    photos: Array.isArray(row.photos)
      ? (row.photos as unknown[]).filter((p): p is string => typeof p === 'string')
      : [],
    pose: typeof row.pose === 'string' ? row.pose : '',
    selfiePath: typeof row.selfie_path === 'string' ? row.selfie_path : '',
    status: (row.status as AdminVerificationRequest['status']) ?? 'pending',
    createdAt: String(row.created_at ?? ''),
  }))
}

/** Admin: create a short-lived signed URL to view a private selfie. */
export const backendGetSelfieSignedUrl = async (
  selfiePath: string,
): Promise<string | null> => {
  if (!supabase) return null
  const { data, error } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrl(selfiePath, 120)
  if (error || !data) return null
  return data.signedUrl
}

/** Admin: approve (→ verified badge) or reject a verification request. */
export const backendReviewVerification = async (
  id: string,
  approve: boolean,
): Promise<boolean> => {
  if (!supabase) return false
  const { error } = await supabase.rpc('admin_review_verification', {
    p_id: id,
    p_approve: approve,
  })
  if (error) throw new Error(error.message)
  return true
}

const isDataUrl = (value: string): boolean => value.startsWith('data:')

/**
 * Walks an array of photo strings and replaces any data URLs with uploaded
 * Storage URLs. Items already at https:// or any non-data URL pass through.
 * Failed uploads keep their original data URL — the caller's persistence
 * still proceeds rather than blocking the save.
 */
/**
 * Phase B3: load the cloud-side block list for the current user. Returns
 * an empty array on any failure (offline, unauthed) so the caller can fall
 * back to its local cache.
 */
export const backendLoadBlockedProfileIds = async (): Promise<number[]> => {
  if (!supabase) {
    return []
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_profile_id')
    .eq('user_id', userId)
  if (error || !data) {
    return []
  }
  return data
    .map((row) => Number(row.blocked_profile_id))
    .filter((id) => Number.isInteger(id))
}

export const backendAddBlock = async (profileId: number): Promise<void> => {
  if (!supabase) {
    return
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }
  const { error } = await supabase
    .from('user_blocks')
    .upsert(
      { user_id: userId, blocked_profile_id: profileId },
      { onConflict: 'user_id,blocked_profile_id' },
    )
  if (error) {
     
    console.warn('Block sync failed:', error.message)
  }
}

export const backendRemoveBlock = async (profileId: number): Promise<void> => {
  if (!supabase) {
    return
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('blocked_profile_id', profileId)
  if (error) {
     
    console.warn('Unblock sync failed:', error.message)
  }
}

/**
 * Bulk-push a local block list to the cloud — used once on first authed
 * app load to migrate existing localStorage entries. Each row uses
 * upsert-on-conflict so re-running is safe.
 */
export const backendBackfillBlocks = async (profileIds: number[]): Promise<void> => {
  if (!supabase || profileIds.length === 0) {
    return
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }
  const rows = profileIds.map((id) => ({ user_id: userId, blocked_profile_id: id }))
  const { error } = await supabase
    .from('user_blocks')
    .upsert(rows, { onConflict: 'user_id,blocked_profile_id' })
  if (error) {
     
    console.warn('Block backfill failed:', error.message)
  }
}

export const backendUploadDataUrlPhotos = async (photos: string[]): Promise<string[]> => {
  const results: string[] = []
  for (const photo of photos) {
    if (!photo || !isDataUrl(photo)) {
      results.push(photo)
      continue
    }
    const uploaded = await backendUploadProfilePhoto(photo)
    results.push(uploaded ?? photo)
  }
  return results
}

/**
 * Phase B1: ensures a row exists in public.profiles keyed by auth_user_id.
 * Currently writes only the minimum fields needed to satisfy NOT NULL
 * constraints, and forces is_active=false so the row does not yet appear
 * in anyone's deck. Phase B4 will widen the synced field set and flip
 * is_active when the profile is complete.
 */
export const backendEnsureDiscoverableProfile = async (
  userId: string,
  profile: Record<string, unknown>,
): Promise<void> => {
  void userId
  if (!supabase) {
    return
  }

  // Build a JSONB payload of the discoverable subset. The server-side
  // sync_discoverable_profile function handles validation, gender
  // coercion, photo-array parsing, and the is_active gating
  // (only true when there is at least one photo + name/age/city/gender).
  const rawGender = typeof profile.gender === 'string' ? profile.gender : ''
  const gender = VALID_GENDERS.has(rawGender) ? rawGender : 'Woman'

  const payload = {
    name: typeof profile.name === 'string' ? profile.name : '',
    age: typeof profile.age === 'number' ? profile.age : null,
    city: typeof profile.city === 'string' ? profile.city : '',
    gender,
    vibe: typeof profile.vibe === 'string' ? profile.vibe : '',
    bio: typeof profile.bio === 'string' ? profile.bio : '',
    interests: Array.isArray(profile.interests)
      ? (profile.interests as unknown[]).filter((v): v is string => typeof v === 'string')
      : [],
    photos: Array.isArray(profile.photos)
      ? (profile.photos as unknown[]).filter((v): v is string => typeof v === 'string' && v.length > 0)
      : [],
    distanceKm: 10,
    relationshipIntent: typeof profile.relationshipIntent === 'string' ? profile.relationshipIntent : 'Long-term',
    zodiac: typeof profile.zodiac === 'string' ? profile.zodiac : 'Libra',
    extras: {
      pronouns: profile.pronouns ?? '',
      orientation: profile.orientation ?? '',
      lookingFor: profile.lookingFor ?? '',
      heightCm: profile.heightCm ?? null,
      jobTitle: profile.jobTitle ?? '',
      education: profile.education ?? '',
      languages: profile.languages ?? [],
      drinking: profile.drinking ?? '',
      smoking: profile.smoking ?? '',
      workout: profile.workout ?? '',
      religion: profile.religion ?? '',
      politics: profile.politics ?? '',
      childrenPlan: profile.childrenPlan ?? '',
      pets: profile.pets ?? '',
      promptOne: profile.promptOne ?? '',
      promptTwo: profile.promptTwo ?? '',
      promptThree: profile.promptThree ?? '',
      dealbreakers: profile.dealbreakers ?? [],
    },
    // Tier A (2026-05-24) — new validated personality assessment. The first 10
    // answers are BFI-10 Big Five; the last 4 are Bartholomew RQ attachment
    // ratings (in the fixed style order: secure, anxious, avoidant, disorganized).
    // sync_discoverable_profile derives the public Big Five vector + primary
    // attachment style server-side; raw answers stay in profile_private.
    bigFiveAnswers: Array.isArray(profile.personalityAnswers)
      ? (profile.personalityAnswers as unknown[]).slice(0, 10).filter(
          (v): v is number => typeof v === 'number' && v >= 1 && v <= 5,
        )
      : undefined,
    attachmentRatings: Array.isArray(profile.personalityAnswers)
      ? (profile.personalityAnswers as unknown[]).slice(10, 14).filter(
          (v): v is number => typeof v === 'number' && v >= 1 && v <= 5,
        )
      : undefined,
    // Stability Assessment (2026-05-30) — optional second test, 12 raw Likert
    // answers. sync_discoverable_profile derives the public stability_profile
    // server-side; raw answers stay in profile_private.
    stabilityAnswers: Array.isArray(profile.stabilityAnswers)
      ? (profile.stabilityAnswers as unknown[]).slice(0, 12).filter(
          (v): v is number => typeof v === 'number' && v >= 1 && v <= 5,
        )
      : undefined,
  }

  const { error } = await supabase.rpc('sync_discoverable_profile', {
    p_payload: payload,
  })

  if (error) {
    // Non-fatal: self-profile already saved.
     
    console.warn('Discoverable profile sync skipped:', error.message)
  }
}

/**
 * One-shot bridge-repair for legacy accounts: any user whose profile was
 * created before the B1 identity bridge has a row in `public.profiles` with
 * a null auth_user_id and is therefore invisible to everyone else. Call this
 * after every successful sign-in / register — it reads the saved self-profile
 * from `user_profiles` and pushes it through `sync_discoverable_profile`,
 * which sets auth_user_id on the row. Idempotent and cheap on already-bridged
 * accounts (just rewrites the same data).
 *
 * Fire-and-forget: failures are logged but never block the auth flow.
 */
export const backendRepairDiscoverableProfile = async (email: string): Promise<void> => {
  if (!supabase) {
    return
  }
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return
    }
    const profile = await backendFetchSelfProfile(email)
    if (!profile) {
      return
    }
    await backendEnsureDiscoverableProfile(userId, profile)
  } catch (error) {
     
    console.warn('Discoverable-profile bridge repair skipped:', error)
  }
}

export const backendSaveSettings = async (settings: SettingsPayload): Promise<void> => {
  persistLocal(LOCAL_SETTINGS_KEY, settings)

  if (!supabase) {
    await wait(220)
    return
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }

  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    push_notifications: settings.pushNotifications,
    email_notifications: settings.emailNotifications,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }
}

const readLocalSettings = (): SettingsPayload | null => {
  try {
    const raw = window.localStorage.getItem(LOCAL_SETTINGS_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<SettingsPayload>
    if (
      typeof parsed.pushNotifications !== 'boolean' ||
      typeof parsed.emailNotifications !== 'boolean'
    ) {
      return null
    }
    return {
      pushNotifications: parsed.pushNotifications,
      emailNotifications: parsed.emailNotifications,
    }
  } catch {
    return null
  }
}

export const backendLoadSettings = async (): Promise<SettingsPayload | null> => {
  const local = readLocalSettings()

  if (!supabase) {
    return local
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return local
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('push_notifications, email_notifications')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) {
    return local
  }

  const cloud: SettingsPayload = {
    pushNotifications: data.push_notifications,
    emailNotifications: data.email_notifications,
  }
  persistLocal(LOCAL_SETTINGS_KEY, cloud)
  return cloud
}

// D3 — hydrate user filter preferences from the cloud on auth.
// Until this shipped, filter values cold-started from initialFilters on
// every session: domain change, new device, signed-out-then-in all
// silently reset the user's saved filter choices. The user_preferences
// table has always been written by backendSavePreferences; nothing was
// reading it. Returns undefined when no row exists (caller keeps the
// existing defaults). Returns the partial 4-field payload the save
// path persists (minAge, maxAge, city, interest) — the other filter
// fields are not yet round-tripped to the cloud.
export const backendLoadPreferences = async (): Promise<{
  minAge: number
  maxAge: number
  city: string
  interest: string
  aiPreferencePrompt: string
} | undefined> => {
  if (!supabase) {
    return undefined
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return undefined
  }
  const { data, error } = await supabase
    .from('user_preferences')
    .select('min_age, max_age, city, interest, ai_preference_prompt')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) {
    if (error) {

      console.warn('Preference hydration failed:', error.message)
    }
    return undefined
  }
  const row = data as {
    min_age?: number | null
    max_age?: number | null
    city?: string | null
    interest?: string | null
    ai_preference_prompt?: string | null
  }
  return {
    minAge: typeof row.min_age === 'number' ? row.min_age : 18,
    maxAge: typeof row.max_age === 'number' ? row.max_age : 60,
    city: typeof row.city === 'string' ? row.city : '',
    interest: typeof row.interest === 'string' ? row.interest : '',
    aiPreferencePrompt:
      typeof row.ai_preference_prompt === 'string' ? row.ai_preference_prompt : '',
  }
}

export const backendSavePreferences = async (payload: {
  minAge: number
  maxAge: number
  city: string
  interest: string
  aiPreferencePrompt: string
}): Promise<void> => {
  persistLocal(LOCAL_PREFERENCES_KEY, payload)

  if (!supabase) {
    await wait(180)
    return
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }

  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    min_age: payload.minAge,
    max_age: payload.maxAge,
    city: payload.city,
    interest: payload.interest,
    ai_preference_prompt: payload.aiPreferencePrompt,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Phase C2 — cloud insert for a profile safety report. Fire-and-forget: the
 * UI flow already updates the local moderation queue immediately, so failures
 * here only forfeit cloud durability, not the user's feedback. Falls silent
 * when running without Supabase credentials.
 */
export const backendSubmitReport = async (input: {
  reportedProfileId: number
  reportedProfileName: string
  category: string
  details: string
  profileSnapshot: {
    age: number
    city: string
    vibe: string
    bio: string
    relationshipGoal: string
    photoUrl: string
  }
}): Promise<{ reportId: string } | null> => {
  if (!supabase) {
    return null
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('safety_reports')
    .insert({
      reporter_id: userId,
      reported_profile_id: input.reportedProfileId,
      profile_snapshot: {
        name: input.reportedProfileName,
        ...input.profileSnapshot,
      },
      category: input.category,
      details: input.details,
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !data?.id) {
     
    console.warn('Safety report cloud insert skipped:', error?.message ?? 'no row id')
    return null
  }

  return { reportId: String(data.id) }
}

/**
 * Phase C4 — user-initiated account deletion. Calls the
 * delete_self_account() SECURITY DEFINER RPC which removes the
 * auth.users row for auth.uid() and cascades through every user-owned
 * table. Returns true on success, false on any failure (caller should
 * surface the error and keep the user signed in if false).
 *
 * NOTE: the caller is responsible for clearing local state (matches,
 * chat threads, profile draft, etc.) and signing out AFTER this returns
 * true. The signOut() call may itself fail because the user no longer
 * exists — that's expected.
 */
export const backendDeleteSelfAccount = async (): Promise<boolean> => {
  if (!supabase) return false
  const { error } = await supabase.rpc('delete_self_account')
  if (error) {

    console.warn('Account deletion failed:', error.message)
    return false
  }
  return true
}

/**
 * Public waitlist — strangers visiting prive-app.club submit a 7-field
 * mini-questionnaire to request access (v2, 2026-05-27). Server-side
 * spam guard limits 3 attempts per email per 24h + validates every
 * field. Returns true on success or throws on validation/rate-limit
 * failures so the form can show a clear message.
 */
export type WaitlistSubmission = {
  email: string
  firstName: string
  age: number
  gender: 'Man' | 'Woman' | 'Other'
  city: string
  lookingFor: 'Long-term' | 'Open' | 'Not sure'
  why: string
}

export const backendSubmitWaitlist = async (
  submission: WaitlistSubmission,
): Promise<boolean> => {
  if (!supabase) return false
  const { error } = await supabase.rpc('submit_waitlist', {
    p_email: submission.email,
    p_first_name: submission.firstName,
    p_age: submission.age,
    p_gender: submission.gender,
    p_city: submission.city,
    p_looking_for: submission.lookingFor,
    p_note: submission.why,
  })
  if (error) {
    throw new Error(error.message)
  }
  return true
}

/**
 * Magic-link follow-up (v2, 2026-05-27). When Master marks a request
 * "needs info" in InviteAdmin, the applicant gets a link to
 * prive-app.club/#/waitlist-reply/<token>. That page reads the
 * question via this function (token-only, no auth, no PII beyond first
 * name + the question itself).
 */
export const backendGetWaitlistQuestion = async (
  token: string,
): Promise<{ firstName: string; question: string } | null> => {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('get_waitlist_question', {
    p_token: token,
  })
  if (error || !Array.isArray(data) || data.length === 0) {
    return null
  }
  const row = data[0] as { first_name?: unknown; question?: unknown }
  return {
    firstName: typeof row.first_name === 'string' ? row.first_name : '',
    question: typeof row.question === 'string' ? row.question : '',
  }
}

/** Submit the applicant's answer to the follow-up question. Flips the
 *  row back to 'pending' server-side and burns the token. */
export const backendSubmitWaitlistReply = async (
  token: string,
  reply: string,
): Promise<boolean> => {
  if (!supabase) return false
  const { error } = await supabase.rpc('submit_waitlist_reply', {
    p_token: token,
    p_reply: reply,
  })
  if (error) {
    throw new Error(error.message)
  }
  return true
}

// Note: invite-code generation lives in the LoveDateInviteAdmin app
// (sophisticated cryptographic formatter + audit log). Approval of a
// waitlist request is therefore a two-step flow handled there:
//   1. InviteAdmin calls its own create-invite-code Edge Function with
//      label = requester's email + note. That inserts into beta_invites.
//   2. InviteAdmin calls admin_approve_waitlist(id, code) (still exists)
//      to mark the Privé waitlist row approved and link it to the code.
// Privé's own admin UI for approval was removed (commit replaces an
// earlier in-Privé approve button with this handoff).
//
// Decline is also delegated to InviteAdmin (or to direct SQL by Master
// if a request is spam). The admin_decline_waitlist RPC remains in SQL
// for InviteAdmin to call; the Privé client no longer wraps it.

/**
 * D5 — admin moderation action: flip a profile's is_active flag.
 * Server-side gated by public.is_admin() (checks public.admins table).
 * When set to false, the profile disappears from every user's Discover
 * deck immediately because getProfiles filters by is_active = true.
 * Returns true on success, false on any failure (auth, no-such-profile,
 * RPC unavailable). Caller surfaces an error toast on false.
 */
export const backendAdminSetProfileActive = async (
  profileId: number,
  active: boolean,
): Promise<boolean> => {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('admin_set_profile_active', {
    p_profile_id: profileId,
    p_active: active,
  })
  if (error) {

    console.warn('admin_set_profile_active failed:', error.message)
    return false
  }
  return data === true
}

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
        await supabase.from('client_errors').insert(insertPayload)
      } catch {
        // Silently drop — the page is already broken; don't recurse.
      }
    })
    .catch(() => {
      // Same as above — getCurrentUserId() can throw if the network is
      // gone. We still try the insert without a user_id; if that also
      // fails it just disappears.
      try {
        void supabase.from('client_errors').insert(payload)
      } catch {
        /* noop */
      }
    })
}

/**
 * Phase C3 — record a swipe in the cloud ledger so users_are_matched() can
 * verify mutual interest before allowing chat. Fire-and-forget: the in-app
 * deck state is updated synchronously by the caller; this is the durable
 * record. Idempotent at the table level via the (liker_id, target_id)
 * primary key.
 */
export const backendRecordSwipe = async (
  targetProfileId: number,
  direction: 'right' | 'left',
): Promise<void> => {
  if (!supabase) {
    return
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }
  const { error } = await supabase.from('swipes').upsert(
    {
      liker_id: userId,
      target_id: targetProfileId,
      direction,
    },
    { onConflict: 'liker_id,target_id' },
  )
  if (error) {

    console.warn('Swipe cloud record skipped:', error.message)
  }
}

// D2 — hydrate the local swipe history from the cloud on auth.
// Before this, `swipedIds` lived only in localStorage scoped per origin.
// Effect: every domain change, every device change, every site-data clear
// reset the user's "already swiped" memory — so previously-passed profiles
// re-appeared and the deck was inconsistent across sessions.
// The `swipes` table has always been written; now it's also read.
export const backendLoadSwipeHistory = async (): Promise<{
  likedIds: number[]
  passedIds: number[]
}> => {
  if (!supabase) {
    return { likedIds: [], passedIds: [] }
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return { likedIds: [], passedIds: [] }
  }
  const { data, error } = await supabase
    .from('swipes')
    .select('target_id, direction')
    .eq('liker_id', userId)
  if (error || !data) {
    if (error) {

      console.warn('Swipe history hydration failed:', error.message)
    }
    return { likedIds: [], passedIds: [] }
  }
  const likedIds: number[] = []
  const passedIds: number[] = []
  for (const row of data) {
    const id = Number((row as { target_id?: unknown }).target_id)
    if (!Number.isInteger(id)) continue
    const direction = (row as { direction?: unknown }).direction
    if (direction === 'right') {
      likedIds.push(id)
    } else if (direction === 'left') {
      passedIds.push(id)
    }
  }
  return { likedIds, passedIds }
}

export type CloudChatMessage = {
  id: string
  senderId: string
  recipientId: string
  text: string
  attachment: { kind: 'image' | 'video' | 'audio'; url: string; name: string } | null
  createdAt: number
}

type ChatMessageRow = {
  id: string
  sender_id: string
  recipient_id: string
  text: string
  attachment: { kind?: string; url?: string; name?: string } | null
  created_at: string
}

const mapChatMessageRow = (row: ChatMessageRow): CloudChatMessage => {
  let attachment: CloudChatMessage['attachment'] = null
  if (row.attachment && typeof row.attachment === 'object') {
    const kind = row.attachment.kind
    if (kind === 'image' || kind === 'video' || kind === 'audio') {
      attachment = {
        kind,
        url: String(row.attachment.url ?? ''),
        name: String(row.attachment.name ?? ''),
      }
    }
  }
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    text: row.text ?? '',
    attachment,
    createdAt: new Date(row.created_at).getTime(),
  }
}

/**
 * Phase C3 — insert a chat message. RLS rejects the insert unless sender
 * and recipient are matched (both right-swiped each other). Returns the
 * server-confirmed row on success.
 */
export const backendSendChatMessage = async (input: {
  recipientId: string
  text: string
  attachment?: CloudChatMessage['attachment']
}): Promise<CloudChatMessage | null> => {
  if (!supabase) {
    return null
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return null
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      sender_id: userId,
      recipient_id: input.recipientId,
      text: input.text,
      attachment: input.attachment ?? null,
    })
    .select('id, sender_id, recipient_id, text, attachment, created_at')
    .single()

  if (error || !data) {
     
    console.warn('Chat message send failed:', error?.message ?? 'no data')
    return null
  }
  return mapChatMessageRow(data as ChatMessageRow)
}

export type LoadedChatMessage = CloudChatMessage & { sender: 'me' | 'them' }

/**
 * Fetch the full history for a one-on-one thread, ordered oldest-first so
 * the caller can render directly. Each message is annotated with sender
 * direction relative to the current user, sparing callers from needing
 * the current user id.
 */
export const backendLoadChatHistory = async (
  otherUserId: string,
): Promise<LoadedChatMessage[]> => {
  if (!supabase) {
    return []
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, sender_id, recipient_id, text, attachment, created_at')
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`,
    )
    .order('created_at', { ascending: true })
    .limit(500)

  if (error || !Array.isArray(data)) {
     
    console.warn('Chat history load failed:', error?.message ?? 'no data')
    return []
  }
  return data.map((row) => {
    const mapped = mapChatMessageRow(row as ChatMessageRow)
    return { ...mapped, sender: mapped.senderId === userId ? 'me' : 'them' }
  })
}

/**
 * Subscribe to new chat messages addressed to the current user. Returns an
 * unsubscribe function. Caller is responsible for filtering by thread (the
 * subscription fires for every incoming message across all matches).
 */
export const backendSubscribeToInbox = (
  onMessage: (message: CloudChatMessage) => void,
): (() => void) => {
  if (!supabase) {
    return () => {}
  }
  let channel: ReturnType<typeof supabase.channel> | null = null

  void (async () => {
    const userId = await getCurrentUserId()
    if (!userId || !supabase) {
      return
    }
    channel = supabase
      .channel(`inbox:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: { new: ChatMessageRow }) => {
          onMessage(mapChatMessageRow(payload.new))
        },
      )
      .subscribe()
  })()

  return () => {
    if (channel && supabase) {
      void supabase.removeChannel(channel)
    }
  }
}
