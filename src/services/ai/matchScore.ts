import { createSupabaseClient } from '../supabaseClient'
import type { AttachmentStyle, BigFiveScores } from '../compatibility'

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
  // Tier A (2026-05-24) — Big Five + Attachment when present. Optional
  // because users who haven't taken the new quiz still need to score.
  bigFive?: BigFiveScores
  attachmentStyle?: AttachmentStyle
}

export type AiMatchScoreResult = {
  score: number
  reasons: string[]
  redFlags: string[]
  frictionPoints: string[]
  tips: string[]
}

type CacheEntry = AiMatchScoreResult & { storedAt: number; v: number; lang: string }

const CACHE_KEY_PREFIX = 'lovedate:ai-match-score:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const CACHE_VERSION = 5 // bumped Tier A: Big Five + Attachment now in prompt; v<=4 stale

// Stable hash of the profile fields the model actually sees. Lets us
// invalidate the cache automatically when EITHER profile is edited:
// the new hash misses, we re-score.
const hashProfile = (p: AiMatchProfileInput): string => {
  const bf = p.bigFive
    ? `${Math.round(p.bigFive.openness)},${Math.round(p.bigFive.conscientiousness)},${Math.round(p.bigFive.extraversion)},${Math.round(p.bigFive.agreeableness)},${Math.round(p.bigFive.neuroticism)}`
    : ''
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
    bf,
    p.attachmentStyle ?? '',
  ].join('|')
  let hash = 0
  for (let i = 0; i < fields.length; i++) {
    hash = (hash * 31 + fields.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

// Short stable hash for the AI preference prompt — separate from the
// profile hash so the cache key clearly shows which axis changed.
const hashPrompt = (prompt: string): string => {
  if (!prompt) return '_'
  let hash = 0
  for (let i = 0; i < prompt.length; i++) {
    hash = (hash * 31 + prompt.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

const cacheKey = (
  self: AiMatchProfileInput,
  candidate: AiMatchProfileInput & { id: number },
  language: string,
  viewerPreference: string,
): string =>
  `${CACHE_KEY_PREFIX}${language}:${hashProfile(self)}:${candidate.id}:${hashProfile(candidate)}:${hashPrompt(viewerPreference)}`

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
      frictionPoints: parsed.frictionPoints ?? [],
      tips: parsed.tips ?? [],
    }
  } catch {
    return null
  }
}

const writeCache = (key: string, result: AiMatchScoreResult, lang: string): void => {
  try {
    const entry: CacheEntry = { ...result, storedAt: Date.now(), v: CACHE_VERSION, lang }
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
 * Cached client-side per (language, selfHash, candidateId, candidateHash)
 * for 7 days. Editing either profile changes its hash and invalidates the
 * cache. Switching languages also invalidates (different cache key per lang).
 */
export const backendInvokeMatchScore = async (input: {
  selfProfile: AiMatchProfileInput
  candidateProfile: AiMatchProfileInput & { id: number }
  language?: 'en' | 'ro'
  /** AI-first filter preference prompt from the FilterScreen. Empty
   *  string scores neutrally; non-empty value is treated by Sonnet as
   *  a meaningful weighting signal (not a hard filter). */
  viewerPreference?: string
}): Promise<AiMatchScoreResult | null> => {
  const supabase = createSupabaseClient()
  if (!supabase) return null

  const language = input.language ?? 'en'
  const viewerPreference = (input.viewerPreference ?? '').trim()
  const key = cacheKey(
    input.selfProfile,
    input.candidateProfile,
    language,
    viewerPreference,
  )
  const cached = readCache(key)
  if (cached) return cached

  try {
    const { data, error } = await supabase.functions.invoke<{
      score?: number
      reasons?: string[]
      redFlags?: string[]
      frictionPoints?: string[]
      tips?: string[]
      error?: string
    }>('ai-match-score', {
      body: {
        selfProfile: input.selfProfile,
        candidateProfile: input.candidateProfile,
        language,
        viewerPreference: viewerPreference || undefined,
      },
    })
    if (
      error ||
      typeof data?.score !== 'number' ||
      !Array.isArray(data?.reasons) ||
      data.reasons.length === 0
    ) {
       
      console.warn('ai-match-score failed:', error?.message ?? data?.error ?? 'no result')
      return null
    }
    const result: AiMatchScoreResult = {
      score: data.score,
      reasons: data.reasons,
      redFlags: Array.isArray(data.redFlags) ? data.redFlags : [],
      frictionPoints: Array.isArray(data.frictionPoints) ? data.frictionPoints : [],
      tips: Array.isArray(data.tips) ? data.tips : [],
    }
    writeCache(key, result, language)
    return result
  } catch (error) {
     
    console.warn('ai-match-score threw:', error)
    return null
  }
}
