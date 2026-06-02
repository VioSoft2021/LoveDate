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

export type ToastAction = { label: string; onClick: () => void }

export type Toast = {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
  /** Optional one-tap action (e.g. "Open Settings"). Its presence keeps the
   *  toast on screen longer so it can actually be tapped. */
  action?: ToastAction
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
