import { createSupabaseClient } from '../supabaseClient'
import type { StabilityProfile, StabilityReveal, StabilityBand } from '../stability'

/**
 * AI Stability Reveal (2026-05-30)
 *
 * Calls the ai-stability-reveal Edge Function with two users' stability
 * profiles + the pre-computed band and returns a cinematic per-match
 * durability reading. Returns null on failure so callers show an honest
 * retry CTA (and the band+reason line still stands on its own).
 *
 * Cached client-side per user-pair (sorted ids + both stability signatures +
 * language). Both users compute the same key, so the second to view a match
 * hits the cache. TTL 30 days; retaking the assessment busts it automatically.
 */

type CacheEntry = {
  reveal: StabilityReveal
  storedAt: number
  v: number
}

const CACHE_KEY_PREFIX = 'lovedate:ai-stability-reveal:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
const CACHE_VERSION = 1

const stableHash = (input: string): string => {
  let h = 5381
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

const sig = (p: StabilityProfile): string =>
  [
    Math.round(p.conflictRepair),
    Math.round(p.commitment),
    Math.round(p.communication),
    p.values.children,
    p.values.finances,
    p.values.pace,
  ].join(',')

const pairSignature = (
  selfId: string,
  otherId: string,
  selfStability: StabilityProfile,
  otherStability: StabilityProfile,
  language: string,
): string => {
  const [idA, idB] = [selfId, otherId].sort()
  const aIsSelf = idA === selfId
  const aSig = aIsSelf ? sig(selfStability) : sig(otherStability)
  const bSig = aIsSelf ? sig(otherStability) : sig(selfStability)
  return [language, idA, aSig, idB, bSig].join('|')
}

const readCache = (key: string): StabilityReveal | null => {
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

const writeCache = (key: string, reveal: StabilityReveal): void => {
  try {
    const entry: CacheEntry = { reveal, storedAt: Date.now(), v: CACHE_VERSION }
    window.localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // localStorage quota or disabled — silently degrade.
  }
}

export type StabilityRevealInput = {
  selfId: string
  selfStability: StabilityProfile
  selfName?: string
  otherId: string
  otherStability: StabilityProfile
  otherName?: string
  band?: StabilityBand
  language?: 'en' | 'ro'
}

export const backendInvokeStabilityReveal = async (
  input: StabilityRevealInput,
): Promise<StabilityReveal | null> => {
  const language: 'en' | 'ro' = input.language === 'ro' ? 'ro' : 'en'

  const signature = pairSignature(
    input.selfId,
    input.otherId,
    input.selfStability,
    input.otherStability,
    language,
  )
  const lsKey = `${CACHE_KEY_PREFIX}${stableHash(signature)}`
  const serverKey = stableHash(signature)

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
      archetype?: string
      headline?: string
      description?: string
      strengths?: string[]
      watchPoints?: string[]
      sharedWork?: string
      error?: string
    }>('ai-stability-reveal', {
      body: {
        self: {
          conflictRepair: input.selfStability.conflictRepair,
          commitment: input.selfStability.commitment,
          communication: input.selfStability.communication,
          values: input.selfStability.values,
          name: input.selfName,
        },
        other: {
          conflictRepair: input.otherStability.conflictRepair,
          commitment: input.otherStability.commitment,
          communication: input.otherStability.communication,
          values: input.otherStability.values,
          name: input.otherName,
        },
        band: input.band,
        language,
        cacheKey: serverKey,
      },
    })

    if (error) {
      console.warn('[Privé] stability-reveal invoke error', error)
      return null
    }

    if (
      !data
      || typeof data.archetype !== 'string'
      || typeof data.headline !== 'string'
      || typeof data.description !== 'string'
      || typeof data.sharedWork !== 'string'
      || !Array.isArray(data.strengths)
      || !Array.isArray(data.watchPoints)
    ) {
      return null
    }

    const reveal: StabilityReveal = {
      archetype: data.archetype,
      headline: data.headline,
      description: data.description,
      strengths: data.strengths.filter((s): s is string => typeof s === 'string'),
      watchPoints: data.watchPoints.filter((s): s is string => typeof s === 'string'),
      sharedWork: data.sharedWork,
      language,
      generatedAt: new Date().toISOString(),
    }

    writeCache(lsKey, reveal)
    return reveal
  } catch (err) {
    console.warn('[Privé] stability-reveal threw', err)
    return null
  }
}
