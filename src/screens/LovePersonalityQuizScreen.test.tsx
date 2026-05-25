import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { SelfProfile } from '../domain'
import type {
  LikertAnswer,
  LovePersonality,
} from '../services/compatibility'
import type { LovePersonalityQuizSnapshot } from '../components/LovePersonalityQuiz'

// The LovePersonalityQuiz carousel is mocked so the test can directly
// drive the snapshot the parent screen sees, without having to click
// through 14 Likert questions to reach the 'result' position. Each
// test simulates the snapshot state it cares about.
const mockSnapshotEmitter = {
  current: null as ((snapshot: LovePersonalityQuizSnapshot) => void) | null,
}

vi.mock('../components/LovePersonalityQuiz', () => {
  type QuizProps = {
    onChange?: (s: LovePersonalityQuizSnapshot) => void
    initialAnswers?: Array<LikertAnswer | undefined>
  }
  return {
    LovePersonalityQuiz: ({ onChange, initialAnswers }: QuizProps) => {
      // Capture the onChange so tests can fire it from outside.
      mockSnapshotEmitter.current = onChange ?? null
      return (
        <div data-testid="quiz-stub">
          <span data-testid="initial-answer-count">
            {initialAnswers?.length ?? 0}
          </span>
        </div>
      )
    },
  }
})

import { LovePersonalityQuizScreen } from './LovePersonalityQuizScreen'

const baseSelfProfile = (overrides: Partial<SelfProfile> = {}): SelfProfile => ({
  name: 'Alex',
  age: 30,
  city: 'Bucharest',
  vibe: '',
  bio: '',
  interests: [],
  pronouns: '',
  gender: 'Non-binary',
  orientation: '',
  lookingFor: 'Long-term',
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

const completedSnapshot = (
  overrides: Partial<LovePersonalityQuizSnapshot> = {},
): LovePersonalityQuizSnapshot => ({
  answers: Array(14).fill(3) as LikertAnswer[],
  completed: true,
  lovePersonality: {
    bigFive: {
      openness: 70,
      conscientiousness: 60,
      extraversion: 55,
      agreeableness: 65,
      neuroticism: 30,
    },
    attachment: 'secure',
    attachmentRatings: { secure: 5, anxious: 3, avoidant: 2, disorganized: 1 },
    reveal: null,
  } as LovePersonality,
  reveal: null,
  position: 'result',
  ...overrides,
})

type RenderOpts = {
  selfProfile?: SelfProfile
  setSelfProfile?: ReturnType<typeof vi.fn>
  onSaved?: ReturnType<typeof vi.fn>
  onCancel?: ReturnType<typeof vi.fn>
}

const renderScreen = (opts: RenderOpts = {}) =>
  render(
    <LovePersonalityQuizScreen
      appLanguage="en"
      selfProfile={opts.selfProfile ?? baseSelfProfile()}
      setSelfProfile={opts.setSelfProfile ?? vi.fn()}
      onSaved={opts.onSaved ?? vi.fn()}
      onCancel={opts.onCancel ?? vi.fn()}
    />,
  )

const emitSnapshot = (snapshot: LovePersonalityQuizSnapshot) => {
  // Wrap in act() so React flushes the parent's setSnapshot before the
  // next assertion. Without this, the footer-conditional re-render
  // doesn't happen before getByRole runs.
  act(() => {
    if (mockSnapshotEmitter.current) {
      mockSnapshotEmitter.current(snapshot)
    }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSnapshotEmitter.current = null
})

describe('LovePersonalityQuizScreen — chrome', () => {
  it('renders the embedded quiz component', () => {
    renderScreen()
    expect(screen.getByTestId('quiz-stub')).toBeInTheDocument()
  })

  it('renders the close (×) button labelled Cancel', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('clicking close fires onCancel without touching setSelfProfile', () => {
    const onCancel = vi.fn()
    const setSelfProfile = vi.fn()
    renderScreen({ onCancel, setSelfProfile })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(setSelfProfile).not.toHaveBeenCalled()
  })
})

describe('LovePersonalityQuizScreen — initial answers passthrough', () => {
  it('forwards an empty 14-slot answers array when the user has no prior quiz', () => {
    renderScreen()
    expect(screen.getByTestId('initial-answer-count').textContent).toBe('14')
  })

  it('forwards the user\'s existing personalityAnswers when present', () => {
    const existing = Array(14).fill(4) as LikertAnswer[]
    renderScreen({
      selfProfile: baseSelfProfile({ personalityAnswers: existing }),
    })
    expect(screen.getByTestId('initial-answer-count').textContent).toBe('14')
  })
})

describe('LovePersonalityQuizScreen — Save footer visibility', () => {
  it('does NOT render the Save footer at the intro position', () => {
    renderScreen()
    // The carousel starts at 'intro' so no Save button should be in the footer.
    // Cancel exists (header ×) but Save & return does not.
    expect(
      screen.queryByRole('button', { name: /save & return/i }),
    ).not.toBeInTheDocument()
  })

  it('does NOT render the Save footer when position is "question"', () => {
    renderScreen()
    emitSnapshot(completedSnapshot({ position: 'question', completed: false }))
    expect(
      screen.queryByRole('button', { name: /save & return/i }),
    ).not.toBeInTheDocument()
  })

  it('renders the Save footer when position reaches "result"', () => {
    renderScreen()
    emitSnapshot(completedSnapshot())
    expect(
      screen.getByRole('button', { name: /save & return/i }),
    ).toBeInTheDocument()
  })
})

describe('LovePersonalityQuizScreen — Save behaviour', () => {
  it('Save button is disabled when the quiz is at result but not completed', () => {
    renderScreen()
    emitSnapshot(completedSnapshot({ completed: false }))
    expect(
      screen.getByRole('button', { name: /save & return/i }),
    ).toBeDisabled()
  })

  it('clicking Save commits the snapshot to setSelfProfile and fires onSaved', () => {
    const setSelfProfile = vi.fn()
    const onSaved = vi.fn()
    renderScreen({ setSelfProfile, onSaved })
    emitSnapshot(completedSnapshot())
    fireEvent.click(screen.getByRole('button', { name: /save & return/i }))
    expect(setSelfProfile).toHaveBeenCalledOnce()
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('does NOT call setSelfProfile when lovePersonality is null even at result', () => {
    const setSelfProfile = vi.fn()
    const onSaved = vi.fn()
    renderScreen({ setSelfProfile, onSaved })
    emitSnapshot(completedSnapshot({ lovePersonality: null }))
    fireEvent.click(screen.getByRole('button', { name: /save & return/i }))
    expect(setSelfProfile).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('footer also renders a ghost Cancel button at the result step', () => {
    renderScreen()
    emitSnapshot(completedSnapshot())
    // Two Cancel buttons now: the × in the header, and the footer ghost.
    const cancels = screen.getAllByRole('button', { name: /cancel/i })
    expect(cancels.length).toBeGreaterThanOrEqual(2)
  })
})
