import { describe, it, expect, beforeEach } from 'vitest'
import {
  getActivePlan,
  setActivePlan,
  getLikeLimitPer24Hours,
  getRewindLimitPer24Hours,
  canUsePassport,
  canSeeWhoLikedYou,
  canPrioritizeProfile,
} from './planGate'

describe('getActivePlan / setActivePlan', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to "free" when nothing is stored', () => {
    expect(getActivePlan()).toBe('free')
  })

  it('round-trips a valid plan through localStorage', () => {
    setActivePlan('plus')
    expect(getActivePlan()).toBe('plus')
    setActivePlan('gold')
    expect(getActivePlan()).toBe('gold')
    setActivePlan('platinum')
    expect(getActivePlan()).toBe('platinum')
  })

  it('falls back to "free" when stored value is junk', () => {
    window.localStorage.setItem('lovedate:active-plan', 'enterprise-mega-deluxe')
    expect(getActivePlan()).toBe('free')
  })
})

describe('plan gate predicates', () => {
  it('free plan denies premium features', () => {
    expect(canUsePassport('free')).toBe(false)
    expect(canSeeWhoLikedYou('free')).toBe(false)
    expect(canPrioritizeProfile('free')).toBe(false)
  })

  it('platinum plan grants every premium feature', () => {
    expect(canUsePassport('platinum')).toBe(true)
    expect(canSeeWhoLikedYou('platinum')).toBe(true)
    expect(canPrioritizeProfile('platinum')).toBe(true)
  })

  it('plus and gold sit between free and platinum', () => {
    // Plus and gold should both allow at least one premium feature.
    const plusAny =
      canUsePassport('plus') || canSeeWhoLikedYou('plus') || canPrioritizeProfile('plus')
    const goldAny =
      canUsePassport('gold') || canSeeWhoLikedYou('gold') || canPrioritizeProfile('gold')
    expect(plusAny).toBe(true)
    expect(goldAny).toBe(true)
  })
})

describe('plan limit getters', () => {
  it('returns a finite-or-null like limit for every tier', () => {
    for (const tier of ['free', 'plus', 'gold', 'platinum'] as const) {
      const limit = getLikeLimitPer24Hours(tier)
      // null = unlimited; otherwise finite positive number
      expect(limit === null || (typeof limit === 'number' && limit > 0)).toBe(true)
    }
  })

  it('returns a non-negative rewind limit for every tier', () => {
    for (const tier of ['free', 'plus', 'gold', 'platinum'] as const) {
      expect(getRewindLimitPer24Hours(tier)).toBeGreaterThanOrEqual(0)
    }
  })

  it('free tier has the tightest like limit', () => {
    const freeLimit = getLikeLimitPer24Hours('free')
    const platinumLimit = getLikeLimitPer24Hours('platinum')
    // Either free has a finite cap that's <= platinum's, or both are unlimited.
    if (freeLimit !== null && platinumLimit !== null) {
      expect(freeLimit).toBeLessThanOrEqual(platinumLimit)
    } else {
      // Platinum should be unlimited (null) — that's the whole point of the tier.
      expect(platinumLimit).toBeNull()
    }
  })
})
