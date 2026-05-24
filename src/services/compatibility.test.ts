import { describe, it, expect } from 'vitest'
import {
  bigFiveFromAnswers,
  attachmentFromRatings,
  lovePersonalityFromAnswers,
  compatibilityFromLovePersonality,
  compatibilityFromBigFiveAttachment,
  PERSONALITY_QUESTION_COUNT,
  BIG_FIVE_QUESTION_COUNT,
  type LikertAnswer,
  type AttachmentRatings,
  type LovePersonality,
} from './compatibility'

// Tier A (2026-05-24) — tests for the Big Five + Attachment scoring.
// Old DMFR tests removed; the codebase no longer has compatibilityFromAnswers,
// compatibilityFromCodes, sanitizeAnswers, vectorFromAnswers, etc.

// Helpers
const fillLikert = (value: LikertAnswer, n: number): LikertAnswer[] => Array(n).fill(value)
const neutralBigFive = fillLikert(3, BIG_FIVE_QUESTION_COUNT)

describe('bigFiveFromAnswers (BFI-10 scoring)', () => {
  it('returns 50 on every dimension when all answers are Neutral (3)', () => {
    const result = bigFiveFromAnswers(neutralBigFive)
    expect(result.openness).toBe(50)
    expect(result.conscientiousness).toBe(50)
    expect(result.extraversion).toBe(50)
    expect(result.agreeableness).toBe(50)
    expect(result.neuroticism).toBe(50)
  })

  it('all-5 answers max non-reversed and min reversed dimensions', () => {
    // Q1, Q3, Q4, Q5, Q7 are reverse-keyed.
    // If everyone answers 5, the reversed item contributes reverse(5)=1, the
    // direct item contributes 5, so averaged → 3 → 50. So every dimension
    // ends up at 50 for all-5 OR all-1 (both halves cancel).
    const all5 = fillLikert(5, BIG_FIVE_QUESTION_COUNT)
    const result = bigFiveFromAnswers(all5)
    expect(result.openness).toBe(50)
    expect(result.conscientiousness).toBe(50)
    expect(result.extraversion).toBe(50)
    expect(result.agreeableness).toBe(50)
    expect(result.neuroticism).toBe(50)
  })

  it('extraversion = 100 when reversed Q1=1 (extraverted) AND Q6=5 (extraverted)', () => {
    // Q1 (reverse-keyed) "is reserved" — answering 1 (strongly disagree) means
    // "I'm not reserved" → extraverted. Q6 (direct) "is outgoing" — answering 5
    // means very extraverted. Both push to max.
    const answers: LikertAnswer[] = [1, 3, 3, 3, 3, 5, 3, 3, 3, 3]
    const result = bigFiveFromAnswers(answers)
    expect(result.extraversion).toBe(100)
  })

  it('openness = 100 when Q5 reversed=1 AND Q10 direct=5', () => {
    const answers: LikertAnswer[] = [3, 3, 3, 3, 1, 3, 3, 3, 3, 5]
    const result = bigFiveFromAnswers(answers)
    expect(result.openness).toBe(100)
  })
})

describe('attachmentFromRatings', () => {
  it('picks the highest-rated style', () => {
    const ratings: AttachmentRatings = { secure: 5, anxious: 2, avoidant: 1, disorganized: 3 }
    expect(attachmentFromRatings(ratings)).toBe('secure')
  })

  it('breaks ties in favour of the more functional style (secure > anxious > avoidant > disorganized)', () => {
    // All tied at 4 → secure wins.
    expect(
      attachmentFromRatings({ secure: 4, anxious: 4, avoidant: 4, disorganized: 4 }),
    ).toBe('secure')
    // anxious vs avoidant tie → anxious wins (more functional).
    expect(
      attachmentFromRatings({ secure: 1, anxious: 5, avoidant: 5, disorganized: 2 }),
    ).toBe('anxious')
  })

  it('handles an avoidant-dominant respondent', () => {
    const ratings: AttachmentRatings = { secure: 1, anxious: 2, avoidant: 5, disorganized: 3 }
    expect(attachmentFromRatings(ratings)).toBe('avoidant')
  })
})

describe('lovePersonalityFromAnswers', () => {
  it('returns null when the answer count is wrong', () => {
    expect(lovePersonalityFromAnswers([1, 2, 3] as LikertAnswer[])).toBeNull()
    expect(lovePersonalityFromAnswers([])).toBeNull()
  })

  it('returns a full LovePersonality with valid 14-answer input', () => {
    const answers: LikertAnswer[] = [
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3,  // Big Five → all 50
      5, 1, 1, 1,                     // Secure dominant
    ]
    const result = lovePersonalityFromAnswers(answers)
    expect(result).not.toBeNull()
    expect(result!.attachment).toBe('secure')
    expect(result!.bigFive.openness).toBe(50)
    expect(result!.attachmentRatings).toEqual({ secure: 5, anxious: 1, avoidant: 1, disorganized: 1 })
    // completedAt is an ISO timestamp
    expect(() => new Date(result!.completedAt).toISOString()).not.toThrow()
  })
})

describe('compatibilityFromLovePersonality', () => {
  const buildLovePersonality = (overrides?: Partial<LovePersonality>): LovePersonality => ({
    bigFive: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
    attachment: 'secure',
    attachmentRatings: { secure: 5, anxious: 1, avoidant: 1, disorganized: 1 },
    completedAt: new Date().toISOString(),
    ...overrides,
  })

  it('returns 50 when either side is missing', () => {
    expect(compatibilityFromLovePersonality(null, buildLovePersonality())).toBe(50)
    expect(compatibilityFromLovePersonality(buildLovePersonality(), null)).toBe(50)
    expect(compatibilityFromLovePersonality(null, null)).toBe(50)
  })

  it('secure × secure scores higher than anxious × avoidant', () => {
    const secureA = buildLovePersonality({ attachment: 'secure' })
    const secureB = buildLovePersonality({ attachment: 'secure' })
    const anx = buildLovePersonality({ attachment: 'anxious' })
    const avo = buildLovePersonality({ attachment: 'avoidant' })
    expect(compatibilityFromLovePersonality(secureA, secureB)).toBeGreaterThan(
      compatibilityFromLovePersonality(anx, avo),
    )
  })

  it('clamps to [1, 99]', () => {
    const result = compatibilityFromLovePersonality(buildLovePersonality(), buildLovePersonality())
    expect(result).toBeGreaterThanOrEqual(1)
    expect(result).toBeLessThanOrEqual(99)
  })
})

describe('compatibilityFromBigFiveAttachment', () => {
  const neutralBig = { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 }

  it('returns 50 when any required field is missing', () => {
    expect(compatibilityFromBigFiveAttachment(null, 'secure', neutralBig, 'secure')).toBe(50)
    expect(compatibilityFromBigFiveAttachment(neutralBig, null, neutralBig, 'secure')).toBe(50)
    expect(compatibilityFromBigFiveAttachment(neutralBig, 'secure', null, 'secure')).toBe(50)
    expect(compatibilityFromBigFiveAttachment(neutralBig, 'secure', neutralBig, null)).toBe(50)
  })

  it('agrees with compatibilityFromLovePersonality on equivalent inputs', () => {
    const lp: LovePersonality = {
      bigFive: neutralBig,
      attachment: 'secure',
      attachmentRatings: { secure: 5, anxious: 1, avoidant: 1, disorganized: 1 },
      completedAt: new Date().toISOString(),
    }
    expect(
      compatibilityFromBigFiveAttachment(neutralBig, 'secure', neutralBig, 'secure'),
    ).toBe(compatibilityFromLovePersonality(lp, lp))
  })
})

describe('PERSONALITY_QUESTION_COUNT', () => {
  it('is exactly 14 (10 Big Five + 4 attachment)', () => {
    expect(PERSONALITY_QUESTION_COUNT).toBe(14)
  })
})
