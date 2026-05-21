import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PersonalityGuideScreen } from './PersonalityGuideScreen'
import { PERSONALITY_DIMENSIONS, PERSONALITY_TYPE_GUIDE } from '../constants'

describe('PersonalityGuideScreen — rendering', () => {
  it('renders the screen title + intro pill', () => {
    render(<PersonalityGuideScreen appLanguage="en" selfPersonalityCode="DMFR" onBackToProfile={vi.fn()} />)
    expect(screen.getByText('Personality Guide')).toBeInTheDocument()
    expect(screen.getByText(/Understanding Privé Personality Codes/i)).toBeInTheDocument()
  })

  it("displays the user's current personality code", () => {
    render(<PersonalityGuideScreen appLanguage="en" selfPersonalityCode="ABCD" onBackToProfile={vi.fn()} />)
    expect(screen.getByText('ABCD')).toBeInTheDocument()
  })

  it('renders all 4 dimension cards', () => {
    const { container } = render(
      <PersonalityGuideScreen appLanguage="en" selfPersonalityCode="DMFR" onBackToProfile={vi.fn()} />,
    )
    const cards = container.querySelectorAll('.personality-dimension-card')
    expect(cards.length).toBe(PERSONALITY_DIMENSIONS.length)
  })

  it('renders all 16 personality type cards', () => {
    const { container } = render(
      <PersonalityGuideScreen appLanguage="en" selfPersonalityCode="DMFR" onBackToProfile={vi.fn()} />,
    )
    const cards = container.querySelectorAll('.personality-type-card')
    expect(cards.length).toBe(PERSONALITY_TYPE_GUIDE.length)
    expect(cards.length).toBe(16)
  })
})

describe('PersonalityGuideScreen — current type highlight', () => {
  it('marks the user’s type card with the is-user-type class', () => {
    const { container } = render(
      <PersonalityGuideScreen appLanguage="en" selfPersonalityCode={PERSONALITY_TYPE_GUIDE[0].code} onBackToProfile={vi.fn()} />,
    )
    const userCards = container.querySelectorAll('.personality-type-card.is-user-type')
    expect(userCards.length).toBe(1)
    expect(userCards[0].textContent).toContain(PERSONALITY_TYPE_GUIDE[0].code)
  })

  it('shows the "This is your current type" line on the matching card', () => {
    render(
      <PersonalityGuideScreen
        appLanguage="en"
        selfPersonalityCode={PERSONALITY_TYPE_GUIDE[0].code}
        onBackToProfile={vi.fn()}
      />,
    )
    expect(screen.getByText(/This is your current type/i)).toBeInTheDocument()
  })

  it('shows no highlighted card when the user’s code matches none of the 16', () => {
    const { container } = render(
      <PersonalityGuideScreen appLanguage="en" selfPersonalityCode="ZZZZ" onBackToProfile={vi.fn()} />,
    )
    expect(container.querySelectorAll('.personality-type-card.is-user-type').length).toBe(0)
    expect(screen.queryByText(/This is your current type/i)).not.toBeInTheDocument()
  })
})

describe('PersonalityGuideScreen — back button', () => {
  it('clicking Back to Profile calls onBackToProfile', () => {
    const onBackToProfile = vi.fn()
    render(<PersonalityGuideScreen appLanguage="en" selfPersonalityCode="DMFR" onBackToProfile={onBackToProfile} />)
    fireEvent.click(screen.getByRole('button', { name: /Back to Profile/i }))
    expect(onBackToProfile).toHaveBeenCalled()
  })
})
