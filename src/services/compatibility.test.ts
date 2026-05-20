import { describe, it, expect } from 'vitest'
import {
  sanitizeAnswers,
  vectorFromAnswers,
  personalityCodeFromAnswers,
  compatibilityFromAnswers,
  compatibilityFromCodes,
  type PersonalityAnswer,
} from './compatibility'

describe('sanitizeAnswers', () => {
  it('keeps valid A/B answers in order', () => {
    expect(sanitizeAnswers(['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B'])).toEqual([
      'A', 'B', 'A', 'B', 'A', 'B', 'A', 'B',
    ])
  })

  it('drops anything that is not literally "A" or "B"', () => {
    expect(sanitizeAnswers(['A', 'a', null, undefined, 'C', 'B', 1, true])).toEqual([
      'A', 'B',
    ])
  })

  it('returns [] for non-array input', () => {
    expect(sanitizeAnswers(null)).toEqual([])
    expect(sanitizeAnswers(undefined)).toEqual([])
    expect(sanitizeAnswers('A')).toEqual([])
    expect(sanitizeAnswers({ 0: 'A' })).toEqual([])
  })

  it('caps at the personality-question count', () => {
    const tooMany = Array(20).fill('A') as PersonalityAnswer[]
    expect(sanitizeAnswers(tooMany)).toHaveLength(8)
  })
})

describe('vectorFromAnswers', () => {
  it('returns the neutral 50/50 vector for empty input', () => {
    expect(vectorFromAnswers([])).toEqual({
      energy: 50,
      pace: 50,
      social: 50,
      planning: 50,
    })
  })

  it('counts B answers per axis and scales to 0-100', () => {
    // 2 questions per axis; energy=Q1+Q2, pace=Q3+Q4, social=Q5+Q6, planning=Q7+Q8.
    // All A => 0% on every axis.
    expect(vectorFromAnswers(['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'])).toEqual({
      energy: 0,
      pace: 0,
      social: 0,
      planning: 0,
    })
    // All B => 100% on every axis.
    expect(vectorFromAnswers(['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'])).toEqual({
      energy: 100,
      pace: 100,
      social: 100,
      planning: 100,
    })
    // 1 B per axis => 50% per axis.
    expect(vectorFromAnswers(['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B'])).toEqual({
      energy: 50,
      pace: 50,
      social: 50,
      planning: 50,
    })
  })

  it('handles a mixed real-world vector correctly', () => {
    // Q1=A,Q2=A (energy=0), Q3=B,Q4=B (pace=100), Q5=A,Q6=B (social=50), Q7=B,Q8=A (planning=50)
    expect(vectorFromAnswers(['A', 'A', 'B', 'B', 'A', 'B', 'B', 'A'])).toEqual({
      energy: 0,
      pace: 100,
      social: 50,
      planning: 50,
    })
  })
})

describe('personalityCodeFromAnswers', () => {
  it('all-A produces CMFR (every axis at 0%, below the 50 threshold)', () => {
    expect(personalityCodeFromAnswers(['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'])).toBe('CMFR')
  })

  it('all-B produces DSOA (every axis at 100%, >=50)', () => {
    expect(personalityCodeFromAnswers(['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'])).toBe('DSOA')
  })

  it('50/50 vector hits the boundary at >=50 -> active letters', () => {
    // 1 B per axis = 50 exactly, which is >= 50, so DSOA.
    expect(personalityCodeFromAnswers(['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B'])).toBe('DSOA')
  })

  it('matches the SQL backfill axis mapping (energy, pace, social, planning)', () => {
    // Mixed vector: energy active, pace calm, social active, planning calm
    // energy>=50 -> D, pace<50 -> M, social>=50 -> O, planning<50 -> R
    expect(personalityCodeFromAnswers(['B', 'A', 'A', 'A', 'B', 'B', 'A', 'A'])).toBe('DMOR')
  })
})

describe('compatibilityFromAnswers', () => {
  it('returns 99 (max) when both vectors are identical', () => {
    const mine: PersonalityAnswer[] = ['A', 'A', 'B', 'B', 'A', 'B', 'B', 'A']
    expect(compatibilityFromAnswers(mine, mine)).toBe(99)
  })

  it('clamps to the [1, 99] range even on max distance', () => {
    // Polar opposites: all A vs all B
    const a: PersonalityAnswer[] = ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A']
    const b: PersonalityAnswer[] = ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B']
    const score = compatibilityFromAnswers(a, b)
    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(99)
  })

  it('returns lower for more dissimilar vectors than for similar ones', () => {
    const baseline: PersonalityAnswer[] = ['A', 'A', 'B', 'B', 'A', 'B', 'B', 'A']
    const slightlyDifferent: PersonalityAnswer[] = ['A', 'A', 'B', 'B', 'A', 'B', 'B', 'B']
    const veryDifferent: PersonalityAnswer[] = ['B', 'B', 'A', 'A', 'B', 'A', 'A', 'B']
    expect(compatibilityFromAnswers(baseline, slightlyDifferent)).toBeGreaterThan(
      compatibilityFromAnswers(baseline, veryDifferent),
    )
  })
})

describe('compatibilityFromCodes', () => {
  it('returns 99 when codes match all 4 axes', () => {
    const answers: PersonalityAnswer[] = ['A', 'A', 'B', 'B', 'A', 'B', 'B', 'A']
    const myCode = personalityCodeFromAnswers(answers)
    expect(compatibilityFromCodes(answers, myCode)).toBe(99)
  })

  it('returns ~50 when codes match 2 of 4 letters', () => {
    // My code is CMOR; their code CMFA differs on axis 3 (O vs F) and 4 (R vs A)
    // 2/4 match -> (2/4)*98 + 1 = 50
    const myAnswers: PersonalityAnswer[] = ['A', 'A', 'A', 'A', 'B', 'B', 'A', 'A']
    expect(compatibilityFromCodes(myAnswers, 'CMFA')).toBe(50)
  })

  it('returns 1 (min) when codes share no letters', () => {
    const allA: PersonalityAnswer[] = ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A']
    // allA -> CMFR. Opposite: DSOA.
    expect(compatibilityFromCodes(allA, 'DSOA')).toBe(1)
  })

  it('returns 50 (neutral) when the other code is invalid', () => {
    const answers: PersonalityAnswer[] = ['A', 'A', 'B', 'B', 'A', 'B', 'B', 'A']
    expect(compatibilityFromCodes(answers, '')).toBe(50)
    expect(compatibilityFromCodes(answers, 'XXX')).toBe(50)
    expect(compatibilityFromCodes(answers, 'TOOLONG')).toBe(50)
  })
})
