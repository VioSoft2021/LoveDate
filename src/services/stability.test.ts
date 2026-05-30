import { describe, it, expect } from 'vitest'

import {
  stabilityProfileFromAnswers,
  stabilityFromProfiles,
  getStabilityQuestions,
  STABILITY_QUESTION_COUNT,
  type StabilityProfile,
} from './stability'
import type { LikertAnswer } from './compatibility'

// A high-durability, kids-yes, saver, balanced-pace profile.
const strong: StabilityProfile = {
  conflictRepair: 90,
  commitment: 90,
  communication: 90,
  values: { children: 'yes', finances: 'saver', pace: 'balanced' },
  completedAt: '2026-05-30T00:00:00.000Z',
}

describe('stability — question sets', () => {
  it('exposes 12 questions in both languages, stable id order', () => {
    for (const lang of ['en', 'ro'] as const) {
      const qs = getStabilityQuestions(lang)
      expect(qs).toHaveLength(STABILITY_QUESTION_COUNT)
      expect(qs.map((q) => q.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    }
  })
})

describe('stability — derivation (answers → profile)', () => {
  it('returns null unless exactly 12 answers are given', () => {
    expect(stabilityProfileFromAnswers([])).toBeNull()
    expect(stabilityProfileFromAnswers([5, 5, 5] as LikertAnswer[])).toBeNull()
  })

  it('reverse-keys trait items and buckets value items', () => {
    // Items 1 & 3 (conflictRepair) are reverse-keyed; answering 1 ("strongly
    // disagree I shut down / say hurtful things") + 5 on the repair item =>
    // top conflict-repair score.
    const answers: LikertAnswer[] = [
      1, 5, 1, // conflictRepair: rev(1)=5, 5, rev(1)=5 → 100
      5, 1, 5, // commitment:     5, rev(1)=5, 5       → 100
      5, 5, 1, // communication:  5, 5, rev(1)=5       → 100
      5,       // children → yes
      1,       // finances → spender
      3,       // pace → balanced
    ]
    const p = stabilityProfileFromAnswers(answers)
    expect(p).not.toBeNull()
    expect(p!.conflictRepair).toBe(100)
    expect(p!.commitment).toBe(100)
    expect(p!.communication).toBe(100)
    expect(p!.values).toEqual({ children: 'yes', finances: 'spender', pace: 'balanced' })
  })
})

describe('stability — pairwise verdict', () => {
  it('two strong aligned profiles → strong band, all-positive drivers', () => {
    const v = stabilityFromProfiles(strong, strong)
    expect(v.band).toBe('strong')
    expect(v.score).toBeGreaterThanOrEqual(78)
    expect(v.drivers.length).toBeGreaterThan(0)
    expect(v.drivers.every((d) => d.polarity === 'positive')).toBe(true)
  })

  it('children mismatch caps the band and surfaces as the leading risk', () => {
    const wantsKids = strong
    const noKids: StabilityProfile = {
      ...strong,
      values: { ...strong.values, children: 'no' },
    }
    const v = stabilityFromProfiles(wantsKids, noKids)
    // Strong traits must NOT mask the dealbreaker.
    expect(v.score).toBeLessThanOrEqual(52)
    expect(['building', 'fragile']).toContain(v.band)
    expect(v.drivers[0]).toEqual({ key: 'children', polarity: 'risk' })
  })

  it('returns a neutral building verdict when either profile is missing', () => {
    expect(stabilityFromProfiles(strong, null)).toEqual({
      score: 50,
      band: 'building',
      drivers: [],
    })
    expect(stabilityFromProfiles(undefined, strong).band).toBe('building')
  })

  it('low-trait, multi-mismatch pairing → fragile', () => {
    const a: StabilityProfile = {
      conflictRepair: 20,
      commitment: 25,
      communication: 22,
      values: { children: 'no', finances: 'spender', pace: 'slow' },
      completedAt: '2026-05-30T00:00:00.000Z',
    }
    const b: StabilityProfile = {
      conflictRepair: 25,
      commitment: 20,
      communication: 28,
      values: { children: 'yes', finances: 'saver', pace: 'fast' },
      completedAt: '2026-05-30T00:00:00.000Z',
    }
    const v = stabilityFromProfiles(a, b)
    expect(v.band).toBe('fragile')
    expect(v.drivers.some((d) => d.key === 'children' && d.polarity === 'risk')).toBe(true)
  })
})
