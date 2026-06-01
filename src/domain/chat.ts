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
