export type PlanTier = 'free' | 'plus' | 'gold' | 'platinum'

export type IdentityVerificationLevel = 'none' | 'photo' | 'photo-and-id'

export type AppEnvironment = 'development' | 'staging' | 'production'

export type TinderEquivalentConfig = {
  app: {
    name: string
    environment: AppEnvironment
    locale: string
    discoveryCardAspectRatio: number
    profilePhotoAspectRatio: number
    maxPhotosPerProfile: number
    maxBioLength: number
    maxPromptLength: number
  }
  discovery: {
    minAge: number
    maxAge: number
    minRadiusKm: number
    maxRadiusKm: number
    defaultRadiusKm: number
    defaultMinAge: number
    defaultMaxAge: number
    maxDailyDeckFetches: number
  }
  moderation: {
    enableNsfwDetection: boolean
    enableSpamDetection: boolean
    enableHarassmentClassifier: boolean
    enableLinkBlockingForNewAccounts: boolean
    requiredVerificationForHighRiskActions: IdentityVerificationLevel
  }
  ranking: {
    recencyWeight: number
    profileCompletenessWeight: number
    mutualInterestWeight: number
    conversationReplyRateWeight: number
    geographicProximityWeight: number
  }
}

export const TINDER_EQUIVALENT_CONFIG: TinderEquivalentConfig = {
  app: {
    name: 'Privé',
    environment: 'development',
    locale: 'en-US',
    discoveryCardAspectRatio: 0.74,
    profilePhotoAspectRatio: 0.8,
    maxPhotosPerProfile: 9,
    maxBioLength: 500,
    maxPromptLength: 120,
  },
  discovery: {
    minAge: 18,
    maxAge: 100,
    minRadiusKm: 2,
    maxRadiusKm: 160,
    defaultRadiusKm: 40,
    defaultMinAge: 21,
    defaultMaxAge: 35,
    maxDailyDeckFetches: 120,
  },
  moderation: {
    enableNsfwDetection: true,
    enableSpamDetection: true,
    enableHarassmentClassifier: true,
    enableLinkBlockingForNewAccounts: true,
    requiredVerificationForHighRiskActions: 'photo',
  },
  ranking: {
    recencyWeight: 0.24,
    profileCompletenessWeight: 0.16,
    mutualInterestWeight: 0.28,
    conversationReplyRateWeight: 0.17,
    geographicProximityWeight: 0.15,
  },
}

export const PLAN_OPTIONS: Record<PlanTier, {
  likesPer24Hours: number | null
  rewindsPer24Hours: number
  boostsPerMonth: number
  superLikesPerWeek: number
  canUsePassport: boolean
  canSeeWhoLikedYou: boolean
  canPrioritizeProfile: boolean
}> = {
  free: {
    likesPer24Hours: 60,
    rewindsPer24Hours: 0,
    boostsPerMonth: 0,
    superLikesPerWeek: 1,
    canUsePassport: false,
    canSeeWhoLikedYou: false,
    canPrioritizeProfile: false,
  },
  plus: {
    likesPer24Hours: null,
    rewindsPer24Hours: 25,
    boostsPerMonth: 0,
    superLikesPerWeek: 5,
    canUsePassport: true,
    canSeeWhoLikedYou: false,
    canPrioritizeProfile: false,
  },
  gold: {
    likesPer24Hours: null,
    rewindsPer24Hours: 100,
    boostsPerMonth: 1,
    superLikesPerWeek: 5,
    canUsePassport: true,
    canSeeWhoLikedYou: true,
    canPrioritizeProfile: false,
  },
  platinum: {
    likesPer24Hours: null,
    rewindsPer24Hours: 200,
    boostsPerMonth: 2,
    superLikesPerWeek: 5,
    canUsePassport: true,
    canSeeWhoLikedYou: true,
    canPrioritizeProfile: true,
  },
}

// PRODUCT_FEATURE_FLAGS was declared but never read anywhere in the app —
// removed 2026-05-19 as part of the Phase F cleanup. The features either
// shipped unconditionally (profilePrompts, voiceMessages, aiIcebreakers,
// safetyCenter, hiddenWords) or never landed (readReceipts, exploreFeed)
// and would be reintroduced as real toggles if/when they ship.
