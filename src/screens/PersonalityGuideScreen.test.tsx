import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PersonalityGuideScreen } from './PersonalityGuideScreen'
import type { LovePersonality } from '../services/compatibility'

// Tier A (2026-05-24) — PersonalityGuideScreen rewritten as a Big Five +
// Attachment explainer. No more 16 DMFR type cards; instead 5 Big Five
// dimension cards + 4 attachment style cards.

const userLovePersonality: LovePersonality = {
  bigFive: {
    openness: 80,
    conscientiousness: 60,
    extraversion: 45,
    agreeableness: 70,
    neuroticism: 30,
  },
  attachment: 'secure',
  attachmentRatings: { secure: 5, anxious: 2, avoidant: 1, disorganized: 1 },
  completedAt: '2026-05-24T00:00:00.000Z',
}

describe('PersonalityGuideScreen — rendering', () => {
  it('renders the intro pill + subtitle', () => {
    render(
      <PersonalityGuideScreen
        appLanguage="en"
        selfLovePersonality={userLovePersonality}
        onBackToProfile={vi.fn()}
      />,
    )
    expect(screen.getByText('Love Personality Guide')).toBeInTheDocument()
    expect(screen.getByText(/Understanding your Love Personality/i)).toBeInTheDocument()
  })

  it('renders all 5 Big Five dimension cards', () => {
    const { container } = render(
      <PersonalityGuideScreen
        appLanguage="en"
        selfLovePersonality={userLovePersonality}
        onBackToProfile={vi.fn()}
      />,
    )
    expect(container.querySelectorAll('.personality-dimension-card').length).toBe(5)
  })

  it('renders all 4 attachment style cards', () => {
    const { container } = render(
      <PersonalityGuideScreen
        appLanguage="en"
        selfLovePersonality={userLovePersonality}
        onBackToProfile={vi.fn()}
      />,
    )
    expect(container.querySelectorAll('.personality-type-card').length).toBe(4)
  })

  it('shows the user\'s Big Five scores as percentages on each dimension card', () => {
    render(
      <PersonalityGuideScreen
        appLanguage="en"
        selfLovePersonality={userLovePersonality}
        onBackToProfile={vi.fn()}
      />,
    )
    expect(screen.getByText('80%')).toBeInTheDocument() // openness
    expect(screen.getByText('60%')).toBeInTheDocument() // conscientiousness
    expect(screen.getAllByText('70%').length).toBe(2) // agreeableness + emotional stability (100-30)
  })
})

describe('PersonalityGuideScreen — current attachment highlight', () => {
  it('marks the user\'s attachment card with the is-user-type class', () => {
    const { container } = render(
      <PersonalityGuideScreen
        appLanguage="en"
        selfLovePersonality={userLovePersonality}
        onBackToProfile={vi.fn()}
      />,
    )
    const userCards = container.querySelectorAll('.personality-type-card.is-user-type')
    expect(userCards.length).toBe(1)
    expect(userCards[0].textContent).toMatch(/Secure/i)
  })

  it('shows no highlighted card when the user has no assessment yet', () => {
    const { container } = render(
      <PersonalityGuideScreen appLanguage="en" selfLovePersonality={null} onBackToProfile={vi.fn()} />,
    )
    expect(container.querySelectorAll('.personality-type-card.is-user-type').length).toBe(0)
  })
})

describe('PersonalityGuideScreen — back button', () => {
  it('clicking Back to Profile calls onBackToProfile', () => {
    const onBackToProfile = vi.fn()
    render(
      <PersonalityGuideScreen
        appLanguage="en"
        selfLovePersonality={userLovePersonality}
        onBackToProfile={onBackToProfile}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Back to Profile/i }))
    expect(onBackToProfile).toHaveBeenCalled()
  })
})
