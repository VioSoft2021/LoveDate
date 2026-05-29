import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type {
  AttachmentStyle,
  BigFiveScores,
  LovePersonality,
  LovePersonalityReveal,
} from '../services/compatibility'
import type { SelfProfile } from '../domain'

// The Claude reveal Edge Function is mocked so the screen never reaches
// Supabase. Default mock = success path; individual tests override for
// failure / pending behaviour.
vi.mock('../services/ai/lovePersonalityReveal', () => ({
  backendInvokeLovePersonalityReveal: vi.fn(),
}))
import { backendInvokeLovePersonalityReveal } from '../services/ai/lovePersonalityReveal'
const mockReveal = vi.mocked(backendInvokeLovePersonalityReveal)

import { LovePersonalityScreen } from './LovePersonalityScreen'

const baseBigFive: BigFiveScores = {
  openness: 78,
  conscientiousness: 64,
  extraversion: 52,
  agreeableness: 71,
  neuroticism: 28,
}

const buildReveal = (overrides: Partial<LovePersonalityReveal> = {}): LovePersonalityReveal => ({
  archetypeName: 'Curious Anchor',
  headline: 'Open-hearted explorer with steady ground.',
  description:
    'You meet new ideas with curiosity but stay grounded.\n\nIn love, you offer warmth and reliability.\n\nGrowth comes from naming what you need.',
  strengths: ['Steady', 'Open', 'Warm'],
  growthEdges: ['Ask directly', 'Voice needs'],
  language: 'en',
  generatedAt: '2026-05-24T00:00:00.000Z',
  ...overrides,
})

const buildLP = (overrides: Partial<LovePersonality> = {}): LovePersonality => ({
  bigFive: baseBigFive,
  attachment: 'secure' satisfies AttachmentStyle,
  attachmentRatings: { secure: 5, anxious: 3, avoidant: 2, disorganized: 1 },
  completedAt: '2026-05-24T00:00:00.000Z',
  reveal: buildReveal(),
  ...overrides,
})

type RenderOpts = {
  selfLovePersonality?: LovePersonality | null
  selfName?: string
  setSelfProfile?: React.Dispatch<React.SetStateAction<SelfProfile>>
  onRetake?: () => void
  onBackToProfile?: () => void
}

const renderScreen = (opts: RenderOpts = {}) =>
  render(
    <LovePersonalityScreen
      appLanguage="en"
      selfLovePersonality={opts.selfLovePersonality ?? buildLP()}
      selfName={opts.selfName}
      setSelfProfile={opts.setSelfProfile ?? vi.fn()}
      onRetake={opts.onRetake ?? vi.fn()}
      onBackToProfile={opts.onBackToProfile ?? vi.fn()}
    />,
  )

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LovePersonalityScreen — empty state (no assessment taken)', () => {
  it('shows the take-the-assessment CTA when selfLovePersonality is null', () => {
    renderScreen({ selfLovePersonality: null })
    expect(screen.getByRole('button', { name: /take the assessment/i })).toBeInTheDocument()
  })

  it('clicking the empty-state CTA fires onRetake', () => {
    const onRetake = vi.fn()
    renderScreen({ selfLovePersonality: null, onRetake })
    fireEvent.click(screen.getByRole('button', { name: /take the assessment/i }))
    expect(onRetake).toHaveBeenCalledOnce()
  })

  it('does NOT auto-fire the Claude reveal call when scores are absent', () => {
    renderScreen({ selfLovePersonality: null })
    expect(mockReveal).not.toHaveBeenCalled()
  })
})

describe('LovePersonalityScreen — reveal cached (happy path)', () => {
  it('renders the archetype name, headline, and description paragraphs', () => {
    renderScreen({ selfLovePersonality: buildLP() })
    expect(screen.getByRole('heading', { name: /curious anchor/i })).toBeInTheDocument()
    expect(screen.getByText(/open-hearted explorer with steady ground/i)).toBeInTheDocument()
    expect(screen.getByText(/you meet new ideas with curiosity/i)).toBeInTheDocument()
  })

  it('renders the strengths and growth-edges chips', () => {
    renderScreen({ selfLovePersonality: buildLP() })
    expect(screen.getByText('Steady')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Warm')).toBeInTheDocument()
    expect(screen.getByText('Ask directly')).toBeInTheDocument()
    expect(screen.getByText('Voice needs')).toBeInTheDocument()
  })

  it('renders the Big Five percentage values', () => {
    renderScreen({ selfLovePersonality: buildLP() })
    // openness 78%, conscientiousness 64%, extraversion 52%, agreeableness 71%,
    // emotional stability = 100 - 28 = 72%
    expect(screen.getByText('78%')).toBeInTheDocument()
    expect(screen.getByText('64%')).toBeInTheDocument()
    expect(screen.getByText('52%')).toBeInTheDocument()
    expect(screen.getByText('71%')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('does NOT call the Claude reveal Edge Function when a cached reveal is present', () => {
    renderScreen({ selfLovePersonality: buildLP() })
    expect(mockReveal).not.toHaveBeenCalled()
  })

  it('Retake button fires onRetake', () => {
    const onRetake = vi.fn()
    renderScreen({ selfLovePersonality: buildLP(), onRetake })
    fireEvent.click(screen.getByRole('button', { name: /retake the assessment/i }))
    expect(onRetake).toHaveBeenCalledOnce()
  })

  it('Close (×) button fires onBackToProfile', () => {
    const onBackToProfile = vi.fn()
    renderScreen({ selfLovePersonality: buildLP(), onBackToProfile })
    fireEvent.click(screen.getByRole('button', { name: /back to profile/i }))
    expect(onBackToProfile).toHaveBeenCalledOnce()
  })
})

describe('LovePersonalityScreen — auto-retry when reveal is missing', () => {
  it('auto-fires the Claude reveal call when bigFive + attachment present but reveal is null', async () => {
    mockReveal.mockResolvedValue(buildReveal())
    renderScreen({
      selfLovePersonality: buildLP({ reveal: undefined }),
    })
    await waitFor(() => {
      expect(mockReveal).toHaveBeenCalledOnce()
    })
  })

  it('shows the pending message while the reveal is being generated', async () => {
    // Keep the promise unresolved so the loading state persists.
    const resolveRef: { current: ((value: LovePersonalityReveal | null) => void) | null } = {
      current: null,
    }
    mockReveal.mockImplementation(
      () =>
        new Promise<LovePersonalityReveal | null>((resolve) => {
          resolveRef.current = resolve
        }),
    )
    renderScreen({ selfLovePersonality: buildLP({ reveal: undefined }) })
    expect(
      await screen.findByText(/privé is writing your reveal/i),
    ).toBeInTheDocument()
    // Clean up — fulfill the pending promise so any unmount doesn't warn.
    resolveRef.current?.(null)
  })

  it('shows the honest failure UI + Try again button when the reveal call returns null', async () => {
    mockReveal.mockResolvedValue(null)
    renderScreen({ selfLovePersonality: buildLP({ reveal: undefined }) })
    expect(
      await screen.findByText(/couldn't generate your reveal/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('clicking Try again re-fires the reveal call', async () => {
    mockReveal.mockResolvedValue(null)
    renderScreen({ selfLovePersonality: buildLP({ reveal: undefined }) })
    await screen.findByRole('button', { name: /try again/i })
    // Reset so we can assert the manual retry call distinctly
    mockReveal.mockClear()
    mockReveal.mockResolvedValue(buildReveal())
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => {
      expect(mockReveal).toHaveBeenCalledOnce()
    })
  })

  it('commits the new reveal into setSelfProfile when the call succeeds', async () => {
    const setSelfProfile = vi.fn()
    mockReveal.mockResolvedValue(buildReveal({ archetypeName: 'Steady Lighthouse' }))
    renderScreen({
      selfLovePersonality: buildLP({ reveal: undefined }),
      setSelfProfile,
    })
    await waitFor(() => {
      expect(setSelfProfile).toHaveBeenCalledOnce()
    })
  })
})
