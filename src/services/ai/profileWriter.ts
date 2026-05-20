import { createSupabaseClient } from '../supabaseClient'

export type AiProfileWriterInput = {
  currentBio: string
  interests?: string[]
  vibe?: string
  age?: number
  city?: string
  relationshipGoal?: string
  language?: 'en' | 'ro'
}

export type AiProfileWriterResult = {
  critiques: string[]
  rewrites: string[]
}

type CacheEntry = AiProfileWriterResult & { storedAt: number; v: number }

const CACHE_KEY_PREFIX = 'lovedate:ai-profile-writer:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const CACHE_VERSION = 1

// Hash of every input field the model sees. Editing ANY of them
// invalidates the cache automatically. Means typing changes the bio
// won't keep returning stale suggestions.
const hashInput = (input: AiProfileWriterInput): string => {
  const fields = [
    input.currentBio,
    (input.interests ?? []).join(','),
    input.vibe ?? '',
    input.age ?? '',
    input.city ?? '',
    input.relationshipGoal ?? '',
  ].join('|')
  let hash = 0
  for (let i = 0; i < fields.length; i++) {
    hash = (hash * 31 + fields.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

const cacheKey = (input: AiProfileWriterInput, language: string): string =>
  `${CACHE_KEY_PREFIX}${language}:${hashInput(input)}`

const readCache = (key: string): AiProfileWriterResult | null => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (parsed?.v !== CACHE_VERSION) return null
    if (Date.now() - (parsed.storedAt ?? 0) > CACHE_TTL_MS) return null
    if (!Array.isArray(parsed.rewrites) || parsed.rewrites.length === 0) return null
    return {
      critiques: Array.isArray(parsed.critiques) ? parsed.critiques : [],
      rewrites: parsed.rewrites,
    }
  } catch {
    return null
  }
}

const writeCache = (key: string, result: AiProfileWriterResult): void => {
  try {
    const entry: CacheEntry = { ...result, storedAt: Date.now(), v: CACHE_VERSION }
    window.localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // best-effort
  }
}

/**
 * Invokes the ai-profile-writer Edge Function. Returns 0..4 specific
 * critiques + 3 rewritten bios in the user's voice, or null on any
 * failure so the caller can show an error message.
 *
 * Never auto-applied; caller renders the rewrites as suggestion cards
 * with a "Use this" button.
 *
 * Cache: 7-day TTL, keyed on (language, input-hash). Any edit to the
 * bio or context fields invalidates automatically.
 */
export const backendInvokeProfileWriter = async (
  input: AiProfileWriterInput,
): Promise<AiProfileWriterResult | null> => {
  const supabase = createSupabaseClient()
  if (!supabase) return null

  const language = input.language ?? 'en'
  const key = cacheKey(input, language)
  const cached = readCache(key)
  if (cached) return cached

  try {
    const { data, error } = await supabase.functions.invoke<{
      critiques?: string[]
      rewrites?: string[]
      error?: string
    }>('ai-profile-writer', {
      body: {
        currentBio: input.currentBio,
        interests: input.interests,
        vibe: input.vibe,
        age: input.age,
        city: input.city,
        relationshipGoal: input.relationshipGoal,
        language,
      },
    })
    if (
      error ||
      !Array.isArray(data?.rewrites) ||
      data.rewrites.length === 0
    ) {
       
      console.warn(
        'ai-profile-writer failed:',
        error?.message ?? data?.error ?? 'no rewrites',
      )
      return null
    }
    const result: AiProfileWriterResult = {
      critiques: Array.isArray(data.critiques) ? data.critiques : [],
      rewrites: data.rewrites,
    }
    writeCache(key, result)
    return result
  } catch (error) {
     
    console.warn('ai-profile-writer threw:', error)
    return null
  }
}
