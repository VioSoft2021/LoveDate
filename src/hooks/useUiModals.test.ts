import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useUiModals } from './useUiModals'
import type { Profile } from '../services/priveApi'

const sampleProfile: Profile = {
  id: 42,
  authUserId: 'auth-42',
  name: 'Riley',
  age: 28,
  city: 'Bucharest',
  vibe: 'curious',
  bio: '',
  interests: [],
  palette: ['#000', '#fff'],
  photos: ['https://example.com/a.jpg'],
  gender: 'Woman',
  distanceKm: 5,
  verified: true,
  relationshipGoal: 'Long-term',
  zodiac: 'Leo',
}

describe('useUiModals — initial state', () => {
  it('starts with no lightbox and no active match', () => {
    const { result } = renderHook(() => useUiModals())
    expect(result.current.lightboxPhoto).toBeNull()
    expect(result.current.lightboxZoom).toBe(1)
    expect(result.current.activeMatch).toBeNull()
  })
})

describe('useUiModals — lightbox', () => {
  it('openLightbox sets the photo and resets zoom to 1', () => {
    const { result } = renderHook(() => useUiModals())
    act(() => result.current.setLightboxZoom(2.5))
    act(() => result.current.openLightbox('https://example.com/photo.jpg'))
    expect(result.current.lightboxPhoto).toBe('https://example.com/photo.jpg')
    expect(result.current.lightboxZoom).toBe(1)
  })

  it('closeLightbox clears photo and resets zoom', () => {
    const { result } = renderHook(() => useUiModals())
    act(() => result.current.openLightbox('https://example.com/photo.jpg'))
    act(() => result.current.setLightboxZoom(2))
    act(() => result.current.closeLightbox())
    expect(result.current.lightboxPhoto).toBeNull()
    expect(result.current.lightboxZoom).toBe(1)
  })

  it('zoomLightbox clamps to [1, 3] regardless of direction', () => {
    const { result } = renderHook(() => useUiModals())
    // Zoom out from initial 1 — should clamp to 1 (min)
    act(() => result.current.zoomLightbox(-1))
    expect(result.current.lightboxZoom).toBe(1)
    // Zoom in by 4 — should clamp to 3 (max)
    act(() => result.current.zoomLightbox(4))
    expect(result.current.lightboxZoom).toBe(3)
    // Step back by 0.5 — back to 2.5
    act(() => result.current.zoomLightbox(-0.5))
    expect(result.current.lightboxZoom).toBe(2.5)
  })

  it('zoomLightbox rounds to 2 decimal places to avoid float noise', () => {
    const { result } = renderHook(() => useUiModals())
    // 1 + 0.1 + 0.1 + 0.1 would be 1.30000000000004 without rounding
    act(() => result.current.zoomLightbox(0.1))
    act(() => result.current.zoomLightbox(0.1))
    act(() => result.current.zoomLightbox(0.1))
    expect(result.current.lightboxZoom).toBe(1.3)
  })
})

describe('useUiModals — activeMatch', () => {
  it('setActiveMatch round-trips a profile', () => {
    const { result } = renderHook(() => useUiModals())
    act(() => result.current.setActiveMatch(sampleProfile))
    expect(result.current.activeMatch).toEqual(sampleProfile)
  })

  it('setActiveMatch(null) dismisses the celebration', () => {
    const { result } = renderHook(() => useUiModals())
    act(() => result.current.setActiveMatch(sampleProfile))
    act(() => result.current.setActiveMatch(null))
    expect(result.current.activeMatch).toBeNull()
  })

  it('lightbox and activeMatch are independent state slots', () => {
    const { result } = renderHook(() => useUiModals())
    act(() => result.current.openLightbox('https://example.com/photo.jpg'))
    act(() => result.current.setActiveMatch(sampleProfile))
    expect(result.current.lightboxPhoto).toBe('https://example.com/photo.jpg')
    expect(result.current.activeMatch).toEqual(sampleProfile)
    // Closing lightbox doesn't touch activeMatch
    act(() => result.current.closeLightbox())
    expect(result.current.lightboxPhoto).toBeNull()
    expect(result.current.activeMatch).toEqual(sampleProfile)
  })
})
