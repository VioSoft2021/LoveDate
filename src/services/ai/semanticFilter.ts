import { createSupabaseClient } from '../supabaseClient'

/**
 * AI-First Semantic Filter (Phase E4, 2026-05-24)
 *
 * Calls the ai-semantic-filter Edge Function with the viewer's free-text
 * preference + a list of candidate profiles. Returns, per candidate, a
 * matches:bool + a one-line reason.
 *
 * Caller filters the deck to `matches === true` and may surface the reason
 * on each card. Returns null on any failure so the caller falls back to the
 * existing re-rank-only behaviour.
 *
 * Future Phase C (pgvector): the implementation behind this function may be
 * swapped to a Supabase RPC + cosine similarity. The exported signature is
 * intentionally stable so the deck pipeline never has to change.
 */

export type SemanticCandidate = {
  id: number
  name: string
  age?: number
  city?: string
  bio?: string
  interests?: string[]
  vibe?: string
  relationshipGoal?: string
}

export type SemanticFilterResult = {
  profileId: number
  matches: boolean
  reason: string
}

type CacheEntry = {
  results: SemanticFilterResult[]
  storedAt: number
  v: number
}

const CACHE_KEY_PREFIX = 'lovedate:ai-semantic-filter:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24h — same as icebreaker
// v2 (2026-05-25): bumped after the Edge Function system prompt was
// rewritten to enforce hard constraints (age / gender / city / intent).
// Old v1 cache entries were too lenient — invalidate them so users see
// the new strict filtering immediately.
const CACHE_VERSION = 2
const MIN_PROMPT_LENGTH = 5

/**
 * Stable hash for the cache key. The pair (normalised prompt, sorted candidate
 * IDs) defines the call uniquely — if either changes, we re-invoke. If the
 * caller re-renders the deck without changing those, we hit the cache.
 *
 * Uses djb2 since it's plenty for keying a localStorage entry. Don't use this
 * for anything security-sensitive — it isn't a cryptographic hash.
 */
const stableHash = (input: string): string => {
  let h = 5381
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  // Force positive 32-bit, base36 for short key length.
  return (h >>> 0).toString(36)
}

const cacheKey = (
  viewerPrompt: string,
  candidateIds: number[],
  language: string,
): string => {
  const normalisedPrompt = viewerPrompt.trim().toLowerCase().replace(/\s+/g, ' ')
  const sortedIds = [...candidateIds].sort((a, b) => a - b).join(',')
  const payload = `${language}|${normalisedPrompt}|${sortedIds}`
  return `${CACHE_KEY_PREFIX}${stableHash(payload)}`
}

const readCache = (key: string): SemanticFilterResult[] | null => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as CacheEntry
    if (parsed?.v !== CACHE_VERSION) {
      return null
    }
    if (!parsed?.results || !Array.isArray(parsed.results)) {
      return null
    }
    if (Date.now() - (parsed.storedAt ?? 0) > CACHE_TTL_MS) {
      return null
    }
    return parsed.results
  } catch {
    return null
  }
}

const writeCache = (key: string, results: SemanticFilterResult[]): void => {
  try {
    const entry: CacheEntry = { results, storedAt: Date.now(), v: CACHE_VERSION }
    window.localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // localStorage quota or disabled — silently degrade.
  }
}

/**
 * Invokes the ai-semantic-filter Edge Function. Returns one result per
 * candidate (in the model's order, not necessarily input order). Returns
 * null on any failure — callers must fall back gracefully.
 *
 * Cached client-side per (prompt, candidate IDs, language) for 24h.
 */
export const backendInvokeSemanticFilter = async (input: {
  viewerPrompt: string
  candidates: SemanticCandidate[]
  language?: 'en' | 'ro'
}): Promise<SemanticFilterResult[] | null> => {
  // Caller-side guards — don't burn an API call on inputs the server will reject.
  if (input.viewerPrompt.trim().length < MIN_PROMPT_LENGTH) {
    return null
  }
  if (!input.candidates || input.candidates.length === 0) {
    return null
  }

  const supabase = createSupabaseClient()
  if (!supabase) {
    return null
  }

  const language = input.language ?? 'en'
  const candidateIds = input.candidates.map((c) => c.id)
  const key = cacheKey(input.viewerPrompt, candidateIds, language)

  const cached = readCache(key)
  if (cached) {
    return cached
  }

  try {
    const { data, error } = await supabase.functions.invoke<{
      results?: SemanticFilterResult[]
      error?: string
    }>('ai-semantic-filter', {
      body: {
        viewerPrompt: input.viewerPrompt,
        // Map down to just the fields the Edge Function needs — never ship
        // the user's photos / personality answers / etc. cross the wire.
        candidates: input.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          age: c.age,
          city: c.city,
          bio: c.bio,
          interests: c.interests,
          vibe: c.vibe,
          relationshipGoal: c.relationshipGoal,
        })),
        language,
      },
    })

    if (error) {
      console.warn('[Privé] semantic filter invoke error', error)
      return null
    }

    const results = Array.isArray(data?.results) ? data.results : null
    if (!results || results.length === 0) {
      return null
    }

    writeCache(key, results)
    return results
  } catch (err) {
    console.warn('[Privé] semantic filter threw', err)
    return null
  }
}
