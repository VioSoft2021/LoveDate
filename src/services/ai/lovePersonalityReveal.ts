import { createSupabaseClient } from '../supabaseClient'
import type {
  AttachmentRatings,
  AttachmentStyle,
  BigFiveScores,
  LovePersonalityReveal,
} from '../compatibility'

/**
 * AI Love Personality Reveal (Tier A, Phase 3 — 2026-05-24)
 *
 * Calls the ai-love-personality-reveal Edge Function with the user's
 * derived Big Five + Attachment data and returns a cinematic per-user
 * reveal (archetype name, headline, 3 paragraphs, 3 strengths, 2
 * growth edges). Returns null on failure so callers fall back to a
 * "preparing your reveal..." placeholder.
 *
 * Cached client-side by hash(bigFive + attachment + language). Cache
 * invalidates automatically when the user retakes the quiz (different
 * scores → different hash). TTL 30 days.
 */

type CacheEntry = {
  reveal: LovePersonalityReveal
  storedAt: number
  v: number
}

const CACHE_KEY_PREFIX = 'lovedate:ai-love-personality-reveal:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
const CACHE_VERSION = 1

const stableHash = (input: string): string => {
  let h = 5381
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

const cacheKey = (
  bigFive: BigFiveScores,
  attachment: AttachmentStyle,
  language: string,
): string => {
  // Round scores so trivial 1-point drift (would round to the same UI %
  // anyway) doesn't bust the cache.
  const rounded = [
    Math.round(bigFive.openness),
    Math.round(bigFive.conscientiousness),
    Math.round(bigFive.extraversion),
    Math.round(bigFive.agreeableness),
    Math.round(bigFive.neuroticism),
  ].join(',')
  return `${CACHE_KEY_PREFIX}${stableHash(`${language}|${attachment}|${rounded}`)}`
}

const readCache = (key: string): LovePersonalityReveal | null => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (parsed?.v !== CACHE_VERSION) return null
    if (!parsed?.reveal) return null
    if (Date.now() - (parsed.storedAt ?? 0) > CACHE_TTL_MS) return null
    return parsed.reveal
  } catch {
    return null
  }
}

const writeCache = (key: string, reveal: LovePersonalityReveal): void => {
  try {
    const entry: CacheEntry = { reveal, storedAt: Date.now(), v: CACHE_VERSION }
    window.localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // localStorage quota or disabled — silently degrade.
  }
}

export type LovePersonalityRevealInput = {
  bigFive: BigFiveScores
  attachment: AttachmentStyle
  attachmentRatings?: AttachmentRatings
  language?: 'en' | 'ro'
  selfName?: string
}

export const backendInvokeLovePersonalityReveal = async (
  input: LovePersonalityRevealInput,
): Promise<LovePersonalityReveal | null> => {
  const language: 'en' | 'ro' = input.language === 'ro' ? 'ro' : 'en'
  const key = cacheKey(input.bigFive, input.attachment, language)

  const cached = readCache(key)
  if (cached) {
    return cached
  }

  const supabase = createSupabaseClient()
  if (!supabase) {
    return null
  }

  try {
    const { data, error } = await supabase.functions.invoke<{
      archetypeName?: string
      headline?: string
      description?: string
      strengths?: string[]
      growthEdges?: string[]
      error?: string
    }>('ai-love-personality-reveal', {
      body: {
        bigFive: input.bigFive,
        attachment: input.attachment,
        attachmentRatings: input.attachmentRatings,
        language,
        selfName: input.selfName,
      },
    })

    if (error) {
      console.warn('[Privé] love-personality-reveal invoke error', error)
      return null
    }

    if (
      !data
      || typeof data.archetypeName !== 'string'
      || typeof data.headline !== 'string'
      || typeof data.description !== 'string'
      || !Array.isArray(data.strengths)
      || !Array.isArray(data.growthEdges)
    ) {
      return null
    }

    const reveal: LovePersonalityReveal = {
      archetypeName: data.archetypeName,
      headline: data.headline,
      description: data.description,
      strengths: data.strengths.filter((s): s is string => typeof s === 'string'),
      growthEdges: data.growthEdges.filter((s): s is string => typeof s === 'string'),
      language,
      generatedAt: new Date().toISOString(),
    }

    writeCache(key, reveal)
    return reveal
  } catch (err) {
    console.warn('[Privé] love-personality-reveal threw', err)
    return null
  }
}
