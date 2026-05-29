import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MatchCelebrationModal } from './MatchCelebrationModal'
import type { Profile } from '../services/priveApi'

const baseMatch: Profile = {
  id: 42,
  authUserId: 'auth-42',
  name: 'Riley',
  age: 28,
  city: 'Bucharest',
  vibe: 'curious',
  bio: 'bio',
  interests: ['coffee'],
  palette: ['#000', '#111'],
  photos: ['https://example.com/a.jpg'],
  gender: 'Woman',
  distanceKm: 2,
  verified: true,
  relationshipGoal: 'Long-term',
  zodiac: 'Leo',
}

describe('MatchCelebrationModal', () => {
  it('returns null when match is null', () => {
    const { container } = render(
      <MatchCelebrationModal
        match={null}
        appLanguage="en"
        onDismiss={vi.fn()}
        onOpenChat={vi.fn()}
      />,
    )
    expect(container.querySelector('.match-modal')).toBeNull()
  })

  it('renders the celebration with the match name (EN)', () => {
    render(
      <MatchCelebrationModal
        match={baseMatch}
        appLanguage="en"
        onDismiss={vi.fn()}
        onOpenChat={vi.fn()}
      />,
    )
    expect(screen.getByText(/It's a match/)).toBeInTheDocument()
    expect(screen.getByText(/You and Riley liked each other/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Keep Swiping/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Open Chat/i })).toBeInTheDocument()
  })

  it('renders the celebration with the match name (RO)', () => {
    render(
      <MatchCelebrationModal
        match={baseMatch}
        appLanguage="ro"
        onDismiss={vi.fn()}
        onOpenChat={vi.fn()}
      />,
    )
    expect(screen.getByText(/Este o potrivire/)).toBeInTheDocument()
    expect(screen.getByText(/Tu și Riley v-ați apreciat reciproc/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuă descoperirea/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Deschide chatul/i })).toBeInTheDocument()
  })

  it('Keep Swiping calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(
      <MatchCelebrationModal
        match={baseMatch}
        appLanguage="en"
        onDismiss={onDismiss}
        onOpenChat={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Keep Swiping/i }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('Open Chat calls onOpenChat', () => {
    const onOpenChat = vi.fn()
    render(
      <MatchCelebrationModal
        match={baseMatch}
        appLanguage="en"
        onDismiss={vi.fn()}
        onOpenChat={onOpenChat}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Open Chat/i }))
    expect(onOpenChat).toHaveBeenCalled()
  })

  it('has the correct ARIA modal attributes', () => {
    const { container } = render(
      <MatchCelebrationModal
        match={baseMatch}
        appLanguage="en"
        onDismiss={vi.fn()}
        onOpenChat={vi.fn()}
      />,
    )
    const dialog = container.querySelector('.match-modal')
    expect(dialog?.getAttribute('role')).toBe('dialog')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('aria-label')).toBe('Match found')
  })
})
