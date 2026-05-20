import { useCallback, useRef, useState } from 'react'
import type {
  CropHandle,
  PhotoStudioAnalysis,
  PhotoStudioControls,
} from '../domain'
import type { toProfileDraft } from '../persistence'
import {
  analyzePhoto,
  readFileAsDataUrl,
  renderEditedPhoto,
} from '../utils'
import { backendUploadProfilePhoto } from '../services/backendApi'

// Phase D2.1 — usePhotoStudio
//
// Photo editor lives entirely in this hook now. Previously the 4 refs,
// 3 useState slots, and ~390 lines of pointer/crop math + action
// handlers all lived inline in App.tsx. Pulling them here:
//   - lets App.tsx stop knowing about pointer events and crop geometry
//   - keeps the studio's tightly-coupled state (refs + crop handle +
//     drag flags) together where the handlers can see them without
//     prop drilling
//   - lets ProfileScreen continue to receive the same set of props
//     it already does — the hook returns the same shape App.tsx used
//     to flatten manually, so the public render path is unchanged.
//
// Consumed state from useProfileEditor (the source/controls/busy
// flags) flows in via the input object; the studio doesn't own that
// because the profile editor still needs to read it for the rest of
// the editor UI.

type ProfileDraft = ReturnType<typeof toProfileDraft>

const DEFAULT_PHOTO_STUDIO_CONTROLS: PhotoStudioControls = {
  cropAspect: 'free',
  zoom: 1,
  rotate: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  offsetX: 0,
  offsetY: 0,
  freeCropX: 10,
  freeCropY: 10,
  freeCropWidth: 80,
  freeCropHeight: 80,
}

const clampPercent = (value: number): number => Math.max(0, Math.min(100, value))
const clampRange = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

type UsePhotoStudioInput = {
  // From useProfileEditor (source/controls live there because the profile
  // editor UI also reads them).
  photoUrlInput: string
  setPhotoUrlInput: (value: string) => void
  profileDraft: ProfileDraft
  setProfileDraft: React.Dispatch<React.SetStateAction<ProfileDraft>>
  setProfileSaveStatus: (status: 'idle' | 'saved' | 'error') => void
  photoStudioSource: string | null
  setPhotoStudioSource: (value: string | null) => void
  photoStudioAnalysis: PhotoStudioAnalysis | null
  setPhotoStudioAnalysis: (value: PhotoStudioAnalysis | null) => void
  photoStudioControls: PhotoStudioControls
  setPhotoStudioControls: React.Dispatch<React.SetStateAction<PhotoStudioControls>>
  setPhotoStudioBusy: (value: boolean) => void
  isDraggingCrop: boolean
  setIsDraggingCrop: (value: boolean) => void
  // External plumbing.
  pushToast: (
    message: string,
    tone?: 'info' | 'success' | 'error',
  ) => void
  appLanguage: 'en' | 'ro'
}

export const usePhotoStudio = ({
  photoUrlInput,
  setPhotoUrlInput,
  profileDraft,
  setProfileDraft,
  setProfileSaveStatus,
  photoStudioSource,
  setPhotoStudioSource,
  setPhotoStudioAnalysis,
  photoStudioControls,
  setPhotoStudioControls,
  setPhotoStudioBusy,
  isDraggingCrop,
  setIsDraggingCrop,
  pushToast,
  appLanguage,
}: UsePhotoStudioInput) => {
  // Crop-interaction state local to the studio. Lives here (not in
  // useProfileEditor) because nothing outside the studio reads it.
  const studioFrameRef = useRef<HTMLDivElement | null>(null)
  const cropDragStartRef = useRef<{ x: number; y: number } | null>(null)
  const cropResizeStartRef = useRef<{
    pointer: { x: number; y: number }
    rect: { x: number; y: number; width: number; height: number }
  } | null>(null)
  const cropMoveStartRef = useRef<{
    pointer: { x: number; y: number }
    rect: { x: number; y: number; width: number; height: number }
  } | null>(null)

  const [activeCropHandle, setActiveCropHandle] = useState<CropHandle | null>(null)
  const [isMovingCrop, setIsMovingCrop] = useState(false)
  const [isRedrawCropMode, setIsRedrawCropMode] = useState(false)

  // ── photo-list actions ────────────────────────────────────────────
  const addPhotoFromUrl = useCallback(() => {
    const nextUrl = photoUrlInput.trim()
    if (!nextUrl) return
    setProfileDraft((current) => {
      if (current.photos.includes(nextUrl)) return current
      return { ...current, photos: [nextUrl, ...current.photos].slice(0, 9) }
    })
    setPhotoUrlInput('')
    setProfileSaveStatus('idle')
  }, [photoUrlInput, setPhotoUrlInput, setProfileDraft, setProfileSaveStatus])

  const removeDraftPhoto = useCallback(
    (photoUrl: string) => {
      setProfileDraft((current) => ({
        ...current,
        photos: current.photos.filter((photo) => photo !== photoUrl),
      }))
      setProfileSaveStatus('idle')
    },
    [setProfileDraft, setProfileSaveStatus],
  )

  const setPrimaryDraftPhoto = useCallback(
    (photoIndex: number) => {
      setProfileDraft((current) => {
        if (photoIndex <= 0 || photoIndex >= current.photos.length) {
          return current
        }
        const selectedPhoto = current.photos[photoIndex]
        const remainingPhotos = current.photos.filter((_, index) => index !== photoIndex)
        return { ...current, photos: [selectedPhoto, ...remainingPhotos] }
      })
      setProfileSaveStatus('idle')
    },
    [setProfileDraft, setProfileSaveStatus],
  )

  // ── studio open/close/apply ───────────────────────────────────────
  const resetPhotoStudioControls = useCallback(() => {
    setPhotoStudioControls(DEFAULT_PHOTO_STUDIO_CONTROLS)
  }, [setPhotoStudioControls])

  const closePhotoStudio = useCallback(() => {
    setPhotoStudioSource(null)
    setPhotoStudioAnalysis(null)
    setPhotoStudioBusy(false)
    resetPhotoStudioControls()
  }, [
    setPhotoStudioSource,
    setPhotoStudioAnalysis,
    setPhotoStudioBusy,
    resetPhotoStudioControls,
  ])

  const handlePhotoUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file || !file.type.startsWith('image/')) return

      setPhotoStudioBusy(true)
      void readFileAsDataUrl(file)
        .then(async (source) => {
          const analysis = await analyzePhoto(source, file.size)
          setPhotoStudioSource(source)
          setPhotoStudioAnalysis(analysis)
          resetPhotoStudioControls()
        })
        .catch(() => {
          pushToast('Unable to open photo editor for this file.', 'error')
        })
        .finally(() => {
          event.target.value = ''
          setPhotoStudioBusy(false)
        })
    },
    [
      setPhotoStudioBusy,
      setPhotoStudioSource,
      setPhotoStudioAnalysis,
      resetPhotoStudioControls,
      pushToast,
    ],
  )

  const applyPhotoStudio = useCallback(() => {
    if (!photoStudioSource) return
    setPhotoStudioBusy(true)
    void renderEditedPhoto(photoStudioSource, photoStudioControls)
      .then(async (editedPhoto) => {
        // Upload to Supabase Storage; fall back to the data URL on
        // any failure so the draft is never blocked. Surface that
        // fallback to the user so they know it's local-only.
        const uploaded = await backendUploadProfilePhoto(editedPhoto)
        const finalPhoto = uploaded ?? editedPhoto
        if (!uploaded) {
          pushToast(
            appLanguage === 'ro'
              ? 'Poză salvată local — nu s-a putut încărca pe server, vom reîncerca la următoarea salvare.'
              : "Photo saved locally — couldn't upload, will retry on next save.",
            'info',
          )
        }

        setProfileDraft((current) => {
          if (current.photos.includes(finalPhoto)) return current
          return {
            ...current,
            photos: [finalPhoto, ...current.photos].slice(0, 9),
          }
        })
        setProfileSaveStatus('idle')
        closePhotoStudio()
        pushToast(
          uploaded
            ? 'Photo uploaded and added to draft.'
            : 'Photo added (offline mode — will sync on next save).',
          'success',
        )
      })
      .catch(() => {
        pushToast('Photo processing failed. Please try another image.', 'error')
      })
      .finally(() => {
        setPhotoStudioBusy(false)
      })
  }, [
    photoStudioSource,
    photoStudioControls,
    setPhotoStudioBusy,
    setProfileDraft,
    setProfileSaveStatus,
    closePhotoStudio,
    pushToast,
    appLanguage,
  ])

  // ── pointer/crop math ─────────────────────────────────────────────
  const getStudioPointerPercent = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): { x: number; y: number } | null => {
      const frame = studioFrameRef.current
      if (!frame) return null
      const rect = frame.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      return {
        x: clampPercent(((event.clientX - rect.left) / rect.width) * 100),
        y: clampPercent(((event.clientY - rect.top) / rect.height) * 100),
      }
    },
    [],
  )

  const handleStudioPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (photoStudioControls.cropAspect !== 'free') return
      event.preventDefault()

      const point = getStudioPointerPercent(event)
      if (!point) return

      const handleAttr = (event.target as HTMLElement)
        .closest('[data-crop-handle]')
        ?.getAttribute('data-crop-handle') as CropHandle | undefined
      const isCropBox = Boolean(
        (event.target as HTMLElement).closest('[data-crop-box="true"]'),
      )

      const currentRect = {
        x: photoStudioControls.freeCropX,
        y: photoStudioControls.freeCropY,
        width: photoStudioControls.freeCropWidth,
        height: photoStudioControls.freeCropHeight,
      }
      const insideCurrentCrop =
        point.x >= currentRect.x &&
        point.x <= currentRect.x + currentRect.width &&
        point.y >= currentRect.y &&
        point.y <= currentRect.y + currentRect.height

      if (handleAttr) {
        cropResizeStartRef.current = { pointer: point, rect: currentRect }
        setActiveCropHandle(handleAttr)
        setIsDraggingCrop(true)
        ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
        return
      }

      if (isCropBox) {
        cropMoveStartRef.current = { pointer: point, rect: currentRect }
        cropDragStartRef.current = null
        cropResizeStartRef.current = null
        setActiveCropHandle(null)
        setIsMovingCrop(true)
        setIsDraggingCrop(true)
        ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
        return
      }

      if (insideCurrentCrop) {
        cropMoveStartRef.current = { pointer: point, rect: currentRect }
        cropDragStartRef.current = null
        cropResizeStartRef.current = null
        setActiveCropHandle(null)
        setIsMovingCrop(true)
        setIsDraggingCrop(true)
        ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
        return
      }

      if (!isRedrawCropMode) return

      cropDragStartRef.current = point
      cropResizeStartRef.current = null
      cropMoveStartRef.current = null
      setActiveCropHandle(null)
      setIsMovingCrop(false)
      setPhotoStudioControls((current) => ({
        ...current,
        freeCropX: point.x,
        freeCropY: point.y,
        freeCropWidth: 5,
        freeCropHeight: 5,
      }))
      setIsDraggingCrop(true)
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
    },
    [
      photoStudioControls,
      getStudioPointerPercent,
      isRedrawCropMode,
      setPhotoStudioControls,
      setIsDraggingCrop,
    ],
  )

  const handleStudioPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingCrop || photoStudioControls.cropAspect !== 'free') return
      event.preventDefault()

      const start = cropDragStartRef.current
      const point = getStudioPointerPercent(event)
      if (!point) return

      if (isMovingCrop && cropMoveStartRef.current) {
        const initial = cropMoveStartRef.current
        const deltaX = point.x - initial.pointer.x
        const deltaY = point.y - initial.pointer.y
        const nextX = clampRange(initial.rect.x + deltaX, 0, 100 - initial.rect.width)
        const nextY = clampRange(initial.rect.y + deltaY, 0, 100 - initial.rect.height)
        setPhotoStudioControls((current) => ({
          ...current,
          freeCropX: nextX,
          freeCropY: nextY,
        }))
        return
      }

      if (activeCropHandle && cropResizeStartRef.current) {
        const initial = cropResizeStartRef.current
        const deltaX = point.x - initial.pointer.x
        const deltaY = point.y - initial.pointer.y
        const minSize = 5

        if (activeCropHandle === 'nw') {
          const nextDx = clampRange(deltaX, -initial.rect.x, initial.rect.width - minSize)
          const nextDy = clampRange(deltaY, -initial.rect.y, initial.rect.height - minSize)
          setPhotoStudioControls((current) => ({
            ...current,
            freeCropX: initial.rect.x + nextDx,
            freeCropY: initial.rect.y + nextDy,
            freeCropWidth: initial.rect.width - nextDx,
            freeCropHeight: initial.rect.height - nextDy,
          }))
          return
        }

        if (activeCropHandle === 'ne') {
          const nextDx = clampRange(
            deltaX,
            -(initial.rect.width - minSize),
            100 - (initial.rect.x + initial.rect.width),
          )
          const nextDy = clampRange(deltaY, -initial.rect.y, initial.rect.height - minSize)
          setPhotoStudioControls((current) => ({
            ...current,
            freeCropY: initial.rect.y + nextDy,
            freeCropWidth: initial.rect.width + nextDx,
            freeCropHeight: initial.rect.height - nextDy,
          }))
          return
        }

        if (activeCropHandle === 'sw') {
          const nextDx = clampRange(deltaX, -initial.rect.x, initial.rect.width - minSize)
          const nextDy = clampRange(
            deltaY,
            -(initial.rect.height - minSize),
            100 - (initial.rect.y + initial.rect.height),
          )
          setPhotoStudioControls((current) => ({
            ...current,
            freeCropX: initial.rect.x + nextDx,
            freeCropWidth: initial.rect.width - nextDx,
            freeCropHeight: initial.rect.height + nextDy,
          }))
          return
        }

        const nextDx = clampRange(
          deltaX,
          -(initial.rect.width - minSize),
          100 - (initial.rect.x + initial.rect.width),
        )
        const nextDy = clampRange(
          deltaY,
          -(initial.rect.height - minSize),
          100 - (initial.rect.y + initial.rect.height),
        )
        setPhotoStudioControls((current) => ({
          ...current,
          freeCropWidth: initial.rect.width + nextDx,
          freeCropHeight: initial.rect.height + nextDy,
        }))
        return
      }

      if (!start) return

      const left = Math.min(start.x, point.x)
      const top = Math.min(start.y, point.y)
      const width = Math.max(5, Math.abs(point.x - start.x))
      const height = Math.max(5, Math.abs(point.y - start.y))

      setPhotoStudioControls((current) => ({
        ...current,
        freeCropX: left,
        freeCropY: top,
        freeCropWidth: Math.min(width, 100 - left),
        freeCropHeight: Math.min(height, 100 - top),
      }))
    },
    [
      isDraggingCrop,
      photoStudioControls.cropAspect,
      isMovingCrop,
      activeCropHandle,
      getStudioPointerPercent,
      setPhotoStudioControls,
    ],
  )

  const handleStudioPointerUp = useCallback(() => {
    cropDragStartRef.current = null
    cropResizeStartRef.current = null
    cropMoveStartRef.current = null
    setActiveCropHandle(null)
    setIsMovingCrop(false)
    setIsDraggingCrop(false)
    setIsRedrawCropMode(false)
  }, [setIsDraggingCrop])

  return {
    // refs (passed to ProfileScreen as-is)
    studioFrameRef,
    // crop interaction state
    isRedrawCropMode,
    setIsRedrawCropMode,
    // photo-list actions
    addPhotoFromUrl,
    removeDraftPhoto,
    setPrimaryDraftPhoto,
    // studio actions
    resetPhotoStudioControls,
    closePhotoStudio,
    handlePhotoUpload,
    applyPhotoStudio,
    // pointer handlers
    handleStudioPointerDown,
    handleStudioPointerMove,
    handleStudioPointerUp,
  } as const
}
