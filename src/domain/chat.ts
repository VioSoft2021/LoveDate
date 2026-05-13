export type ChatMessage = {
  id: number
  cloudId?: string
  sender: 'me' | 'them'
  text: string
  createdAt: number
  attachment?: {
    kind: 'image' | 'video' | 'audio'
    url: string
    name: string
  }
  callMeta?: {
    type: 'audio' | 'video'
    roomId: string
    roomUrl: string
    event: 'invite' | 'connected' | 'ended' | 'missed' | 'failed'
  }
  status?: 'sending' | 'sent' | 'read'
}

export type DatePlan = {
  id: string
  title: string
  placeType: string
  budget: '$' | '$$' | '$$$'
  duration: string
  pitch: string
  message: string
}
