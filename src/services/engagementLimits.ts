import { getLikeLimitPer24Hours } from './planGate'
import { PLAN_OPTIONS, type PlanTier } from '../spec/priveConfig'

const LIKE_EVENTS_STORAGE_KEY = 'lovedate:like-events'
const SUPER_LIKE_EVENTS_STORAGE_KEY = 'lovedate:super-like-events'
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const ONE_WEEK_MS = 7 * ONE_DAY_MS

const readLikeEvents = (): number[] => {
  try {
    const raw = window.localStorage.getItem(LIKE_EVENTS_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is number => Number.isFinite(item))
  } catch {
    return []
  }
}

const persistLikeEvents = (timestamps: number[]): void => {
  window.localStorage.setItem(LIKE_EVENTS_STORAGE_KEY, JSON.stringify(timestamps))
}

const readSuperLikeEvents = (): number[] => {
  try {
    const raw = window.localStorage.getItem(SUPER_LIKE_EVENTS_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is number => Number.isFinite(item))
  } catch {
    return []
  }
}

const persistSuperLikeEvents = (timestamps: number[]): void => {
  window.localStorage.setItem(SUPER_LIKE_EVENTS_STORAGE_KEY, JSON.stringify(timestamps))
}

export const pruneOldLikeEvents = (now: number = Date.now()): number[] => {
  const events = readLikeEvents().filter((timestamp) => now - timestamp < ONE_DAY_MS)
  persistLikeEvents(events)
  return events
}

export const pruneOldSuperLikeEvents = (now: number = Date.now()): number[] => {
  const events = readSuperLikeEvents().filter((timestamp) => now - timestamp < ONE_WEEK_MS)
  persistSuperLikeEvents(events)
  return events
}

export const getLikeUsage = (plan: PlanTier): { used: number; limit: number | null; remaining: number | null } => {
  const events = pruneOldLikeEvents()
  const limit = getLikeLimitPer24Hours(plan)

  if (limit === null) {
    return {
      used: events.length,
      limit: null,
      remaining: null,
    }
  }

  return {
    used: events.length,
    limit,
    remaining: Math.max(0, limit - events.length),
  }
}

export const canLikeNow = (plan: PlanTier): boolean => {
  const usage = getLikeUsage(plan)
  if (usage.limit === null || usage.remaining === null) {
    return true
  }
  return usage.remaining > 0
}

export const recordLikeEvent = (): void => {
  const events = pruneOldLikeEvents()
  events.push(Date.now())
  persistLikeEvents(events)
}

export const rollbackLastLikeEvent = (): void => {
  const events = pruneOldLikeEvents()
  events.pop()
  persistLikeEvents(events)
}

export const getSuperLikeUsage = (
  plan: PlanTier,
): { used: number; limit: number; remaining: number } => {
  const events = pruneOldSuperLikeEvents()
  const limit = PLAN_OPTIONS[plan].superLikesPerWeek
  return {
    used: events.length,
    limit,
    remaining: Math.max(0, limit - events.length),
  }
}

export const canSuperLikeNow = (plan: PlanTier): boolean => {
  const usage = getSuperLikeUsage(plan)
  return usage.remaining > 0
}

export const recordSuperLikeEvent = (): void => {
  const events = pruneOldSuperLikeEvents()
  events.push(Date.now())
  persistSuperLikeEvents(events)
}

export const rollbackLastSuperLikeEvent = (): void => {
  const events = pruneOldSuperLikeEvents()
  events.pop()
  persistSuperLikeEvents(events)
}
