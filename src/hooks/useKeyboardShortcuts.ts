import { useEffect } from 'react'
import type { AppScreen, SwipeDirection, SwipeIntent } from '../domain'
import type { Profile } from '../services/priveApi'

// Phase D2.6 — useKeyboardShortcuts
//
// App-wide keyboard handler. Ignored while the user is typing in an
// input/select/textarea. Two layers of behavior:
//
//   1. Escape closes whichever overlay is open, with a priority order:
//      activeMatch (the "it's a match!" celebration) wins over
//      reportDraftProfile (the report dialog), which wins over
//      lightboxPhoto (the full-screen photo viewer).
//
//   2. Discover-only shortcuts (only fire when `screen === 'discover'`):
//      ArrowLeft  -> pass (swipe left)
//      ArrowRight -> like (swipe right)
//      ArrowUp    -> super-like (swipe right with 'super-like' intent)
//      'u' / 'U'  -> undo last swipe

type UseKeyboardShortcutsInput = {
  screen: AppScreen
  activeMatch: Profile | null
  setActiveMatch: (value: Profile | null) => void
  reportDraftProfile: Profile | null
  closeReportProfileDialog: () => void
  lightboxPhoto: string | null
  closeLightbox: () => void
  swipeCard: (direction: SwipeDirection, intent?: SwipeIntent) => void
  undoSwipe: () => void
}

export const useKeyboardShortcuts = ({
  screen,
  activeMatch,
  setActiveMatch,
  reportDraftProfile,
  closeReportProfileDialog,
  lightboxPhoto,
  closeLightbox,
  swipeCard,
  undoSwipe,
}: UseKeyboardShortcutsInput) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTypingTarget =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'SELECT' ||
        target?.tagName === 'TEXTAREA'
      if (isTypingTarget) return

      // Escape: close the topmost overlay (priority: match > report >
      // lightbox).
      if (event.key === 'Escape' && activeMatch) {
        setActiveMatch(null)
        return
      }
      if (event.key === 'Escape' && reportDraftProfile) {
        closeReportProfileDialog()
        return
      }
      if (event.key === 'Escape' && lightboxPhoto) {
        closeLightbox()
        return
      }

      // Discover deck shortcuts only fire when the deck is on screen.
      if (screen !== 'discover') return

      if (event.key === 'ArrowLeft') swipeCard('left')
      if (event.key === 'ArrowRight') swipeCard('right')
      if (event.key === 'ArrowUp') swipeCard('right', 'super-like')
      if (event.key.toLowerCase() === 'u') undoSwipe()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    screen,
    activeMatch,
    setActiveMatch,
    reportDraftProfile,
    closeReportProfileDialog,
    lightboxPhoto,
    closeLightbox,
    swipeCard,
    undoSwipe,
  ])
}
