import { describe, it, expect } from 'vitest'
import { getDiscoverCardBackground } from './discoverCard'
import { PRIVE_NAVY_2, PRIVE_NAVY_3 } from '../constants'
import type { Profile } from '../services/priveApi'

const anyProfile = {} as Profile

describe('getDiscoverCardBackground', () => {
  it('layers the navy base gradient using the brand palette', () => {
    const bg = getDiscoverCardBackground(anyProfile, 'front')
    expect(bg).toContain(PRIVE_NAVY_2)
    expect(bg).toContain(PRIVE_NAVY_3)
    expect(bg).toContain('radial-gradient')
  })

  it('defaults to the front face when no tone is given', () => {
    expect(getDiscoverCardBackground(anyProfile)).toBe(getDiscoverCardBackground(anyProfile, 'front'))
  })

  it('renders a different veil/bloom for the back face', () => {
    expect(getDiscoverCardBackground(anyProfile, 'back')).not.toBe(
      getDiscoverCardBackground(anyProfile, 'front'),
    )
  })

  it('ignores the profile argument (palette depends only on tone)', () => {
    const a = { id: 1 } as unknown as Profile
    const b = { id: 999 } as unknown as Profile
    expect(getDiscoverCardBackground(a, 'front')).toBe(getDiscoverCardBackground(b, 'front'))
  })
})
