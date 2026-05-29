import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhotoManager, type PhotoManagerProps } from './PhotoManager'
import type { SelfProfile, PhotoStudioControls } from '../domain'
import { toProfileDraft } from '../persistence'

vi.mock('../services/ai/photoCoach', () => ({
  backendInvokePhotoCoach: vi.fn().mockResolvedValue(null),
}))
import { backendInvokePhotoCoach } from '../services/ai/photoCoach'
const mockPhotoCoach = vi.mocked(backendInvokePhotoCoach)

const baseProfile = (photos: string[]): SelfProfile =>
  ({
    name: 'Alex',
    age: 30,
    city: 'Bucharest',
    vibe: 'builder',
    bio: '',
    interests: [],
    pronouns: '',
    gender: '',
    orientation: '',
    lookingFor: '',
    relationshipIntent: '',
    heightCm: 0,
    jobTitle: '',
    company: '',
    education: '',
    hometown: '',
    languages: [],
    drinking: '',
    smoking: '',
    workout: '',
    religion: '',
    politics: '',
    zodiac: '',
    childrenPlan: '',
    pets: '',
    promptOne: '',
    promptTwo: '',
    promptThree: '',
    dealbreakers: [],
    instagram: '',
    anthem: '',
    socialConnections: {
      x: { connected: false, handle: '' },
      instagram: { connected: false, handle: '' },
      facebook: { connected: false, handle: '' },
      linkedin: { connected: false, handle: '' },
      tiktok: { connected: false, handle: '' },
    },
    socialPromotionOptIn: false,
    travelMode: false,
    photos,
  }) as SelfProfile

const controls: PhotoStudioControls = {
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

const buildProps = (overrides: Partial<PhotoManagerProps> = {}): PhotoManagerProps => {
  const photos = overrides.selfProfile?.photos ?? ['https://example.com/a.jpg']
  const selfProfile = overrides.selfProfile ?? baseProfile(photos)
  return {
    appLanguage: 'en',
    selfProfile,
    profileDraft: toProfileDraft(selfProfile),
    photoUrlInput: '',
    setPhotoUrlInput: vi.fn(),
    addPhotoFromUrl: vi.fn(),
    handlePhotoUpload: vi.fn(),
    setPrimaryDraftPhoto: vi.fn(),
    removeDraftPhoto: vi.fn(),
    photoStudioSource: null,
    photoStudioAnalysis: null,
    photoStudioControls: controls,
    setPhotoStudioControls: vi.fn(),
    photoStudioBusy: false,
    isDraggingCrop: false,
    isRedrawCropMode: false,
    setIsRedrawCropMode: vi.fn(),
    applyPhotoStudio: vi.fn(),
    resetPhotoStudioControls: vi.fn(),
    closePhotoStudio: vi.fn(),
    studioFrameRef: React.createRef<HTMLDivElement>(),
    handleStudioPointerDown: vi.fn(),
    handleStudioPointerMove: vi.fn(),
    handleStudioPointerUp: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  mockPhotoCoach.mockReset().mockResolvedValue(null)
})

describe('<PhotoManager /> — manager state', () => {
  it('typing in the photo URL input calls setPhotoUrlInput', () => {
    const setPhotoUrlInput = vi.fn()
    render(<PhotoManager {...buildProps({ setPhotoUrlInput })} />)
    const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement
    expect(urlInput).not.toBeNull()
    fireEvent.change(urlInput, { target: { value: 'https://example.com/me.jpg' } })
    expect(setPhotoUrlInput).toHaveBeenCalledWith('https://example.com/me.jpg')
  })

  it('the Add URL button calls addPhotoFromUrl', () => {
    const addPhotoFromUrl = vi.fn()
    render(<PhotoManager {...buildProps({ addPhotoFromUrl, photoUrlInput: 'https://example.com/me.jpg' })} />)
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(addPhotoFromUrl).toHaveBeenCalled()
  })

  it('clicking the Photo Coach button invokes backendInvokePhotoCoach', async () => {
    render(<PhotoManager {...buildProps()} />)
    const photoBtn = screen
      .getAllByRole('button')
      .find((b) => /photo/i.test(b.textContent || '') && /coach|feedback|review/i.test(b.textContent || ''))
    expect(photoBtn).toBeDefined()
    fireEvent.click(photoBtn!)
    await waitFor(() => {
      expect(mockPhotoCoach).toHaveBeenCalled()
    })
  })

  it('the Photo Coach button is disabled when there are zero photos', () => {
    render(<PhotoManager {...buildProps({ selfProfile: baseProfile([]) })} />)
    const photoBtn = screen
      .getAllByRole('button')
      .find((b) => /photo/i.test(b.textContent || '') && /coach|feedback|review/i.test(b.textContent || ''))
    expect(photoBtn).toBeDisabled()
  })
})

describe('<PhotoManager /> — editor state', () => {
  it('renders the sticky Use this photo button when a source is set', () => {
    render(<PhotoManager {...buildProps({ photoStudioSource: 'data:image/png;base64,xxx' })} />)
    expect(screen.getByRole('button', { name: /use photo/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeTruthy()
  })
})
