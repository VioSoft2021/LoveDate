import { PLAN_OPTIONS, PRODUCT_FEATURE_FLAGS, type PlanTier } from '../spec/lovedateConfig'

export type FeatureName = keyof typeof PRODUCT_FEATURE_FLAGS

const PLAN_STORAGE_KEY = 'lovedate:active-plan'

export const getActivePlan = (): PlanTier => {
  const raw = window.localStorage.getItem(PLAN_STORAGE_KEY)
  if (raw === 'plus' || raw === 'gold' || raw === 'platinum' || raw === 'free') {
    return raw
  }
  return 'free'
}

export const setActivePlan = (plan: PlanTier): void => {
  window.localStorage.setItem(PLAN_STORAGE_KEY, plan)
}

export const isFeatureEnabled = (feature: FeatureName): boolean => {
  return PRODUCT_FEATURE_FLAGS[feature]
}

export const getLikeLimitPer24Hours = (plan: PlanTier): number | null => {
  return PLAN_OPTIONS[plan].likesPer24Hours
}

export const getRewindLimitPer24Hours = (plan: PlanTier): number => {
  return PLAN_OPTIONS[plan].rewindsPer24Hours
}

export const canUsePassport = (plan: PlanTier): boolean => {
  return PLAN_OPTIONS[plan].canUsePassport
}

export const canSeeWhoLikedYou = (plan: PlanTier): boolean => {
  return PLAN_OPTIONS[plan].canSeeWhoLikedYou
}

export const canPrioritizeProfile = (plan: PlanTier): boolean => {
  return PLAN_OPTIONS[plan].canPrioritizeProfile
}
