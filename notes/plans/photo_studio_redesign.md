# Photo upload + editing redesign — dedicated full-screen photo manager

**Decided 2026-05-27 (end of a long session). Tomorrow's first task.**

## Why
Today's photo studio lives **inline inside the scrolling profile editor**
(`ProfileScreen.tsx`, Photos `<details>` block, lines ~1004–1490). The
photo grid + URL/upload controls + Photo Coach panel + the full crop
editor (preview + ~8 sliders + action buttons) are all one long scroll.
On mobile you constantly scroll between the preview (top) and the
"Add edited photo" button (far below). The crop is already touch-friendly
(pointer events); the problem is purely the cramming.

## The shape — a dedicated `photo-studio` screen with TWO focused states

Route a new `'photo-studio'` AppScreen exactly like the existing
`'love-personality-quiz'` / `'personality-guide'` sibling screens
(conditional render in App.tsx; `navigate('photo-studio')`; back →
`navigate('profile')`). Open it from a **"Manage photos"** button on the
Profile. Inside, two clean states instead of one crammed scroll:

1. **Photo manager (grid)** — current photos as large tiles: reorder
   (arrows or drag), tap to set primary, remove, plus one big
   **"Add photo"** button. Optionally the Photo Coach panel lives here.
   Nothing competing for space.
2. **Single-photo editor** (opens when adding/tapping a photo) — the crop
   **preview fills the viewport**; adjustments tucked into a compact strip
   (crop shape up front; brightness/contrast/saturation/zoom/rotate behind
   an "Adjust" toggle so they're not all dumped on screen); a **sticky
   bottom bar** with **Use / Cancel** always in thumb reach — no scrolling
   to find the button.

Win: each task gets the whole viewport, the action button is always
reachable, and the profile editor gets shorter (photos move out of it).

## It's mostly relocation, not a rewrite
`usePhotoStudio` (src/hooks/usePhotoStudio.ts, ~492 lines) already holds
ALL the logic + handlers — addPhotoFromUrl, removeDraftPhoto,
setPrimaryDraftPhoto, handlePhotoUpload, applyPhotoStudio,
resetPhotoStudioControls, closePhotoStudio, the pointer crop handlers,
studioFrameRef, controls/source/analysis/busy state. The crop uses
percentage-based pointer events with setPointerCapture — already
touch-friendly. We reuse the hook as-is and just present it in the new
screen with a mobile-first layout.

## Build steps (tomorrow)
1. `src/domain/ui.ts` — add `'photo-studio'` to the `AppScreen` union.
2. New `src/screens/PhotoStudioScreen.tsx` + `.css` — the two-state UI
   (manager grid + single-photo editor with sticky action bar).
3. Move the photo grid + upload + studio JSX out of `ProfileScreen.tsx`
   (lines ~1004–1490) into the new screen; leave a **"Manage photos"**
   button + a read-only thumbnail strip in the profile editor.
4. App.tsx — render `<PhotoStudioScreen>` when `screen === 'photo-studio'`,
   passing the same `usePhotoStudio` outputs ProfileScreen gets today +
   `onBack`. Wire the navigate handlers.
5. Mobile-first CSS: preview fills viewport, sticky bottom Use/Cancel bar,
   "Adjust" disclosure for the sliders, large tap targets.
6. EN + RO copy for the new screen (uiText.ts).
7. Test (tsc + vitest), build, `adb install -r`, eyeball on the phone.

## Key files (from 2026-05-27 recon)
- `src/screens/ProfileScreen.tsx` — photos section lines ~1004–1490 (grid
  + inline studio to extract)
- `src/hooks/usePhotoStudio.ts` — all logic + handlers (reuse)
- `src/services/backendApi.ts` — `backendUploadProfilePhoto` (line ~506,
  bucket `profile-photos`), `backendSaveSelfProfile` (~378)
- `src/domain/ui.ts` — AppScreen union
- `src/domain/photoStudio.ts` — PhotoStudioControls / PhotoStudioAnalysis
- `src/App.tsx` — ProfileScreen render ~3050; navigate() ~574
- `src/utils/image.ts` — readFileAsDataUrl, analyzePhoto, renderEditedPhoto

## Behaviour to preserve
- Upload happens on "Use this photo" (→ Supabase `profile-photos`); photos
  only persist to the cloud profile on **Save Profile**. Keep that, or
  consider auto-saving photos on add (decide tomorrow).
- Max 9 photos. Primary = index 0. Free crop + portrait/classic/square.
- Photo Coach (aesthetic scoring) is separate from verification — it does
  NOT award the Verified badge (that's selfie verification now).

## Estimate: ~2–3 hours.
