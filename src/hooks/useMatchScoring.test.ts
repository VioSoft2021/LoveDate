import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMatchScoring } from './useMatchScoring'
import type { SelfProfile } from '../domain'
import type { Profile } from '../services/priveApi'
import type { LovePersonality } from '../services/compatibility'

vi.mock('../services/ai/matchScore', () => ({
  backendInvokeMatchScore: vi.fn().mockResolvedValue(null),
}))

// Tier A (2026-05-24) — fixtures now use Big Five + Attachment instead
// of personalityAnswers / personalityCode. Tests for pairCode removed
// (DMFR codes are deprecated; MatchAnalysis no longer has that field).

const sharedBigFive = {
  openness: 70,
  conscientiousness: 65,
  extraversion: 55,
  agreeableness: 70,
  neuroticism: 35,
}

const selfLovePersonality: LovePersonality = {
  bigFive: sharedBigFive,
  attachment: 'secure',
  attachmentRatings: { secure: 5, anxious: 2, avoidant: 1, disorganized: 1 },
  completedAt: '2026-05-24T00:00:00.000Z',
}

const baseSelfProfile: SelfProfile = {
  name: 'Alex',
  age: 30,
  city: 'Bucharest',
  vibe: 'builder mode',
  bio: 'I make things.',
  interests: ['coffee', 'design', 'hiking'],
  pronouns: 'They/Them',
  gender: 'Non-binary',
  orientation: 'Open',
  lookingFor: 'Long-term relationship',
  relationshipIntent: 'Serious with playful energy',
  heightCm: 172,
  jobTitle: 'PM',
  company: 'X',
  education: 'BSc CS',
  hometown: 'Cluj',
  languages: ['en', 'ro'],
  drinking: 'Socially',
  smoking: 'Never',
  workout: '3x per week',
  religion: 'Agnostic',
  politics: 'Moderate',
  zodiac: 'Leo',
  childrenPlan: 'Maybe someday',
  pets: 'Dog person',
  promptOne: '',
  promptTwo: '',
  promptThree: '',
  dealbreakers: [],
  instagram: '',
  anthem: '',
  socialConnections: {
    x: { connected: false, handle: '' },
    instagram: { connected: false, handle: '' },
    facebook: { connected: false, handle: '' },
    linkedin: { connected: false, handle: '' },
    tiktok: { connected: false, handle: '' },
  },
  socialPromotionOptIn: false,
  travelMode: false,
  photos: [],
  lovePersonality: selfLovePersonality,
}

const baseCandidate: Profile = {
  id: 100,
  authUserId: 'auth-100',
  name: 'Riley',
  age: 31,
  city: 'Bucharest',
  vibe: 'curious',
  bio: 'designer, runner, coffee snob',
  interests: ['coffee', 'design', 'travel'],
  palette: ['#141937', '#252d5c'],
  photos: ['https://example.com/a.jpg'],
  gender: 'Woman',
  distanceKm: 3,
  verified: true,
  relationshipGoal: 'Long-term',
  zodiac: 'Aries', // compatible with Leo per ZODIAC_COMPATIBILITY
  bigFive: sharedBigFive,
  attachmentStyle: 'secure',
}

beforeEach(() => {
  window.localStorage.clear()
})

const renderScoring = (selfProfile: SelfProfile = baseSelfProfile) =>
  renderHook(() =>
    useMatchScoring({
      selfProfile,
      isAuthenticated: false,
      appLanguage: 'en',
      aiPreferencePrompt: '',
    }),
  )

describe('useMatchScoring — getMatchAnalysis', () => {
  it('returns a score in [1, 99]', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.score).toBeGreaterThanOrEqual(1)
    expect(analysis.score).toBeLessThanOrEqual(99)
  })

  it('extracts shared interests by substring match (case-insensitive)', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.sharedInterests).toContain('coffee')
    expect(analysis.sharedInterests).toContain('design')
  })

  it('detects intent alignment when both want long-term', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.intentAligned).toBe(true)
  })

  it('detects zodiac alignment using ZODIAC_COMPATIBILITY table', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.zodiacAligned).toBe(true)
    const piscesCandidate = { ...baseCandidate, zodiac: 'Pisces' }
    expect(result.current.getMatchAnalysis(piscesCandidate).zodiacAligned).toBe(false)
  })

  it('reports the correct age gap', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.ageGap).toBe(1)
  })

  it('returns at most 4 reasons', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.reasons.length).toBeGreaterThan(0)
    expect(analysis.reasons.length).toBeLessThanOrEqual(4)
  })

  it('personalityScore falls back to 50 when candidate has no bigFive/attachment data', () => {
    const { result } = renderScoring()
    const candidateNoPersonality: Profile = {
      ...baseCandidate,
      bigFive: undefined,
      attachmentStyle: undefined,
    }
    const analysis = result.current.getMatchAnalysis(candidateNoPersonality)
    expect(analysis.personalityScore).toBe(50)
  })

  it('personalityScore reflects matching Big Five + secure×secure attachment when both sides present', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    // Both sides have identical bigFive + secure attachment → high score.
    expect(analysis.personalityScore).toBeGreaterThan(70)
  })

  it('caution null when personality matches AND intent aligns', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.caution).toBeNull()
  })
})

describe('useMatchScoring — getChemistryInsights', () => {
  it('chemistryScore in [1, 99]', () => {
    const { result } = renderScoring()
    const insights = result.current.getChemistryInsights(baseCandidate)
    expect(insights.chemistryScore).toBeGreaterThanOrEqual(1)
    expect(insights.chemistryScore).toBeLessThanOrEqual(99)
  })

  it('cognitiveOverlapScore equals the personalityScore (Tier A — same Big Five+Attachment number)', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    const insights = result.current.getChemistryInsights(baseCandidate)
    expect(insights.cognitiveOverlapScore).toBe(analysis.personalityScore)
  })

  it('summary mentions zodiac alignment when zodiacs match', () => {
    const { result } = renderScoring()
    const insights = result.current.getChemistryInsights(baseCandidate)
    expect(insights.summary).toMatch(/zodiac/i)
  })

  it('summary mentions personality alignment when zodiac NOT aligned', () => {
    const { result } = renderScoring()
    const insights = result.current.getChemistryInsights({
      ...baseCandidate,
      zodiac: 'Pisces',
    })
    expect(insights.summary).toMatch(/personality/i)
    expect(insights.summary).not.toMatch(/zodiac/i)
  })
})

describe('useMatchScoring — getCompatibilityScore', () => {
  it('returns the same score as getMatchAnalysis(profile).score', () => {
    const { result } = renderScoring()
    expect(result.current.getCompatibilityScore(baseCandidate)).toBe(
      result.current.getMatchAnalysis(baseCandidate).score,
    )
  })
})

describe('useMatchScoring — fetchAiScoreFor', () => {
  it('is a no-op when isAuthenticated is false', async () => {
    const { result } = renderScoring()
    await act(async () => {
      await result.current.fetchAiScoreFor(baseCandidate)
    })
    expect(result.current.aiMatchScores[baseCandidate.id]).toBeUndefined()
  })
})
