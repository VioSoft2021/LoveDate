import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfileScreen, type ProfileScreenProps } from './ProfileScreen'
import type { SelfProfile } from '../domain'
import { toProfileDraft } from '../persistence'

// AI Edge Function calls are mocked so the screen never reaches Supabase.
vi.mock('../services/ai/photoCoach', () => ({
  backendInvokePhotoCoach: vi.fn().mockResolvedValue(null),
}))
vi.mock('../services/ai/profileWriter', () => ({
  backendInvokeProfileWriter: vi.fn().mockResolvedValue(null),
}))

import { backendInvokeProfileWriter } from '../services/ai/profileWriter'
import { backendInvokePhotoCoach } from '../services/ai/photoCoach'
const mockProfileWriter = vi.mocked(backendInvokeProfileWriter)
const mockPhotoCoach = vi.mocked(backendInvokePhotoCoach)

const buildSelfProfile = (overrides: Partial<SelfProfile> = {}): SelfProfile => ({
  name: 'Alex',
  age: 30,
  city: 'Bucharest',
  vibe: 'builder',
  bio: 'I make things.',
  interests: ['coffee'],
  pronouns: 'They/Them',
  gender: 'Non-binary',
  orientation: 'Open',
  lookingFor: 'Long-term',
  relationshipIntent: 'Serious',
  heightCm: 172,
  jobTitle: 'PM',
  company: 'X',
  education: 'BSc CS',
  hometown: 'Cluj',
  languages: ['en'],
  drinking: 'Socially',
  smoking: 'Never',
  workout: '3x',
  religion: 'Agnostic',
  politics: 'Moderate',
  zodiac: 'Leo',
  childrenPlan: 'Maybe',
  pets: 'Dog',
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
  photos: ['https://example.com/a.jpg'],
  ...overrides,
})

const buildProps = (overrides: Partial<ProfileScreenProps> = {}): ProfileScreenProps => {
  const selfProfile = overrides.selfProfile ?? buildSelfProfile()
  return {
    appLanguage: 'en',
    selfProfile,
    profileDraft: toProfileDraft(selfProfile),
    setProfileDraft: vi.fn(),
    handleProfileDraftChange: vi.fn(),
    handleProfileDraftToggle: vi.fn(),
    saveMyProfile: vi.fn((e) => e.preventDefault()),
    profileSaveErrors: [],
    selfLovePersonality: null,
    socialConnectedCount: 0,
    onOpenPhotoStudio: vi.fn(),
    onOpenPersonalityGuide: vi.fn(),
    onOpenLovePersonality: vi.fn(),
    onOpenLovePersonalityQuiz: vi.fn(),
    onOpenStabilityQuiz: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  mockProfileWriter.mockReset().mockResolvedValue(null)
  mockPhotoCoach.mockReset().mockResolvedValue(null)
})

describe('ProfileScreen — identity inputs', () => {
  it('renders name + age inputs reflecting the draft', () => {
    const selfProfile = buildSelfProfile({ name: 'Sasha', age: 27 })
    render(<ProfileScreen {...buildProps({ selfProfile })} />)
    const nameInput = screen.getByDisplayValue('Sasha')
    expect(nameInput).toBeInTheDocument()
    expect(screen.getByDisplayValue('27')).toBeInTheDocument()
  })

  it('typing in the name input calls handleProfileDraftChange("name", ...)', () => {
    const handleProfileDraftChange = vi.fn()
    render(
      <ProfileScreen
        {...buildProps({ handleProfileDraftChange })}
      />,
    )
    const nameInput = screen.getByDisplayValue('Alex')
    fireEvent.change(nameInput, { target: { value: 'Sasha' } })
    expect(handleProfileDraftChange).toHaveBeenCalledWith('name', 'Sasha')
  })

  it('typing in the age input calls handleProfileDraftChange("age", ...)', () => {
    const handleProfileDraftChange = vi.fn()
    render(<ProfileScreen {...buildProps({ handleProfileDraftChange })} />)
    const ageInput = screen.getByDisplayValue('30')
    fireEvent.change(ageInput, { target: { value: '31' } })
    expect(handleProfileDraftChange).toHaveBeenCalledWith('age', '31')
  })
})

describe('ProfileScreen — bio + city + interests', () => {
  it('renders bio textarea reflecting the draft', () => {
    const selfProfile = buildSelfProfile({ bio: 'Hello world' })
    render(<ProfileScreen {...buildProps({ selfProfile })} />)
    expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument()
  })

  it('typing in bio calls handleProfileDraftChange("bio", ...)', () => {
    const handleProfileDraftChange = vi.fn()
    render(<ProfileScreen {...buildProps({ handleProfileDraftChange })} />)
    const bioInput = screen.getByDisplayValue('I make things.')
    fireEvent.change(bioInput, { target: { value: 'Updated bio' } })
    expect(handleProfileDraftChange).toHaveBeenCalledWith('bio', 'Updated bio')
  })

  it('typing in city calls handleProfileDraftChange("city", ...)', () => {
    const handleProfileDraftChange = vi.fn()
    render(<ProfileScreen {...buildProps({ handleProfileDraftChange })} />)
    const cityInput = screen.getByDisplayValue('Bucharest')
    fireEvent.change(cityInput, { target: { value: 'Cluj' } })
    expect(handleProfileDraftChange).toHaveBeenCalledWith('city', 'Cluj')
  })
})

describe('ProfileScreen — travel mode toggle', () => {
  it('travel mode toggle calls handleProfileDraftToggle("travelMode", true)', () => {
    const handleProfileDraftToggle = vi.fn()
    render(<ProfileScreen {...buildProps({ handleProfileDraftToggle })} />)
    // The travelMode checkbox is the only "travel" labeled checkbox
    const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    const travelCheckbox = checkboxes.find((cb) => {
      const label = cb.closest('label')
      return label && /travel/i.test(label.textContent || '')
    })
    expect(travelCheckbox).toBeDefined()
    fireEvent.click(travelCheckbox!)
    expect(handleProfileDraftToggle).toHaveBeenCalledWith('travelMode', true)
  })
})

describe('ProfileScreen — save flow', () => {
  it('submitting the form calls saveMyProfile', () => {
    const saveMyProfile = vi.fn((e: React.FormEvent) => e.preventDefault())
    const { container } = render(
      <ProfileScreen {...buildProps({ saveMyProfile })} />,
    )
    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form!)
    expect(saveMyProfile).toHaveBeenCalled()
  })

  it('Save Profile button is present', () => {
    render(<ProfileScreen {...buildProps()} />)
    expect(screen.getByRole('button', { name: /^Save Profile$/i })).toBeInTheDocument()
  })

  it('renders profileSaveErrors when provided', () => {
    render(
      <ProfileScreen
        {...buildProps({
          profileSaveErrors: ['Name is required', 'Add at least one photo'],
        })}
      />,
    )
    expect(screen.getByText(/Save blocked/i)).toBeInTheDocument()
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Add at least one photo')).toBeInTheDocument()
  })

  it('Reset Draft button calls setProfileDraft with the original profile draft', () => {
    const setProfileDraft = vi.fn()
    const selfProfile = buildSelfProfile({ name: 'Snapshot' })
    render(<ProfileScreen {...buildProps({ selfProfile, setProfileDraft })} />)
    fireEvent.click(screen.getByRole('button', { name: /Reset Draft/i }))
    expect(setProfileDraft).toHaveBeenCalled()
    const arg = setProfileDraft.mock.calls[0][0]
    expect(arg.name).toBe('Snapshot')
  })
})

describe('ProfileScreen — navigation buttons', () => {
  it('Open Settings button calls onOpenSettings', () => {
    const onOpenSettings = vi.fn()
    render(<ProfileScreen {...buildProps({ onOpenSettings })} />)
    fireEvent.click(screen.getByRole('button', { name: /Open Settings/i }))
    expect(onOpenSettings).toHaveBeenCalled()
  })

  it('"What does my Love Personality mean?" button calls onOpenPersonalityGuide', () => {
    const onOpenPersonalityGuide = vi.fn()
    render(<ProfileScreen {...buildProps({ onOpenPersonalityGuide })} />)
    // The editor's duplicate quiz section was removed (2026-05-25) — the
    // surviving entry to the framework explainer lives in the About card.
    const buttons = screen.getAllByRole('button').filter((b) =>
      /love personality mean|love personality guide/i.test(b.textContent || ''),
    )
    expect(buttons.length).toBeGreaterThan(0)
    fireEvent.click(buttons[0])
    expect(onOpenPersonalityGuide).toHaveBeenCalled()
  })
})

describe('ProfileScreen — manage photos', () => {
  it('clicking Manage photos opens the photo studio', () => {
    const onOpenPhotoStudio = vi.fn()
    render(<ProfileScreen {...buildProps({ onOpenPhotoStudio })} />)
    fireEvent.click(screen.getByRole('button', { name: /manage photos/i }))
    expect(onOpenPhotoStudio).toHaveBeenCalled()
  })
})

describe('ProfileScreen — AI Profile Writer', () => {
  it('clicking AI Profile Writer button invokes backendInvokeProfileWriter', async () => {
    render(<ProfileScreen {...buildProps()} />)
    // The bio writer CTA text is "Get bio coaching from AI" (or similar)
    const writerBtn = screen
      .getAllByRole('button')
      .find((b) => /bio|coach|writer/i.test(b.textContent || '') && !b.textContent?.match(/photo/i))
    expect(writerBtn).toBeDefined()
    fireEvent.click(writerBtn!)
    await waitFor(() => {
      expect(mockProfileWriter).toHaveBeenCalled()
    })
  })
})

describe('ProfileScreen — personality section', () => {
  // Tier A (2026-05-24) — the inline A/B quiz inside ProfileScreen was
  // removed; the new 14-Likert assessment lives in Onboarding only.
  // (2026-05-25) — editor's redundant Personality Quiz <details> block
  // also removed; the surviving entry to PersonalityGuideScreen is the
  // "What does my Love Personality mean?" button in the About card.
  it('exposes the framework-explainer CTA in the About card', () => {
    render(<ProfileScreen {...buildProps()} />)
    const explainerBtn = screen
      .getAllByRole('button')
      .find((b) => /love personality mean|love personality guide/i.test(b.textContent || ''))
    expect(explainerBtn).toBeDefined()
  })
})
