import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useStableMatch } from './useStableMatch'
import type { SelfProfile } from '../domain'
import type { Profile } from '../services/priveApi'
import type { StabilityProfile } from '../services/stability'

// Proves the stability-aware blend (M4): when both sides have a stability
// profile, the Gale-Shapley preference becomes 60% personality + 40%
// stability — enough to flip which candidate is the stable match.

const baseProfile = (id: number, name: string): Profile => ({
  id,
  authUserId: `auth-${id}`,
  name,
  age: 30,
  city: 'București',
  vibe: 'x',
  bio: 'x',
  interests: ['a'],
  palette: ['#111', '#222'],
  photos: ['p'],
  gender: 'Man',
  distanceKm: 5,
  verified: true,
  relationshipGoal: 'Long-term',
  zodiac: 'Libra',
  bigFive: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
  attachmentStyle: 'secure',
})

const strongStability: StabilityProfile = {
  conflictRepair: 90,
  commitment: 90,
  communication: 90,
  values: { children: 'yes', finances: 'saver', pace: 'balanced' },
  completedAt: '2026-05-30T00:00:00.000Z',
}
const weakStability: StabilityProfile = {
  conflictRepair: 20,
  commitment: 20,
  communication: 20,
  values: { children: 'no', finances: 'spender', pace: 'slow' },
  completedAt: '2026-05-30T00:00:00.000Z',
}

const self: SelfProfile = {
  name: 'Self',
  age: 30,
  city: 'București',
  vibe: '', bio: '', interests: [], pronouns: '', gender: 'Woman',
  orientation: '', lookingFor: '', relationshipIntent: '', heightCm: 0,
  jobTitle: '', company: '', education: '', hometown: '', languages: [],
  drinking: '', smoking: '', workout: '', religion: '', politics: '', zodiac: '',
  childrenPlan: '', pets: '', promptOne: '', promptTwo: '', promptThree: '',
  dealbreakers: [], instagram: '', anthem: '',
  socialConnections: {
    x: { connected: false, handle: '' },
    instagram: { connected: false, handle: '' },
    facebook: { connected: false, handle: '' },
    linkedin: { connected: false, handle: '' },
    tiktok: { connected: false, handle: '' },
  },
  socialPromotionOptIn: false, travelMode: false, photos: [],
  lovePersonality: {
    bigFive: { openness: 80, conscientiousness: 70, extraversion: 50, agreeableness: 75, neuroticism: 30 },
    attachment: 'secure',
    attachmentRatings: { secure: 5, anxious: 2, avoidant: 2, disorganized: 1 },
    completedAt: '2026-05-30T00:00:00.000Z',
  },
}

// Andrei: near-identical personality to self (top personality match) but a
// weak, mismatched stability profile.
const andrei = {
  ...baseProfile(201, 'Andrei'),
  bigFive: { openness: 80, conscientiousness: 70, extraversion: 50, agreeableness: 75, neuroticism: 30 },
  attachmentStyle: 'secure' as const,
}
// Bogdan: less personality overlap but a strong, aligned stability profile.
const bogdan = {
  ...baseProfile(202, 'Bogdan'),
  bigFive: { openness: 40, conscientiousness: 50, extraversion: 70, agreeableness: 50, neuroticism: 50 },
  attachmentStyle: 'secure' as const,
}

describe('useStableMatch — stability-aware blend', () => {
  it('personality-only (no stability profiles) picks the personality twin', () => {
    const { result } = renderHook(() => useStableMatch(self, [andrei, bogdan]))
    expect(result.current.match?.id).toBe(andrei.id)
  })

  it('with stability profiles, the blend flips the stable match to the durable pair', () => {
    const selfWithStability: SelfProfile = { ...self, stabilityProfile: strongStability }
    const pool: Profile[] = [
      { ...andrei, stabilityProfile: weakStability },
      { ...bogdan, stabilityProfile: strongStability },
    ]
    const { result } = renderHook(() => useStableMatch(selfWithStability, pool))
    expect(result.current.match?.id).toBe(bogdan.id)
  })
})
