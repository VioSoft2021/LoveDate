import { createSupabaseClient } from '../supabaseClient'

export type AiDateProfileInput = {
  name: string
  age?: number
  city?: string
  vibe?: string
  bio?: string
  interests?: string[]
  relationshipGoal?: string
  zodiac?: string
}

export type AiDatePlan = {
  title: string
  placeType: string
  budget: '$' | '$$' | '$$$'
  duration: string
  pitch: string
  message: string
}

type CacheEntry = {
  plans: AiDatePlan[]
  storedAt: number
  v: number
}

const CACHE_KEY_PREFIX = 'lovedate:ai-date-planner:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const CACHE_VERSION = 1

// Stable hash of the profile fields the model sees. Editing either
// profile invalidates cached plans automatically.
const hashProfile = (p: AiDateProfileInput): string => {
  const fields = [
    p.name,
    p.age ?? '',
    p.city ?? '',
    p.vibe ?? '',
    p.bio ?? '',
    (p.interests ?? []).join(','),
    p.relationshipGoal ?? '',
    p.zodiac ?? '',
  ].join('|')
  let hash = 0
  for (let i = 0; i < fields.length; i++) {
    hash = (hash * 31 + fields.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

const cacheKey = (
  self: AiDateProfileInput,
  other: AiDateProfileInput & { id: number },
  language: string,
): string =>
  `${CACHE_KEY_PREFIX}${language}:${hashProfile(self)}:${other.id}:${hashProfile(other)}`

const readCache = (key: string): AiDatePlan[] | null => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (parsed?.v !== CACHE_VERSION) return null
    if (Date.now() - (parsed.storedAt ?? 0) > CACHE_TTL_MS) return null
    if (!Array.isArray(parsed.plans) || parsed.plans.length === 0) return null
    return parsed.plans
  } catch {
    return null
  }
}

const writeCache = (key: string, plans: AiDatePlan[]): void => {
  try {
    const entry: CacheEntry = { plans, storedAt: Date.now(), v: CACHE_VERSION }
    window.localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // best-effort
  }
}

/**
 * Invokes the ai-date-planner Edge Function. Returns 3 personalized date
 * plans (casual / mid / signature) or null on any failure so the caller
 * can fall back to the templated generator.
 *
 * Cached client-side per (language, selfHash, otherId, otherHash) for 7
 * days. Editing either profile invalidates automatically.
 */
export const backendInvokeDatePlanner = async (input: {
  selfProfile: AiDateProfileInput
  otherProfile: AiDateProfileInput & { id: number }
  chemistryScore?: number
  language?: 'en' | 'ro'
}): Promise<AiDatePlan[] | null> => {
  const supabase = createSupabaseClient()
  if (!supabase) return null

  const language = input.language ?? 'en'
  const key = cacheKey(input.selfProfile, input.otherProfile, language)
  const cached = readCache(key)
  if (cached) return cached

  try {
    const { data, error } = await supabase.functions.invoke<{
      plans?: AiDatePlan[]
      error?: string
    }>('ai-date-planner', {
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
        chemistryScore: input.chemistryScore,
        language,
      },
    })
    if (error || !Array.isArray(data?.plans) || data.plans.length === 0) {
       
      console.warn(
        'ai-date-planner failed:',
        error?.message ?? data?.error ?? 'no plans',
      )
      return null
    }
    writeCache(key, data.plans)
    return data.plans
  } catch (error) {
     
    console.warn('ai-date-planner threw:', error)
    return null
  }
}
