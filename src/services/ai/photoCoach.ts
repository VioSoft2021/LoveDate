import { createSupabaseClient } from '../supabaseClient'

export type AiPhotoCoachInput = {
  photos: string[]
  selfProfile?: {
    name?: string
    age?: number
    vibe?: string
  }
  language?: 'en' | 'ro'
}

export type AiPhotoCoachPerPhoto = {
  index: number
  score: number
  strengths: string[]
  improvements: string[]
}

export type AiPhotoCoachResult = {
  perPhoto: AiPhotoCoachPerPhoto[]
  primaryPick: number
  overall: string
  droppedIndices: number[]
}

type CacheEntry = AiPhotoCoachResult & { storedAt: number; v: number }

const CACHE_KEY_PREFIX = 'lovedate:ai-photo-coach:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const CACHE_VERSION = 1
const MAX_PHOTOS = 6

// Hash of the photo URL list. Editing/reordering/adding/removing a photo
// changes the hash and invalidates cached feedback.
const hashPhotos = (photos: string[]): string => {
  // For HTTPS URLs the full URL is the identity. For data URLs we hash
  // the first 200 chars (enough to uniquely identify a photo without
  // hashing megabytes of base64).
  const fingerprint = photos
    .slice(0, MAX_PHOTOS)
    .map((p) => (p.startsWith('data:') ? p.slice(0, 200) : p))
    .join('||')
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    hash = (hash * 31 + fingerprint.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

const cacheKey = (photos: string[], language: string): string =>
  `${CACHE_KEY_PREFIX}${language}:${hashPhotos(photos)}`

const readCache = (key: string): AiPhotoCoachResult | null => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (parsed?.v !== CACHE_VERSION) return null
    if (Date.now() - (parsed.storedAt ?? 0) > CACHE_TTL_MS) return null
    if (!Array.isArray(parsed.perPhoto) || parsed.perPhoto.length === 0) return null
    return {
      perPhoto: parsed.perPhoto,
      primaryPick: parsed.primaryPick,
      overall: parsed.overall,
      droppedIndices: parsed.droppedIndices ?? [],
    }
  } catch {
    return null
  }
}

const writeCache = (key: string, result: AiPhotoCoachResult): void => {
  try {
    const entry: CacheEntry = { ...result, storedAt: Date.now(), v: CACHE_VERSION }
    window.localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // best-effort
  }
}

/**
 * Invokes the ai-photo-coach Edge Function. Returns per-photo scores +
 * strengths + improvements, a primary-photo recommendation, and an
 * overall strategy note. Returns null on any failure so callers can show
 * a "try again later" message rather than blocking the editor.
 *
 * Cached client-side per (language, photo-hash) for 7 days. Adding,
 * removing, or reordering photos invalidates automatically.
 */
export const backendInvokePhotoCoach = async (
  input: AiPhotoCoachInput,
): Promise<AiPhotoCoachResult | null> => {
  const supabase = createSupabaseClient()
  if (!supabase) return null

  if (!Array.isArray(input.photos) || input.photos.length === 0) {
    return null
  }

  const language = input.language ?? 'en'
  const key = cacheKey(input.photos, language)
  const cached = readCache(key)
  if (cached) return cached

  try {
    const { data, error } = await supabase.functions.invoke<{
      perPhoto?: AiPhotoCoachPerPhoto[]
      primaryPick?: number
      overall?: string
      droppedIndices?: number[]
      error?: string
    }>('ai-photo-coach', {
      body: {
        photos: input.photos.slice(0, MAX_PHOTOS),
        selfProfile: input.selfProfile,
        language,
      },
    })
    if (
      error ||
      !Array.isArray(data?.perPhoto) ||
      data.perPhoto.length === 0 ||
      typeof data.overall !== 'string'
    ) {
       
      console.warn(
        'ai-photo-coach failed:',
        error?.message ?? data?.error ?? 'no result',
      )
      return null
    }
    const result: AiPhotoCoachResult = {
      perPhoto: data.perPhoto,
      primaryPick: typeof data.primaryPick === 'number' ? data.primaryPick : 0,
      overall: data.overall,
      droppedIndices: Array.isArray(data.droppedIndices) ? data.droppedIndices : [],
    }
    writeCache(key, result)
    return result
  } catch (error) {
     
    console.warn('ai-photo-coach threw:', error)
    return null
  }
}
