import type { Profile } from './priveApi'

export type SafetyCategory =
  | 'spam'
  | 'scam'
  | 'harassment'
  | 'hate'
  | 'nudity'
  | 'underage'
  | 'impersonation'
  | 'other'

export type ModerationStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed'

export type AiRiskLevel = 'low' | 'medium' | 'high'

export type SafetyReport = {
  id: string
  profileId: number
  profileName: string
  profileSnapshot: {
    age: number
    city: string
    vibe: string
    bio: string
    relationshipGoal: string
    photoUrl: string
  }
  category: SafetyCategory
  details: string
  reporterEmail: string
  createdAt: number
  status: ModerationStatus
  reviewedAt: number | null
  reviewerEmail: string | null
  // Phase #5 — AI safety triage. Populated async by the ai-safety-triage
  // Edge Function after submission. All three are undefined until the
  // triage call lands.
  aiRiskLevel?: AiRiskLevel
  aiCategories?: SafetyCategory[]
  aiSummary?: string
}

const BLOCKED_IDS_KEY = 'lovedate:blocked-profiles'
const MODERATION_QUEUE_KEY = 'lovedate:moderation-queue'

export const SAFETY_CATEGORIES: SafetyCategory[] = [
  'spam',
  'scam',
  'harassment',
  'hate',
  'nudity',
  'underage',
  'impersonation',
  'other',
]

const isCategory = (value: string): value is SafetyCategory => {
  return SAFETY_CATEGORIES.includes(value as SafetyCategory)
}

const isStatus = (value: string): value is ModerationStatus => {
  return value === 'open' || value === 'reviewing' || value === 'resolved' || value === 'dismissed'
}

export const readBlockedProfileIds = (): number[] => {
  try {
    const raw = window.localStorage.getItem(BLOCKED_IDS_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((item): item is number => Number.isInteger(item))
  } catch {
    return []
  }
}

export const saveBlockedProfileIds = (ids: number[]): void => {
  window.localStorage.setItem(BLOCKED_IDS_KEY, JSON.stringify(ids))
}

export const readModerationQueue = (): SafetyReport[] => {
  try {
    const raw = window.localStorage.getItem(MODERATION_QUEUE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item): item is Record<string, unknown> => item && typeof item === 'object')
      .map((item) => {
        const categoryRaw = String(item.category ?? 'other')
        const statusRaw = String(item.status ?? 'open')
        return {
          id: String(item.id ?? ''),
          profileId: Number(item.profileId ?? 0),
          profileName: String(item.profileName ?? 'Unknown'),
          profileSnapshot: {
            age: Number((item.profileSnapshot as Record<string, unknown> | undefined)?.age ?? 0),
            city: String((item.profileSnapshot as Record<string, unknown> | undefined)?.city ?? ''),
            vibe: String((item.profileSnapshot as Record<string, unknown> | undefined)?.vibe ?? ''),
            bio: String((item.profileSnapshot as Record<string, unknown> | undefined)?.bio ?? ''),
            relationshipGoal: String(
              (item.profileSnapshot as Record<string, unknown> | undefined)?.relationshipGoal ?? '',
            ),
            photoUrl: String((item.profileSnapshot as Record<string, unknown> | undefined)?.photoUrl ?? ''),
          },
          category: isCategory(categoryRaw) ? categoryRaw : 'other',
          details: String(item.details ?? ''),
          reporterEmail: String(item.reporterEmail ?? 'unknown@lovedate.app'),
          createdAt: Number(item.createdAt ?? Date.now()),
          status: isStatus(statusRaw) ? statusRaw : 'open',
          reviewedAt: item.reviewedAt == null ? null : Number(item.reviewedAt),
          reviewerEmail: item.reviewerEmail == null ? null : String(item.reviewerEmail),
        }
      })
      .filter((item) => item.id.length > 0 && Number.isInteger(item.profileId))
  } catch {
    return []
  }
}

export const saveModerationQueue = (reports: SafetyReport[]): void => {
  window.localStorage.setItem(MODERATION_QUEUE_KEY, JSON.stringify(reports))
}

export const createSafetyReport = (input: {
  profile: Profile
  category: SafetyCategory
  details: string
  reporterEmail: string
}): SafetyReport => {
  return {
    id: `rpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    profileId: input.profile.id,
    profileName: input.profile.name,
    profileSnapshot: {
      age: input.profile.age,
      city: input.profile.city,
      vibe: input.profile.vibe,
      bio: input.profile.bio,
      relationshipGoal: input.profile.relationshipGoal,
      photoUrl: input.profile.photos[0] ?? '',
    },
    category: input.category,
    details: input.details,
    reporterEmail: input.reporterEmail,
    createdAt: Date.now(),
    status: 'open',
    reviewedAt: null,
    reviewerEmail: null,
  }
}
