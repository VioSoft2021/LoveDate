import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useStableMatch } from './useStableMatch'
import {
  DEMO_GUEST_GENDER,
  DEMO_GUEST_LOVE_PERSONALITY,
  DEMO_PROFILES,
} from '../services/demo/demoProfiles'
import type { SelfProfile } from '../domain'

// Proves the Guest Tour seed (App.tsx + demoProfiles.ts, 2026-05-30) makes
// the Gale-Shapley stable-match lens render a real verdict instead of the
// permanent "Pending" a brand-new guest would otherwise see on the Discover
// card. The guest self profile starts empty (no gender, no lovePersonality);
// the seed fills exactly the two fields the G-S hook needs.

const emptyGuestProfile: SelfProfile = {
  name: '',
  age: 0,
  city: '',
  vibe: '',
  bio: '',
  interests: [],
  pronouns: '',
  gender: '',
  orientation: '',
  lookingFor: '',
  relationshipIntent: '',
  heightCm: 0,
  jobTitle: '',
  company: '',
  education: '',
  hometown: '',
  languages: [],
  drinking: '',
  smoking: '',
  workout: '',
  religion: '',
  politics: '',
  zodiac: '',
  childrenPlan: '',
  pets: '',
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
}

describe('useStableMatch — Guest Tour seed', () => {
  it('an UNSEEDED guest gets no verdict (the bug the seed fixes)', () => {
    const { result } = renderHook(() =>
      useStableMatch(emptyGuestProfile, DEMO_PROFILES),
    )
    // Empty gender => unsupported-gender; even with a gender, no
    // lovePersonality => no-personality. Either way: no real verdict.
    expect(result.current.match).toBeNull()
    expect(result.current.reason).not.toBeNull()
  })

  it('the SEEDED guest gets a real stable match against the demo pool', () => {
    const seededGuest: SelfProfile = {
      ...emptyGuestProfile,
      gender: DEMO_GUEST_GENDER,
      lovePersonality: DEMO_GUEST_LOVE_PERSONALITY,
    }
    const { result } = renderHook(() =>
      useStableMatch(seededGuest, DEMO_PROFILES),
    )

    // A concrete partner, no "pending" reason — the Discover line renders
    // the ★ badge / named partner instead of stableMatchPending.
    expect(result.current.reason).toBeNull()
    expect(result.current.match).not.toBeNull()
    expect(result.current.totalPairs).toBeGreaterThan(0)

    // Seeded self is a Woman, so the stable partner must be a Man from the
    // pool, and isStableMatch must agree for that partner's id.
    const partner = result.current.match!
    expect(partner.gender).toBe('Man')
    expect(result.current.isStableMatch(partner.id)).toBe(true)
  })
})
