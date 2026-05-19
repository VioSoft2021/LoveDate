import { createSupabaseClient } from './supabaseClient'
import { sanitizeAnswers, type PersonalityAnswer } from './compatibility'

export type Profile = {
  id: number
  authUserId: string | null
  name: string
  age: number
  city: string
  vibe: string
  bio: string
  interests: string[]
  palette: [string, string]
  photos: string[]
  gender: 'Woman' | 'Man' | 'Non-binary'
  distanceKm: number
  verified: boolean
  relationshipGoal: 'Long-term' | 'Short-term' | 'Friends' | 'Figuring it out'
  zodiac: string
  personalityAnswers: PersonalityAnswer[]
  // 4-letter code (e.g. CSOA) derived server-side from the OWNER's
  // private quiz answers, exposed publicly so other clients can rank.
  // Undefined when the row predates the 2026-05-19 migration; callers
  // fall back to deriving from `personalityAnswers` in that case.
  personalityCode?: string
}

const toHighResPhoto = (url: string): string => {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('images.unsplash.com')) {
      parsed.searchParams.set('auto', 'format')
      parsed.searchParams.set('fit', 'crop')
      parsed.searchParams.set('w', '1600')
      parsed.searchParams.set('q', '85')
      return parsed.toString()
    }
    return url
  } catch {
    return url
  }
}

const WOMAN_PHOTO_POOL = [
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
]

const MAN_PHOTO_POOL = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1541534401786-2077eed87a72?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
]

const NON_BINARY_PHOTO_POOL = [
  'https://api.dicebear.com/9.x/adventurer/png?seed=Sky&size=1024',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Nova&size=1024',
  'https://api.dicebear.com/9.x/adventurer/png?seed=River&size=1024',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Quinn&size=1024',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Zen&size=1024',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Echo&size=1024',
]

const pickGenderPhotos = (gender: Profile['gender'], index: number): string[] => {
  const pool =
    gender === 'Woman'
      ? WOMAN_PHOTO_POOL
      : gender === 'Man'
        ? MAN_PHOTO_POOL
        : NON_BINARY_PHOTO_POOL

  return [
    pool[index % pool.length],
    pool[(index + 2) % pool.length],
    pool[(index + 4) % pool.length],
  ].map(toHighResPhoto)
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

const mapProfileRow = (row: Record<string, unknown>): Profile | null => {
  const id = Number(row.id)
  if (!Number.isFinite(id)) return null
  const genderRaw = String(row.gender ?? 'Woman')
  const relationshipRaw = String(row.relationship_goal ?? 'Long-term')
  const gender: Profile['gender'] =
    genderRaw === 'Man' || genderRaw === 'Non-binary' ? genderRaw : 'Woman'
  const relationshipGoal: Profile['relationshipGoal'] =
    relationshipRaw === 'Short-term' ||
    relationshipRaw === 'Friends' ||
    relationshipRaw === 'Figuring it out'
      ? relationshipRaw
      : 'Long-term'
  const photos = Array.isArray(row.photos)
    ? (row.photos as unknown[])
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .slice(0, 9)
        .map(toHighResPhoto)
    : []
  const interests = Array.isArray(row.interests)
    ? (row.interests as unknown[])
        .filter((value): value is string => typeof value === 'string')
        .slice(0, 6)
    : []
  const palette: [string, string] =
    Array.isArray(row.palette) && row.palette.length >= 2
      ? [String((row.palette as unknown[])[0]), String((row.palette as unknown[])[1])]
      : ['#141937', '#252d5c']
  const extras =
    row.extras && typeof row.extras === 'object'
      ? (row.extras as Record<string, unknown>)
      : {}
  const personalityAnswers = sanitizeAnswers(extras.personalityAnswers)
  const personalityCode =
    typeof row.personality_code === 'string' && row.personality_code.length === 4
      ? row.personality_code
      : undefined

  return {
    id,
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    name: String(row.name ?? 'Unknown'),
    age: Number(row.age ?? 25),
    city: String(row.city ?? 'City'),
    vibe: String(row.vibe ?? 'Good energy'),
    bio: String(row.bio ?? ''),
    interests: interests.length > 0 ? interests : ['Coffee', 'Music', 'Travel'],
    palette,
    photos: photos.length > 0 ? photos : pickGenderPhotos(gender, id),
    gender,
    distanceKm: Math.max(1, Number(row.distance_km ?? 10)),
    verified: Boolean(row.verified),
    relationshipGoal,
    zodiac: String(row.zodiac ?? 'Libra'),
    // Other users' raw answers moved server-only on 2026-05-19. When extras
    // doesn't carry the answers (the post-migration steady state for
    // everyone but the viewer themselves), return [] — the deck heuristic
    // falls back to personality_code via compatibilityFromCodes.
    personalityAnswers: personalityAnswers.length === 8 ? personalityAnswers : [],
    personalityCode,
  }
}

export const getProfiles = async (): Promise<Profile[]> => {
  await wait(220)
  const supabase = createSupabaseClient()
  if (supabase) {
    // Phase B4: real users now appear in the deck. Exclude self via
    // auth_user_id (the bridge column added in B1). Prefer the cached
    // session — getSession() reads in-memory state populated synchronously
    // by sign-in, while getUser() hits the server and races with a
    // just-completed sign-in. If we still can't resolve a uid, refuse to
    // load the deck (returning [] is safer than showing self).
    const {
      data: { session },
    } = await supabase.auth.getSession()
    let selfUid = session?.user?.id ?? null
    if (!selfUid) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      selfUid = user?.id ?? null
    }
    if (!selfUid) {
      // eslint-disable-next-line no-console
      console.warn('[getProfiles] no auth uid — refusing to load deck')
      return []
    }

    // Only show profiles that have a proper auth_user_id (i.e. owned by a real
    // signed-in user). Null auth_user_id rows are orphan/legacy data from
    // before the B1 identity bridge — they have no way to be matched/messaged.
    // Self-exclusion is unconditional: never show the viewer their own row.
    const query = supabase
      .from('profiles')
      .select(
        'id, name, age, city, vibe, bio, interests, palette, photos, gender, distance_km, verified, relationship_goal, zodiac, extras, personality_code, is_active, auth_user_id',
      )
      .eq('is_active', true)
      .not('auth_user_id', 'is', null)
      .neq('auth_user_id', selfUid)
      .limit(200)
    const { data, error } = await query

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data
        .map((row) => mapProfileRow(row as Record<string, unknown>))
        .filter((profile): profile is Profile => profile !== null)
      if (mapped.length > 0) {
        return mapped
      }
    }
  }

  // No real data available — return empty so the app shows "no profiles" state.
  // The fixture data is intentionally not used in production.
  return []
}

/**
 * Returns the profiles of every user the caller is mutually matched with.
 * Wraps the get_my_matches() SECURITY DEFINER RPC. Used on auth to seed the
 * local match list so it survives reinstalls.
 */
export const getMyMatches = async (): Promise<Profile[]> => {
  const supabase = createSupabaseClient()
  if (!supabase) {
    return []
  }
  const { data, error } = await supabase.rpc('get_my_matches')
  if (error || !Array.isArray(data)) {
    // eslint-disable-next-line no-console
    console.warn('get_my_matches failed:', error?.message ?? 'no data')
    return []
  }
  return data
    .map((row) => mapProfileRow(row as Record<string, unknown>))
    .filter((profile): profile is Profile => profile !== null)
}

export const resolveMatch = async (profileId: number): Promise<boolean> => {
  const supabase = createSupabaseClient()
  if (!supabase) {
    return false
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return false
  }
  const { data: target } = await supabase
    .from('profiles')
    .select('auth_user_id')
    .eq('id', profileId)
    .maybeSingle()
  if (!target?.auth_user_id) {
    return false
  }
  const { data, error } = await supabase.rpc('users_are_matched', {
    user_a: user.id,
    user_b: target.auth_user_id,
  })
  if (error) {
    return false
  }
  return Boolean(data)
}

