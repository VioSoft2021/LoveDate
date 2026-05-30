import { describe, it, expect } from 'vitest'

import { DEMO_PROFILES, DEMO_GUEST_STABILITY } from './demoProfiles'
import { stabilityFromProfiles } from '../stability'

// Proves the Guest Tour stability seed (App.tsx + demoProfiles.ts) makes the
// Stability lens demo honestly: every demo profile carries a stability
// profile, the aligned man reads Strong, and the children-mismatch man
// surfaces as a capped, risk-led reading rather than being masked.

const byId = (id: number) => DEMO_PROFILES.find((p) => p.id === id)!

describe('demo stability seed', () => {
  it('every demo profile carries a stability profile', () => {
    expect(DEMO_PROFILES.length).toBeGreaterThan(0)
    expect(DEMO_PROFILES.every((p) => p.stabilityProfile)).toBe(true)
  })

  it('guest vs aligned man (Mateo) reads Strong', () => {
    const v = stabilityFromProfiles(DEMO_GUEST_STABILITY, byId(90002).stabilityProfile)
    expect(v.band).toBe('strong')
  })

  it('guest vs children-mismatch man (Radu) is capped and risk-led', () => {
    const v = stabilityFromProfiles(DEMO_GUEST_STABILITY, byId(90004).stabilityProfile)
    expect(v.score).toBeLessThanOrEqual(52)
    expect(v.drivers[0]).toEqual({ key: 'children', polarity: 'risk' })
  })
})
