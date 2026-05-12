import type { CirclePost } from '../domain'
import {
  CIRCLES_JOINED_STORAGE_KEY,
  CIRCLES_POSTS_STORAGE_KEY,
  CIRCLES_RSVP_STORAGE_KEY,
} from './keys'

export const readJoinedCircles = (): string[] => {
  try {
    const raw = window.localStorage.getItem(CIRCLES_JOINED_STORAGE_KEY)
    if (!raw) {
      return ['design-lounge', 'coffee-club']
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return ['design-lounge', 'coffee-club']
    }
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
  } catch {
    return ['design-lounge', 'coffee-club']
  }
}

export const readCirclePosts = (): CirclePost[] => {
  try {
    const raw = window.localStorage.getItem(CIRCLES_POSTS_STORAGE_KEY)
    if (!raw) {
      return [
        {
          id: 'seed-post-1',
          circleId: 'design-lounge',
          author: 'Sofia',
          text: 'Hot take: the best first-date question is "what are you building for yourself this year?"',
          createdAt: Date.now() - 1000 * 60 * 43,
        },
        {
          id: 'seed-post-2',
          circleId: 'coffee-club',
          author: 'Noah',
          text: 'Anyone in Berlin wants to test 3 specialty cafes this weekend?',
          createdAt: Date.now() - 1000 * 60 * 120,
        },
      ]
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item, index) => ({
        id: typeof item.id === 'string' ? item.id : `post_${Date.now()}_${index}`,
        circleId: typeof item.circleId === 'string' ? item.circleId : '',
        author: typeof item.author === 'string' ? item.author : 'Member',
        text: typeof item.text === 'string' ? item.text : '',
        createdAt: Number.isFinite(item.createdAt) ? Number(item.createdAt) : Date.now(),
      }))
      .filter((item) => item.circleId.length > 0 && item.text.trim().length > 0)
  } catch {
    return []
  }
}

export const readCircleRsvps = (): Record<string, boolean> => {
  try {
    const raw = window.localStorage.getItem(CIRCLES_RSVP_STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }
    const next: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'boolean') {
        next[key] = value
      }
    }
    return next
  } catch {
    return {}
  }
}
