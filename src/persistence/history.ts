import type { SwipeHistory } from '../domain'
import { HISTORY_STORAGE_KEY } from './keys'

export const readHistory = (): SwipeHistory => {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) {
      return { likedIds: [], passedIds: [], matchIds: [] }
    }

    const parsed = JSON.parse(raw) as Partial<SwipeHistory>
    return {
      likedIds: Array.isArray(parsed.likedIds)
        ? parsed.likedIds.filter((id): id is number => Number.isInteger(id))
        : [],
      passedIds: Array.isArray(parsed.passedIds)
        ? parsed.passedIds.filter((id): id is number => Number.isInteger(id))
        : [],
      matchIds: Array.isArray(parsed.matchIds)
        ? parsed.matchIds.filter((id): id is number => Number.isInteger(id))
        : [],
    }
  } catch {
    return { likedIds: [], passedIds: [], matchIds: [] }
  }
}
