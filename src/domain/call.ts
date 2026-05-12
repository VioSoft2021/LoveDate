export type CallState = {
  active: boolean
  type: 'audio' | 'video' | null
  status: 'connecting' | 'live' | 'error'
  startedAt: number
  targetProfileId: number | null
  muted: boolean
  cameraOff: boolean
  roomId: string | null
  roomUrl: string | null
}

export type CallLogEntry = {
  id: string
  profileId: number
  profileName: string
  type: 'audio' | 'video'
  roomId: string
  roomUrl: string
  startedAt: number
  answeredAt: number | null
  endedAt: number | null
  outcome: 'initiated' | 'connected' | 'ended' | 'missed' | 'failed'
}
