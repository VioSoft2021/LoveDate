import { createSupabaseClient } from '../supabaseClient'
import type { AttachmentStyle, BigFiveScores } from '../compatibility'
import { DEMO_GUEST_EMAIL } from '../demo/demoConstants'

/**
 * AI Pair Dynamic Reveal (Tier B — 2026-05-26)
 *
 * Calls the ai-pair-dynamic-reveal Edge Function with two users' Big Five
 * + Attachment data and returns a cinematic pair-level reveal (pair
 * archetype, headline, 3 paragraphs, 3 strengths, 1-2 frictions, 1
 * shared growth edge). Returns null on failure so callers can show an
 * honest retry CTA.
 *
 * Cached client-side per user-pair (sorted-ids + scores hash + language).
 * Both users see the same reveal because the cache key sorts their ids,
 * and the hash factors in BOTH score sets — retaking the quiz on either
 * side busts the cache automatically. TTL 30 days.
 */

export type PairDynamicReveal = {
  pairArchetype: string
  headline: string
  description: string
  strengths: string[]
  frictions: string[]
  sharedGrowthEdge: string
  language: 'en' | 'ro'
  generatedAt: string
}

type CacheEntry = {
  reveal: PairDynamicReveal
  storedAt: number
  v: number
}

const CACHE_KEY_PREFIX = 'lovedate:ai-pair-dynamic-reveal:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
const CACHE_VERSION = 1

const stableHash = (input: string): string => {
  let h = 5381
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

const roundedScores = (b: BigFiveScores): string => [
  Math.round(b.openness),
  Math.round(b.conscientiousness),
  Math.round(b.extraversion),
  Math.round(b.agreeableness),
  Math.round(b.neuroticism),
].join(',')

// Stable per-pair signature: sorted ids + each side's scores in id-order
// + language. Both members of a pair compute the same signature so they
// share both the localStorage cache (L1) and the server cache (L2).
const pairSignature = (
  selfId: string,
  otherId: string,
  selfBigFive: BigFiveScores,
  selfAttachment: AttachmentStyle,
  otherBigFive: BigFiveScores,
  otherAttachment: AttachmentStyle,
  language: string,
): string => {
  const [idA, idB] = [selfId, otherId].sort()
  const aIsSelf = idA === selfId
  const aScores = aIsSelf ? selfBigFive : otherBigFive
  const aAttachment = aIsSelf ? selfAttachment : otherAttachment
  const bScores = aIsSelf ? otherBigFive : selfBigFive
  const bAttachment = aIsSelf ? otherAttachment : selfAttachment
  return [
    language,
    idA,
    aAttachment,
    roundedScores(aScores),
    idB,
    bAttachment,
    roundedScores(bScores),
  ].join('|')
}

const sharedCacheHash = (signature: string): string => stableHash(signature)
const localCacheKey = (signature: string): string =>
  `${CACHE_KEY_PREFIX}${sharedCacheHash(signature)}`

const readCache = (key: string): PairDynamicReveal | null => {
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

const writeCache = (key: string, reveal: PairDynamicReveal): void => {
  try {
    const entry: CacheEntry = { reveal, storedAt: Date.now(), v: CACHE_VERSION }
    window.localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // localStorage quota or disabled — silently degrade.
  }
}

export type PairDynamicRevealInput = {
  selfId: string
  selfBigFive: BigFiveScores
  selfAttachment: AttachmentStyle
  selfName?: string
  otherId: string
  otherBigFive: BigFiveScores
  otherAttachment: AttachmentStyle
  otherName?: string
  language?: 'en' | 'ro'
}

export const backendInvokePairDynamicReveal = async (
  input: PairDynamicRevealInput,
): Promise<PairDynamicReveal | null> => {
  const language: 'en' | 'ro' = input.language === 'ro' ? 'ro' : 'en'

  // Guest Tour (Phase 3/4, 2026-05-26): when the caller is a tour
  // visitor (selfId === DEMO_GUEST_EMAIL), prefer the hand-written
  // reveal from the demoProfiles fixture for known pre-matched
  // profiles (Andra, Mateo). For any other matched demo profile,
  // fall through to the live Edge Function — server-side cache
  // means only one guest ever pays the Claude tokens for a given
  // pair; every subsequent guest hits the cache.
  if (input.selfId === DEMO_GUEST_EMAIL) {
    const { DEMO_PAIR_DYNAMIC_REVEALS } = await import('../demo/demoProfiles')
    const otherIdNum = Number(input.otherId)
    const canned = DEMO_PAIR_DYNAMIC_REVEALS[otherIdNum]
    if (canned) {
      return {
        pairArchetype: canned.pairArchetype,
        headline: canned.headline,
        description: canned.description,
        strengths: [...canned.strengths],
        frictions: [...canned.frictions],
        sharedGrowthEdge: canned.sharedGrowthEdge,
        language,
        generatedAt: new Date().toISOString(),
      }
    }
    // No canned reveal for this pair → fall through to the live path.
  }

  const signature = pairSignature(
    input.selfId,
    input.otherId,
    input.selfBigFive,
    input.selfAttachment,
    input.otherBigFive,
    input.otherAttachment,
    language,
  )
  const lsKey = localCacheKey(signature)
  const serverKey = sharedCacheHash(signature)

  // L1: localStorage on this device. Instant, no network.
  const cached = readCache(lsKey)
  if (cached) {
    return cached
  }

  const supabase = createSupabaseClient()
  if (!supabase) {
    return null
  }

  try {
    const { data, error } = await supabase.functions.invoke<{
      pairArchetype?: string
      headline?: string
      description?: string
      strengths?: string[]
      frictions?: string[]
      sharedGrowthEdge?: string
      error?: string
    }>('ai-pair-dynamic-reveal', {
      body: {
        self: {
          bigFive: input.selfBigFive,
          attachment: input.selfAttachment,
          name: input.selfName,
        },
        other: {
          bigFive: input.otherBigFive,
          attachment: input.otherAttachment,
          name: input.otherName,
        },
        language,
        // L2: server-side cache key. The Edge Function reads/writes
        // pair_dynamic_cache so the matched partner sees the same
        // reveal back instantly instead of paying for another Claude
        // call. Both sides compute the same key.
        cacheKey: serverKey,
      },
    })

    if (error) {
      console.warn('[Privé] pair-dynamic-reveal invoke error', error)
      return null
    }

    if (
      !data
      || typeof data.pairArchetype !== 'string'
      || typeof data.headline !== 'string'
      || typeof data.description !== 'string'
      || typeof data.sharedGrowthEdge !== 'string'
      || !Array.isArray(data.strengths)
      || !Array.isArray(data.frictions)
    ) {
      return null
    }

    const reveal: PairDynamicReveal = {
      pairArchetype: data.pairArchetype,
      headline: data.headline,
      description: data.description,
      strengths: data.strengths.filter((s): s is string => typeof s === 'string'),
      frictions: data.frictions.filter((s): s is string => typeof s === 'string'),
      sharedGrowthEdge: data.sharedGrowthEdge,
      language,
      generatedAt: new Date().toISOString(),
    }

    writeCache(lsKey, reveal)
    return reveal
  } catch (err) {
    console.warn('[Privé] pair-dynamic-reveal threw', err)
    return null
  }
}
