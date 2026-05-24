import { useCallback, useState } from 'react'
import type { Profile } from '../services/priveApi'

// Phase D2.5 — useUiModals
//
// Owns the two transient app-level modal slots that don't fit any
// other domain hook:
//   - lightboxPhoto / lightboxZoom: the full-screen photo viewer
//     opened from profile cards. zoom clamped to [1, 3].
//   - activeMatch: the "it's a match!" celebration card opened by
//     finalizeSwipe and dismissed by the X / Escape / "say hi" CTA.
//
// Tiny by design. Lives in its own hook so App.tsx isn't carrying
// 5 useState slots + 4 trivial handlers inline that don't belong to
// any other concern.

export const useUiModals = () => {
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [lightboxZoom, setLightboxZoom] = useState(1)
  const [activeMatch, setActiveMatch] = useState<Profile | null>(null)

  const openLightbox = useCallback((photoUrl: string) => {
    setLightboxPhoto(photoUrl)
    setLightboxZoom(1)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxPhoto(null)
    setLightboxZoom(1)
  }, [])

  const zoomLightbox = useCallback((delta: number) => {
    setLightboxZoom((current) =>
      Math.min(3, Math.max(1, Number((current + delta).toFixed(2)))),
    )
  }, [])

  return {
    lightboxPhoto,
    lightboxZoom,
    setLightboxZoom,
    openLightbox,
    closeLightbox,
    zoomLightbox,
    activeMatch,
    setActiveMatch,
  } as const
}
