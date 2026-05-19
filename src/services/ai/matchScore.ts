import { createSupabaseClient } from '../supabaseClient'

export type AiMatchProfileInput = {
  name: string
  age?: number
  city?: string
  vibe?: string
  bio?: string
  interests?: string[]
  relationshipGoal?: string
  zodiac?: string
  workout?: string
  drinking?: string
  smoking?: string
  pets?: string
  religion?: string
  politics?: string
  childrenPlan?: string
}

export type AiMatchScoreResult = {
  score: number
  reasons: string[]
  redFlags: string[]
}

type CacheEntry = AiMatchScoreResult & { storedAt: number; v: number }

const CACHE_KEY_PREFIX = 'lovedate:ai-match-score:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const CACHE_VERSION = 1

// Stable hash of the profile fields the model actually sees. Lets us
// invalidate the cache automatically when EITHER profile is edited:
// the new hash misses, we re-score.
const hashProfile = (p: AiMatchProfileInput): string => {
  const fields = [
    p.name,
    p.age ?? '',
    p.city ?? '',
    p.vibe ?? '',
    p.bio ?? '',
    (p.interests ?? []).join(','),
    p.relationshipGoal ?? '',
    p.zodiac ?? '',
    p.workout ?? '',
    p.drinking ?? '',
    p.smoking ?? '',
    p.pets ?? '',
    p.religion ?? '',
    p.politics ?? '',
    p.childrenPlan ?? '',
  ].join('|')
  let hash = 0
  for (let i = 0; i < fields.length; i++) {
    hash = (hash * 31 + fields.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

const cacheKey = (
  self: AiMatchProfileInput,
  candidate: AiMatchProfileInput & { id: number },
): string => `${CACHE_KEY_PREFIX}${hashProfile(self)}:${candidate.id}:${hashProfile(candidate)}`

const readCache = (key: string): AiMatchScoreResult | null => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (parsed?.v !== CACHE_VERSION) return null
    if (Date.now() - (parsed.storedAt ?? 0) > CACHE_TTL_MS) return null
    if (typeof parsed.score !== 'number' || !Array.isArray(parsed.reasons)) {
      return null
    }
    return {
      score: parsed.score,
      reasons: parsed.reasons,
      redFlags: parsed.redFlags ?? [],
    }
  } catch {
    return null
  }
}

const writeCache = (key: string, result: AiMatchScoreResult): void => {
  try {
    const entry: CacheEntry = { ...result, storedAt: Date.now(), v: CACHE_VERSION }
    window.localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // best-effort
  }
}

/**
 * Invokes the ai-match-score Edge Function. Returns an AI-generated
 * compatibility assessment (score + 3 reasons + 0..3 red flags), or null
 * on any failure so the caller falls back to the heuristic math.
 *
 * Cached client-side per (selfHash, candidateId, candidateHash) for 7 days.
 * Editing either profile changes its hash and invalidates the cache.
 */
export const backendInvokeMatchScore = async (input: {
  selfProfile: AiMatchProfileInput
  candidateProfile: AiMatchProfileInput & { id: number }
}): Promise<AiMatchScoreResult | null> => {
  const supabase = createSupabaseClient()
  if (!supabase) return null

  const key = cacheKey(input.selfProfile, input.candidateProfile)
  const cached = readCache(key)
  if (cached) return cached

  try {
    const { data, error } = await supabase.functions.invoke<{
      score?: number
      reasons?: string[]
      redFlags?: string[]
      error?: string
    }>('ai-match-score', {
      body: {
        selfProfile: input.selfProfile,
        candidateProfile: input.candidateProfile,
      },
    })
    if (
      error ||
      typeof data?.score !== 'number' ||
      !Array.isArray(data?.reasons) ||
      data.reasons.length === 0
    ) {
      // eslint-disable-next-line no-console
      console.warn('ai-match-score failed:', error?.message ?? data?.error ?? 'no result')
      return null
    }
    const result: AiMatchScoreResult = {
      score: data.score,
      reasons: data.reasons,
      redFlags: Array.isArray(data.redFlags) ? data.redFlags : [],
    }
    writeCache(key, result)
    return result
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('ai-match-score threw:', error)
    return null
  }
}
