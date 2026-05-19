import { createSupabaseClient } from '../supabaseClient'

export type AiProfileSummary = {
  name: string
  age?: number
  city?: string
  vibe?: string
  bio?: string
  interests?: string[]
  relationshipGoal?: string
  zodiac?: string
}

export type AiChatTurn = { sender: 'me' | 'them'; text: string }

type CacheEntry = { openers: string[]; storedAt: number; v: number }

const CACHE_KEY_PREFIX = 'lovedate:ai-icebreaker:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24
const CACHE_VERSION = 2 // bumped: language parameter added; v=1 entries are stale

const cacheKey = (
  selfName: string,
  otherProfileId: number,
  hasHistory: boolean,
  language: string,
): string =>
  `${CACHE_KEY_PREFIX}${language}:${selfName}:${otherProfileId}:${hasHistory ? 'coach' : 'opener'}`

const readCache = (key: string): string[] | null => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as CacheEntry
    if (parsed?.v !== CACHE_VERSION) {
      return null
    }
    if (!parsed?.openers || !Array.isArray(parsed.openers)) {
      return null
    }
    if (Date.now() - (parsed.storedAt ?? 0) > CACHE_TTL_MS) {
      return null
    }
    return parsed.openers
  } catch {
    return null
  }
}

const writeCache = (key: string, openers: string[]): void => {
  try {
    const entry: CacheEntry = { openers, storedAt: Date.now(), v: CACHE_VERSION }
    window.localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // best-effort; localStorage quota issues fall through
  }
}

/**
 * Invokes the ai-icebreaker Edge Function. Returns up to three short message
 * suggestions for the current user to send. Returns null on any failure so
 * the caller can fall back to its existing templated suggestions.
 *
 * Results are cached client-side per (sender, recipient, mode) for 24h to
 * avoid burning API tokens when the user reopens the same chat.
 */
export const backendInvokeIcebreaker = async (input: {
  selfProfile: AiProfileSummary
  otherProfile: AiProfileSummary & { id: number }
  chatExcerpt?: AiChatTurn[]
  language?: 'en' | 'ro'
}): Promise<string[] | null> => {
  const supabase = createSupabaseClient()
  if (!supabase) {
    return null
  }

  const language = input.language ?? 'en'
  const hasHistory = (input.chatExcerpt?.length ?? 0) > 0
  const key = cacheKey(input.selfProfile.name, input.otherProfile.id, hasHistory, language)
  const cached = readCache(key)
  if (cached) {
    return cached
  }

  try {
    const { data, error } = await supabase.functions.invoke<{ openers?: string[]; error?: string }>(
      'ai-icebreaker',
      {
        body: {
          selfProfile: input.selfProfile,
          otherProfile: {
            name: input.otherProfile.name,
            age: input.otherProfile.age,
            city: input.otherProfile.city,
            vibe: input.otherProfile.vibe,
            bio: input.otherProfile.bio,
            interests: input.otherProfile.interests,
            relationshipGoal: input.otherProfile.relationshipGoal,
            zodiac: input.otherProfile.zodiac,
          },
          chatExcerpt: input.chatExcerpt ?? [],
          language,
        },
      },
    )
    if (error || !data?.openers?.length) {
      // eslint-disable-next-line no-console
      console.warn('ai-icebreaker failed:', error?.message ?? data?.error ?? 'no openers')
      return null
    }
    writeCache(key, data.openers)
    return data.openers
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('ai-icebreaker threw:', error)
    return null
  }
}
