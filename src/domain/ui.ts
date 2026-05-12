import type { ModerationStatus } from '../services/moderation'

export type AppScreen =
  | 'login'
  | 'discover'
  | 'activity'
  | 'circles'
  | 'chats'
  | 'profile'
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
