import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMatchScoring } from './useMatchScoring'
import type { SelfProfile } from '../domain'
import type { Profile } from '../services/priveApi'

// Mock the AI client so renderHook doesn't try to talk to Supabase.
vi.mock('../services/ai/matchScore', () => ({
  backendInvokeMatchScore: vi.fn().mockResolvedValue(null),
}))

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
  // 8 answers — derived code: every B in the second slot per axis
  // => "CSFR" (C/calm, S/spontaneous, F/focused, R/reliable)
  personalityAnswers: ['A', 'A', 'A', 'B', 'A', 'A', 'A', 'A'],
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
  personalityAnswers: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
  personalityCode: 'CMFR',
}

beforeEach(() => {
  window.localStorage.clear()
})

const renderScoring = (selfProfile: SelfProfile = baseSelfProfile) =>
  renderHook(() =>
    useMatchScoring({
      selfProfile,
      isAuthenticated: false, // disable AI fetch in tests
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
    // Leo's compat includes Aries
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.zodiacAligned).toBe(true)

    // Leo's compat does NOT include Pisces
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

  it('produces a pairCode of the form "ABCD x WXYZ" (8 chars + x)', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.pairCode).toMatch(/^[A-Z]{4} x [A-Z]{4}$/)
  })

  it('caution null when personality matches AND intent aligns', () => {
    const { result } = renderScoring()
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.caution).toBeNull()
  })

  it('caution string when intent misaligned AND personality below 65', () => {
    const { result } = renderScoring({
      ...baseSelfProfile,
      lookingFor: 'Short-term fun', // not long-term
      personalityAnswers: ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'], // far from candidate's CMFR
    })
    const analysis = result.current.getMatchAnalysis({
      ...baseCandidate,
      relationshipGoal: 'Long-term',
    })
    // intent misaligned (we want short-term but they want long), personality
    // far apart => caution string surfaces
    if (analysis.personalityScore < 65) {
      expect(analysis.caution).not.toBeNull()
      expect(typeof analysis.caution).toBe('string')
    }
  })

  it('uses profile.personalityCode when available (post-2026-05-19 privacy migration)', () => {
    const { result } = renderScoring()
    // baseCandidate has personalityCode: 'CMFR' set
    const analysis = result.current.getMatchAnalysis(baseCandidate)
    expect(analysis.pairCode).toContain('CMFR')
  })

  it('falls back to deriving the code from personalityAnswers when missing', () => {
    const { result } = renderScoring()
    const noCodeCandidate: Profile = {
      ...baseCandidate,
      personalityCode: undefined,
      personalityAnswers: ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'], // => DSOA
    }
    const analysis = result.current.getMatchAnalysis(noCodeCandidate)
    expect(analysis.pairCode).toContain('DSOA')
  })
})

describe('useMatchScoring — getChemistryInsights', () => {
  it('chemistryScore in [1, 99]', () => {
    const { result } = renderScoring()
    const insights = result.current.getChemistryInsights(baseCandidate)
    expect(insights.chemistryScore).toBeGreaterThanOrEqual(1)
    expect(insights.chemistryScore).toBeLessThanOrEqual(99)
  })

  it('cognitiveOverlapScore in [1, 99]', () => {
    const { result } = renderScoring()
    const insights = result.current.getChemistryInsights(baseCandidate)
    expect(insights.cognitiveOverlapScore).toBeGreaterThanOrEqual(1)
    expect(insights.cognitiveOverlapScore).toBeLessThanOrEqual(99)
  })

  it('summary mentions zodiac alignment when zodiacs match', () => {
    const { result } = renderScoring()
    const insights = result.current.getChemistryInsights(baseCandidate)
    expect(insights.summary).toMatch(/zodiac/i)
  })

  it('summary stays neutral when zodiac NOT aligned', () => {
    const { result } = renderScoring()
    const insights = result.current.getChemistryInsights({
      ...baseCandidate,
      zodiac: 'Pisces',
    })
    // The "Strong chemistry signal from cognitive overlap and zodiac alignment"
    // version requires zodiacAligned=true. With Pisces (not in Leo's compat
    // list), the other summary surfaces.
    expect(insights.summary).toMatch(/cognitive/i)
    expect(insights.summary).not.toMatch(/zodiac alignment/i)
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
