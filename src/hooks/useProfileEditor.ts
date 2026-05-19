import { useState } from 'react'
import { toProfileDraft } from '../persistence'
import type { PhotoStudioAnalysis, PhotoStudioControls, SelfProfile } from '../domain'

// Phase D1.4 — useProfileEditor
//
// Groups self-profile draft + photo studio state. Pure state container
// pattern — save/upload/edit handlers stay in App.tsx for now (they
// touch backend services, cache invalidation, and toast/notification
// surfaces that aren't yet extracted).

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

export const useProfileEditor = (initialSelfProfile: SelfProfile) => {
  const [selfProfile, setSelfProfile] = useState<SelfProfile>(initialSelfProfile)
  const [profileDraft, setProfileDraft] = useState(() => toProfileDraft(initialSelfProfile))
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [profileSaveErrors, setProfileSaveErrors] = useState<string[]>([])
  const [photoUrlInput, setPhotoUrlInput] = useState('')

  // Photo studio (edit modal) state.
  const [photoStudioSource, setPhotoStudioSource] = useState<string | null>(null)
  const [photoStudioAnalysis, setPhotoStudioAnalysis] =
    useState<PhotoStudioAnalysis | null>(null)
  const [photoStudioControls, setPhotoStudioControls] = useState<PhotoStudioControls>(
    DEFAULT_PHOTO_STUDIO_CONTROLS,
  )
  const [photoStudioBusy, setPhotoStudioBusy] = useState(false)
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)

  return {
    selfProfile,
    setSelfProfile,
    profileDraft,
    setProfileDraft,
    profileSaveStatus,
    setProfileSaveStatus,
    profileSaveErrors,
    setProfileSaveErrors,
    photoUrlInput,
    setPhotoUrlInput,
    photoStudioSource,
    setPhotoStudioSource,
    photoStudioAnalysis,
    setPhotoStudioAnalysis,
    photoStudioControls,
    setPhotoStudioControls,
    photoStudioBusy,
    setPhotoStudioBusy,
    isDraggingCrop,
    setIsDraggingCrop,
  } as const
}
