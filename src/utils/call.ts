import type { CallLogEntry } from '../domain'

export const sanitizeRoomPart = (value: string): string => {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const normalized = cleaned.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  return normalized.slice(0, 24) || 'guest'
}

export const buildCallRoom = (userEmail: string, profileId: number, type: 'audio' | 'video'): string => {
  const owner = sanitizeRoomPart(userEmail.split('@')[0] ?? 'guest')
  const stamp = Date.now().toString(36)
  return `lovedate-${type}-${owner}-${profileId}-${stamp}`
}

export const getCallOutcomeLabel = (outcome: CallLogEntry['outcome']): string => {
  switch (outcome) {
    case 'connected':
      return 'Connected'
    case 'ended':
      return 'Ended'
    case 'missed':
      return 'Missed'
    case 'failed':
      return 'Failed'
    default:
      return 'Calling'
  }
}

export const getCallDurationLabel = (startedAt: number, endedAt: number | null): string => {
  const durationMs = Math.max(0, (endedAt ?? Date.now()) - startedAt)
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}
