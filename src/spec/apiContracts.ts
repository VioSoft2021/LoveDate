import type { PlanTier } from './lovedateConfig'

export type ApiEnvelope<T> = {
  ok: boolean
  data: T
  requestId: string
  serverTime: string
}

export type Pagination = {
  cursor: string | null
  hasMore: boolean
}

export type AuthSession = {
  userId: string
  email: string
  token: string
  refreshToken: string
  expiresAt: string
}

export type DiscoveryCandidate = {
  profileId: number
  name: string
  age: number
  city: string
  distanceKm: number
  bio: string
  interests: string[]
  photos: string[]
  prompts: string[]
  verificationBadge: 'none' | 'photo-verified' | 'id-verified'
}

export type SwipeAction = 'pass' | 'like' | 'super-like'

export type MatchSummary = {
  matchId: string
  profileId: number
  matchedAt: string
  expiresAt: string | null
}

export type ChatThread = {
  matchId: string
  profileId: number
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

export type ChatMessagePayload = {
  messageId: string
  matchId: string
  senderId: string
  text: string
  createdAt: string
  status: 'sent' | 'delivered' | 'read'
}

export type UpdatePlanPayload = {
  plan: PlanTier
  source: 'stripe' | 'apple' | 'google' | 'promo'
}

export type FeatureFlagsPayload = {
  profilePromptsEnabled: boolean
  readReceiptsEnabled: boolean
  voiceMessagesEnabled: boolean
  exploreFeedEnabled: boolean
  aiIcebreakersEnabled: boolean
  safetyCenterEnabled: boolean
  hiddenWordsEnabled: boolean
}

export type ApiContracts = {
  'POST /v1/auth/login': {
    request: { email: string; password: string }
    response: ApiEnvelope<{ session: AuthSession }>
  }
  'POST /v1/auth/guest': {
    request: { deviceId: string }
    response: ApiEnvelope<{ session: AuthSession }>
  }
  'GET /v1/discovery/deck': {
    request: {
      minAge: number
      maxAge: number
      radiusKm: number
      city?: string
      interests?: string[]
      cursor?: string
    }
    response: ApiEnvelope<{ candidates: DiscoveryCandidate[]; page: Pagination }>
  }
  'POST /v1/discovery/swipe': {
    request: { profileId: number; action: SwipeAction; deckSessionId: string }
    response: ApiEnvelope<{ isMatch: boolean; match?: MatchSummary }>
  }
  'GET /v1/matches': {
    request: { cursor?: string }
    response: ApiEnvelope<{ matches: MatchSummary[]; page: Pagination }>
  }
  'GET /v1/chats/threads': {
    request: { cursor?: string }
    response: ApiEnvelope<{ threads: ChatThread[]; page: Pagination }>
  }
  'GET /v1/chats/messages': {
    request: { matchId: string; cursor?: string }
    response: ApiEnvelope<{ messages: ChatMessagePayload[]; page: Pagination }>
  }
  'POST /v1/chats/messages': {
    request: { matchId: string; text: string }
    response: ApiEnvelope<{ message: ChatMessagePayload }>
  }
  'PATCH /v1/users/preferences': {
    request: {
      minAge: number
      maxAge: number
      radiusKm: number
      city: string
      interests: string[]
    }
    response: ApiEnvelope<{ saved: true }>
  }
  'PATCH /v1/users/settings': {
    request: {
      pushNotifications: boolean
      emailNotifications: boolean
      readReceipts: boolean
    }
    response: ApiEnvelope<{ saved: true }>
  }
  'POST /v1/subscriptions/update-plan': {
    request: UpdatePlanPayload
    response: ApiEnvelope<{ updated: true; plan: PlanTier }>
  }
  'GET /v1/features/flags': {
    request: Record<string, never>
    response: ApiEnvelope<{ flags: FeatureFlagsPayload }>
  }
  'POST /v1/moderation/report': {
    request: {
      reportedUserId: string
      reason: 'spam' | 'harassment' | 'fake-profile' | 'inappropriate-content' | 'other'
      context: string
    }
    response: ApiEnvelope<{ reportId: string; queued: true }>
  }
}
