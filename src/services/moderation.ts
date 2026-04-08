import type { Profile } from './loveDateApi'

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

export type SafetyReport = {
  id: string
  profileId: number
  profileName: string
  category: SafetyCategory
  details: string
  reporterEmail: string
  createdAt: number
  status: ModerationStatus
  reviewedAt: number | null
  reviewerEmail: string | null
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
    category: input.category,
    details: input.details,
    reporterEmail: input.reporterEmail,
    createdAt: Date.now(),
    status: 'open',
    reviewedAt: null,
    reviewerEmail: null,
  }
}
