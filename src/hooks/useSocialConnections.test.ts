import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSocialConnections, type UseSocialConnectionsInput } from './useSocialConnections'
import { EMPTY_SELF_PROFILE } from '../constants'
import type { SelfProfile } from '../domain'

const makeProfile = (overrides: Partial<SelfProfile> = {}): SelfProfile => ({
  ...EMPTY_SELF_PROFILE,
  name: 'Alex Smith',
  ...overrides,
})

const makeDeps = (overrides: Partial<UseSocialConnectionsInput> = {}): UseSocialConnectionsInput => ({
  selfProfile: makeProfile(),
  saveSelfProfilePatch: vi.fn(),
  pushToast: vi.fn(),
  ...overrides,
})

const writeText = vi.fn().mockResolvedValue(undefined)
let openSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined)
  openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
})

afterEach(() => {
  openSpy.mockRestore()
})

describe('useSocialConnections — connect / disconnect', () => {
  it('connecting with no existing handle suggests one from the name', () => {
    const saveSelfProfilePatch = vi.fn()
    const deps = makeDeps({ saveSelfProfilePatch })
    const { result } = renderHook(() => useSocialConnections(deps))
    result.current.setSocialConnectionDecision('x', true)

    expect(saveSelfProfilePatch).toHaveBeenCalledTimes(1)
    const [nextProfile, message] = saveSelfProfilePatch.mock.calls[0] as [SelfProfile, string]
    expect(nextProfile.socialConnections.x).toEqual({ connected: true, handle: 'alexsmith' })
    expect(message).toEqual(expect.stringContaining('enabled'))
  })

  it('disconnecting keeps the existing handle and connected=false', () => {
    const saveSelfProfilePatch = vi.fn()
    const selfProfile = makeProfile({
      socialConnections: {
        ...EMPTY_SELF_PROFILE.socialConnections,
        instagram: { connected: true, handle: 'myhandle' },
      },
    })
    const deps = makeDeps({ selfProfile, saveSelfProfilePatch })
    const { result } = renderHook(() => useSocialConnections(deps))
    result.current.setSocialConnectionDecision('instagram', false)

    const [nextProfile, message] = saveSelfProfilePatch.mock.calls[0] as [SelfProfile, string]
    expect(nextProfile.socialConnections.instagram).toEqual({ connected: false, handle: 'myhandle' })
    expect(message).toEqual(expect.stringContaining('disabled'))
  })
})

describe('useSocialConnections — promotion opt-in', () => {
  it('toggleSocialPromotionOptIn(true) persists the opt-in', () => {
    const saveSelfProfilePatch = vi.fn()
    const deps = makeDeps({ saveSelfProfilePatch })
    const { result } = renderHook(() => useSocialConnections(deps))
    result.current.toggleSocialPromotionOptIn(true)
    const [nextProfile, message] = saveSelfProfilePatch.mock.calls[0] as [SelfProfile, string]
    expect(nextProfile.socialPromotionOptIn).toBe(true)
    expect(message).toEqual(expect.stringContaining('enabled'))
  })

  it('toggleSocialPromotionOptIn(false) persists the pause', () => {
    const saveSelfProfilePatch = vi.fn()
    const deps = makeDeps({ saveSelfProfilePatch })
    const { result } = renderHook(() => useSocialConnections(deps))
    result.current.toggleSocialPromotionOptIn(false)
    const [nextProfile] = saveSelfProfilePatch.mock.calls[0] as [SelfProfile, string]
    expect(nextProfile.socialPromotionOptIn).toBe(false)
  })
})

describe('useSocialConnections — sharePriveOnPlatform', () => {
  it('is gated behind the promotion opt-in', async () => {
    const deps = makeDeps({ selfProfile: makeProfile({ socialPromotionOptIn: false }) })
    const { result } = renderHook(() => useSocialConnections(deps))
    await result.current.sharePriveOnPlatform('x')
    expect(deps.pushToast).toHaveBeenCalledWith('Enable social sharing prompts first.', 'info')
    expect(openSpy).not.toHaveBeenCalled()
    expect(writeText).not.toHaveBeenCalled()
  })

  it('opens a share window for networks with an intent URL (x)', async () => {
    const deps = makeDeps({ selfProfile: makeProfile({ socialPromotionOptIn: true }) })
    const { result } = renderHook(() => useSocialConnections(deps))
    await result.current.sharePriveOnPlatform('x')
    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(String(openSpy.mock.calls[0][0])).toContain('twitter.com/intent/tweet')
    expect(deps.pushToast).toHaveBeenCalledWith('Share window opened.', 'success')
  })

  it('falls back to clipboard for networks without an intent URL (instagram)', async () => {
    const deps = makeDeps({ selfProfile: makeProfile({ socialPromotionOptIn: true }) })
    const { result } = renderHook(() => useSocialConnections(deps))
    await result.current.sharePriveOnPlatform('instagram')
    expect(openSpy).not.toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(deps.pushToast).toHaveBeenCalledWith(expect.stringContaining('Caption copied'), 'success')
  })

  it('surfaces a copy-failed toast when the clipboard write rejects', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    const deps = makeDeps({ selfProfile: makeProfile({ socialPromotionOptIn: true }) })
    const { result } = renderHook(() => useSocialConnections(deps))
    await result.current.sharePriveOnPlatform('tiktok')
    expect(deps.pushToast).toHaveBeenCalledWith('Copy failed. Please copy and share manually.', 'error')
  })
})
