import type { CallLogEntry } from '../domain'
import { CALL_HISTORY_STORAGE_KEY } from './keys'

export const readCallHistory = (): CallLogEntry[] => {
  try {
    const raw = window.localStorage.getItem(CALL_HISTORY_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => {
        const type: CallLogEntry['type'] = item.type === 'video' ? 'video' : 'audio'
        const outcome: CallLogEntry['outcome'] =
          item.outcome === 'connected' ||
          item.outcome === 'ended' ||
          item.outcome === 'missed' ||
          item.outcome === 'failed'
            ? item.outcome
            : 'initiated'
        return {
          id: String(item.id ?? ''),
          profileId: Number(item.profileId ?? 0),
          profileName: String(item.profileName ?? 'Match'),
          type,
          roomId: String(item.roomId ?? ''),
          roomUrl: String(item.roomUrl ?? ''),
          startedAt: Number(item.startedAt ?? Date.now()),
          answeredAt: item.answeredAt == null ? null : Number(item.answeredAt),
          endedAt: item.endedAt == null ? null : Number(item.endedAt),
          outcome,
        }
      })
      .filter((entry) => entry.id.length > 0 && Number.isFinite(entry.profileId))
  } catch {
    return []
  }
}
