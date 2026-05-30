import type { ModerationStatus } from '../services/moderation'

export type AppScreen =
  | 'login'
  | 'onboarding'
  | 'discover'
  | 'activity'
  | 'chats'
  | 'profile'
  | 'photo-studio'
  | 'love-personality'
  | 'love-personality-quiz'
  | 'stability-quiz'
  | 'personality-guide'
  | 'settings'
  | 'moderation'
  | 'profile-detail'
  | 'filters'

export type AppLanguage = 'en' | 'ro'

export type Toast = {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

export type NotificationItem = {
  id: number
  title: string
  body: string
  createdAt: number
  read: boolean
  category: 'match' | 'message' | 'system' | 'safety'
}

export type ModerationFilter = 'all' | ModerationStatus
