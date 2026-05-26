import { useCallback, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { getProfiles, type Profile } from '../services/priveApi'
import { normalizeProfilePhotos } from '../utils'
import { initialFilters } from '../constants'
import type { Filters, SwipeDirection, SwipeIntent } from '../domain'

// Phase D1.2 — useDeck
//
// Owns the deck-rendering state and the pure drag-gesture math that
// were inline in App.tsx (~13 useState slots, 1 ref, 3 small pure
// helpers). The swipe RESOLUTION (swipeCard, finalizeSwipe, undoSwipe)
// stays in App.tsx for now because it has too many cross-cutting deps
// (history, chat threads, match queue, engagement limits, notifications,
// active match modal). Those will move when their respective concerns
// get extracted.
//
// Consumer pattern:
//   const deck = useDeck()
//   const { allProfiles, index, filters, dragX, isDragging, ... } = deck
//   // swipeCard reads deck.dragX, calls deck.resetDrag(), etc.

export const useDeck = () => {
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [index, setIndex] = useState(0)
  const [filters, setFilters] = useState<Filters>(initialFilters)

  const [dragX, setDragX] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isResolvingSwipe, setIsResolvingSwipe] = useState(false)
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null)
  const [lastIntent, setLastIntent] = useState<SwipeIntent | null>(null)

  // Tracked across renders so handlePointerDown can stash the pointer
  // origin and handlePointerMove/Up can read it without forcing a
  // re-render on every pixel.
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  const loadProfiles = useCallback(async (options?: { isGuest?: boolean }) => {
    try {
      setLoadingProfiles(true)
      const incoming = await getProfiles(options)
      setAllProfiles(incoming.map(normalizeProfilePhotos))
      setLoadError(null)
    } catch {
      setLoadError('Could not load profiles. Please retry.')
    } finally {
      setLoadingProfiles(false)
    }
  }, [])

  const resetDrag = useCallback(() => {
    setIsDragging(false)
    setDragX(0)
    setDragY(0)
    dragStart.current = null
  }, [])

  // Pure derivation of the front card's CSS transform from current
  // drag/exit state. Exiting cards translate off-screen + rotate;
  // mid-drag cards follow the pointer with a slight Y dampening and
  // tilt proportional to X displacement.
  const getCardStyle = useCallback((): CSSProperties => {
    if (exitDirection === 'right') {
      return {
        transform: `translate3d(520px, ${dragY}px, 0) rotate(24deg)`,
        opacity: 0,
      }
    }
    if (exitDirection === 'left') {
      return {
        transform: `translate3d(-520px, ${dragY}px, 0) rotate(-24deg)`,
        opacity: 0,
      }
    }
    return {
      transform: `translate3d(${dragX}px, ${dragY * 0.35}px, 0) rotate(${dragX / 16}deg)`,
      opacity: 1,
    }
  }, [exitDirection, dragX, dragY])

  // LIKE / NOPE badge opacities — clamp dragX into [0, 130] then
  // normalize to [0, 1]. Pure derivation, recomputed each render.
  const rightBadgeOpacity = Math.max(0, Math.min(1, dragX / 130))
  const leftBadgeOpacity = Math.max(0, Math.min(1, -dragX / 130))

  return {
    // ── State ───────────────────────────
    allProfiles,
    loadingProfiles,
    loadError,
    index,
    filters,
    dragX,
    dragY,
    isDragging,
    isResolvingSwipe,
    exitDirection,
    lastIntent,
    dragStart,
    // ── Derived ─────────────────────────
    rightBadgeOpacity,
    leftBadgeOpacity,
    // ── Setters ─────────────────────────
    setAllProfiles,
    setLoadingProfiles,
    setLoadError,
    setIndex,
    setFilters,
    setDragX,
    setDragY,
    setIsDragging,
    setIsResolvingSwipe,
    setExitDirection,
    setLastIntent,
    // ── Actions ─────────────────────────
    loadProfiles,
    resetDrag,
    getCardStyle,
  } as const
}
