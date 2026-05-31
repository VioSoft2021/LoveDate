// src/services/backend/profile.ts — split from backendApi.ts (2026-05-31).
import { type SelfProfile } from '../../domain/profile'
import { LOCAL_SETTINGS_KEY, LOCAL_PREFERENCES_KEY, supabase, wait, persistLocal, profileKeyForEmail, getCurrentUserId, removeSelfProfileKeysExcept, VALID_GENDERS, PROFILE_PHOTOS_BUCKET, dataUrlToBlob, generatePhotoFilename, isDataUrl } from './client'

export type SettingsPayload = {
  pushNotifications: boolean
  emailNotifications: boolean
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
export const purgeOtherSelfProfileCaches = (currentEmail: string): void => {
  removeSelfProfileKeysExcept(profileKeyForEmail(currentEmail))
}
export const purgeAllSelfProfileCaches = (): void => {
  removeSelfProfileKeysExcept(null)
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

// Profile voice note (2026-05-31). Same pipeline as photos — uploads the
// recorded audio/webm data URL to the profile-photos bucket and returns its
// public URL. Returns null on any failure so callers keep the prior value.
export const backendUploadVoiceNote = async (dataUrl: string): Promise<string | null> => {
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
  const path = `${userId}/voice-${crypto.randomUUID()}.webm`
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, decoded.blob, {
      contentType: decoded.mimeType || 'audio/webm',
      cacheControl: '3600',
      upsert: false,
    })
  if (uploadError) {

    console.warn('Voice note upload failed:', uploadError.message)
    return null
  }
  const { data } = supabase.storage.from(PROFILE_PHOTOS_BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
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
    // Forward-prep (2026-05-31): the matches'-view voice note activates once the
    // migration teaches sync_discoverable_profile to read this key. Harmless now.
    voiceNoteUrl: typeof profile.voiceNoteUrl === 'string' ? profile.voiceNoteUrl : undefined,
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
