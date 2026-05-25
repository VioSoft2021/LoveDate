import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { SelfProfile } from '../domain'

// All network-touching services mocked so the wizard never reaches
// Supabase / Anthropic / Nominatim during tests.
vi.mock('../services/backendApi', () => ({
  backendUploadProfilePhoto: vi.fn().mockResolvedValue(null),
}))
vi.mock('../services/ai/profileWriter', () => ({
  backendInvokeProfileWriter: vi.fn().mockResolvedValue(null),
}))
vi.mock('../services/geolocation', () => ({
  detectMyLocation: vi.fn().mockResolvedValue({
    kind: 'unsupported',
    message: 'mocked',
  }),
  isLocationError: (v: unknown): boolean =>
    Boolean(v && typeof v === 'object' && 'kind' in (v as Record<string, unknown>)),
}))
// The quiz component renders its own UI we don't need to drive in these
// tests — replace with a passthrough stub.
vi.mock('../components/LovePersonalityQuiz', () => ({
  LovePersonalityQuiz: ({
    onSkip,
  }: {
    onSkip?: () => void
  }) => (
    <div data-testid="love-personality-quiz-stub">
      <button type="button" onClick={onSkip}>quiz skip</button>
    </div>
  ),
}))

import { OnboardingScreen } from './OnboardingScreen'

const emptySelfProfile = (overrides: Partial<SelfProfile> = {}): SelfProfile => ({
  name: '',
  age: 0,
  city: '',
  vibe: '',
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
  photos: [],
  ...overrides,
})

type RenderOpts = {
  initial?: Partial<SelfProfile>
  pushToast?: ReturnType<typeof vi.fn>
  onComplete?: ReturnType<typeof vi.fn>
  setSelfProfile?: ReturnType<typeof vi.fn>
}

const renderWizard = (opts: RenderOpts = {}) => {
  const pushToast = opts.pushToast ?? vi.fn()
  const onComplete = opts.onComplete ?? vi.fn()
  const setSelfProfile = opts.setSelfProfile ?? vi.fn()
  const profile = emptySelfProfile(opts.initial)
  render(
    <OnboardingScreen
      appLanguage="en"
      selfProfile={profile}
      setSelfProfile={setSelfProfile}
      pushToast={pushToast}
      onComplete={onComplete}
    />,
  )
  return { pushToast, onComplete, setSelfProfile, profile }
}

// Helper: walk from welcome through to a target step by filling in the
// minimum required fields. Used by tests that need to start mid-wizard.
const advanceToStep = (
  target: 'photos' | 'basics' | 'city' | 'quiz' | 'bio' | 'ready',
) => {
  // welcome → photos
  fireEvent.click(screen.getByRole('button', { name: /begin/i }))
  if (target === 'photos') return
  // photos requires at least one photo to advance. The renderWizard caller
  // must pass initial: { photos: ['...'] } in tests that need to skip past
  // this gate; this helper assumes it's been provided.
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  if (target === 'basics') return
  // basics → city (caller must pre-fill name + age + gender)
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  if (target === 'city') return
  // city → quiz
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  if (target === 'quiz') return
  // quiz → bio (quiz stub doesn't gate, just advance)
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  if (target === 'bio') return
  // bio → ready
  fireEvent.click(screen.getByRole('button', { name: /finish/i }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OnboardingScreen — welcome step', () => {
  it('renders the welcome title and Begin CTA on first mount', () => {
    renderWizard()
    expect(screen.getByRole('heading', { name: /welcome to privé/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^begin$/i })).toBeInTheDocument()
  })

  it('clicking Begin advances to the photos step', () => {
    renderWizard()
    fireEvent.click(screen.getByRole('button', { name: /^begin$/i }))
    expect(screen.getByRole('heading', { name: /add a photo/i })).toBeInTheDocument()
  })
})

describe('OnboardingScreen — skip and progress', () => {
  it('Skip button calls onComplete immediately without committing fields', () => {
    const onComplete = vi.fn()
    const setSelfProfile = vi.fn()
    renderWizard({ onComplete, setSelfProfile })
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onComplete).toHaveBeenCalledOnce()
    expect(setSelfProfile).not.toHaveBeenCalled()
  })

  it('renders 7 progress dots (one per step)', () => {
    const { container } = render(
      <OnboardingScreen
        appLanguage="en"
        selfProfile={emptySelfProfile()}
        setSelfProfile={vi.fn()}
        pushToast={vi.fn()}
        onComplete={vi.fn()}
      />,
    )
    const dots = container.querySelectorAll('.onboarding-dot')
    expect(dots.length).toBe(7)
    // First dot is active on welcome
    expect(dots[0].classList.contains('is-active')).toBe(true)
  })
})

describe('OnboardingScreen — photos gate', () => {
  it('shows error toast when trying to advance from photos with no photo', () => {
    const pushToast = vi.fn()
    renderWizard({ pushToast })
    fireEvent.click(screen.getByRole('button', { name: /^begin$/i }))
    // Continue button visible on photos footer
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    // Still on photos step (not advanced to basics)
    expect(screen.getByRole('heading', { name: /add a photo/i })).toBeInTheDocument()
    expect(pushToast).toHaveBeenCalledWith(
      expect.stringMatching(/please add at least one photo/i),
      'error',
    )
  })

  it('allows advance past photos when the user already has a photo', () => {
    renderWizard({ initial: { photos: ['https://example.com/a.jpg'] } })
    fireEvent.click(screen.getByRole('button', { name: /^begin$/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('heading', { name: /a few basics/i })).toBeInTheDocument()
  })
})

describe('OnboardingScreen — basics gate', () => {
  const goToBasics = () => {
    fireEvent.click(screen.getByRole('button', { name: /^begin$/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  }

  it('blocks advance when name is empty', () => {
    const pushToast = vi.fn()
    renderWizard({
      pushToast,
      initial: { photos: ['https://example.com/a.jpg'] },
    })
    goToBasics()
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(pushToast).toHaveBeenCalledWith(
      expect.stringMatching(/please tell us your name/i),
      'error',
    )
  })

  it('blocks advance when age is missing', () => {
    const pushToast = vi.fn()
    renderWizard({
      pushToast,
      initial: { photos: ['https://example.com/a.jpg'] },
    })
    goToBasics()
    // Fill name only — name is the single text input on the basics step
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'Alex' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(pushToast).toHaveBeenCalledWith(
      expect.stringMatching(/age/i),
      'error',
    )
  })

  it('blocks advance when gender is empty (mandatory per Phase A round 2)', () => {
    const pushToast = vi.fn()
    renderWizard({
      pushToast,
      initial: { photos: ['https://example.com/a.jpg'] },
    })
    goToBasics()
    // Fill name + age but skip gender
    const textInputs = screen.getAllByRole('textbox')
    fireEvent.change(textInputs[0], { target: { value: 'Alex' } })
    const ageInput = screen.getByRole('spinbutton') // type=number
    fireEvent.change(ageInput, { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(pushToast).toHaveBeenCalledWith(
      expect.stringMatching(/gender/i),
      'error',
    )
  })

  it('allows advance past basics when name + age + gender are all set', () => {
    renderWizard({
      initial: { photos: ['https://example.com/a.jpg'] },
    })
    goToBasics()
    const textInputs = screen.getAllByRole('textbox')
    fireEvent.change(textInputs[0], { target: { value: 'Alex' } })
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '30' } })
    // Pick first gender option from the radio group
    const genderRadios = screen.getAllByRole('radio')
    fireEvent.click(genderRadios[0])
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('heading', { name: /where are you based/i })).toBeInTheDocument()
  })
})

describe('OnboardingScreen — city gate', () => {
  it('blocks advance when city is empty', () => {
    const pushToast = vi.fn()
    renderWizard({
      pushToast,
      initial: {
        photos: ['https://example.com/a.jpg'],
        name: 'Alex',
        age: 30,
        gender: 'Non-binary',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /^begin$/i })) // → photos
    fireEvent.click(screen.getByRole('button', { name: /continue/i })) // photos → basics
    fireEvent.click(screen.getByRole('button', { name: /continue/i })) // basics → city
    fireEvent.click(screen.getByRole('button', { name: /continue/i })) // city → blocked
    expect(pushToast).toHaveBeenCalledWith(
      expect.stringMatching(/please add your city/i),
      'error',
    )
  })
})

describe('OnboardingScreen — finish commits the draft', () => {
  it('clicking Enter Privé at the Ready step commits all fields and calls onComplete', () => {
    const onComplete = vi.fn()
    const setSelfProfile = vi.fn()
    renderWizard({
      onComplete,
      setSelfProfile,
      initial: {
        photos: ['https://example.com/a.jpg'],
        name: 'Alex',
        age: 30,
        gender: 'Non-binary',
        city: 'Bucharest',
      },
    })
    // welcome → photos → basics → city → quiz → bio → ready
    fireEvent.click(screen.getByRole('button', { name: /^begin$/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i })) // photos→basics
    fireEvent.click(screen.getByRole('button', { name: /continue/i })) // basics→city
    fireEvent.click(screen.getByRole('button', { name: /continue/i })) // city→quiz
    fireEvent.click(screen.getByRole('button', { name: /continue/i })) // quiz→bio
    fireEvent.click(screen.getByRole('button', { name: /finish/i })) // bio→ready

    expect(screen.getByRole('heading', { name: /ready to discover/i })).toBeInTheDocument()
    const enterBtn = screen.getByRole('button', { name: /enter privé/i })
    act(() => {
      fireEvent.click(enterBtn)
    })
    expect(setSelfProfile).toHaveBeenCalledOnce()
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
