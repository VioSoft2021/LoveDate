import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityScreen } from './ActivityScreen'
import type { Profile } from '../services/priveApi'

// First component-level test in the repo. Validates the screen test
// infra works end-to-end (jsdom + @testing-library/react + jest-dom
// matchers + TypeScript) so future JSX decomposition can rely on it.

const buildProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 1,
  authUserId: 'auth-1',
  name: 'Riley',
  age: 28,
  city: 'Bucharest',
  vibe: 'curious',
  bio: 'bio',
  interests: ['coffee'],
  palette: ['#000000', '#111111'],
  photos: ['https://example.com/a.jpg'],
  gender: 'Woman',
  distanceKm: 3,
  verified: true,
  relationshipGoal: 'Long-term',
  zodiac: 'Leo',
  personalityAnswers: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
  ...overrides,
})

describe('ActivityScreen — empty state', () => {
  it('shows zero counts and empty-state copy for all three sections', () => {
    render(
      <ActivityScreen
        appLanguage="en"
        likedProfiles={[]}
        passedProfiles={[]}
        matchedProfiles={[]}
        onChatWith={vi.fn()}
        onViewProfile={vi.fn()}
      />,
    )
    // Three "0" counts — one per overview row. We assert on the empty
    // copy strings rather than counts because the same "0" appears in
    // all three rows.
    expect(screen.getByText(/No matches yet/i)).toBeInTheDocument()
    expect(screen.getByText(/No likes yet/i)).toBeInTheDocument()
    expect(screen.getByText(/No passes yet/i)).toBeInTheDocument()
  })

  it('renders Romanian empty-state copy when appLanguage="ro"', () => {
    render(
      <ActivityScreen
        appLanguage="ro"
        likedProfiles={[]}
        passedProfiles={[]}
        matchedProfiles={[]}
        onChatWith={vi.fn()}
        onViewProfile={vi.fn()}
      />,
    )
    expect(screen.getByText(/Nu ai încă potriviri/i)).toBeInTheDocument()
    expect(screen.getByText(/Nu ai încă aprecieri/i)).toBeInTheDocument()
  })
})

describe('ActivityScreen — matched profiles', () => {
  it('renders one Chat button per matched profile', () => {
    const match1 = buildProfile({ id: 10, name: 'Mira' })
    const match2 = buildProfile({ id: 11, name: 'Jordan' })
    render(
      <ActivityScreen
        appLanguage="en"
        likedProfiles={[]}
        passedProfiles={[]}
        matchedProfiles={[match1, match2]}
        onChatWith={vi.fn()}
        onViewProfile={vi.fn()}
      />,
    )
    expect(screen.getByText('Mira')).toBeInTheDocument()
    expect(screen.getByText('Jordan')).toBeInTheDocument()
    // Two Chat buttons (one per match)
    const chatButtons = screen.getAllByRole('button', { name: /chat/i })
    expect(chatButtons).toHaveLength(2)
  })

  it('clicking Chat calls onChatWith with the profile id', () => {
    const onChatWith = vi.fn()
    const match = buildProfile({ id: 42, name: 'Mira' })
    render(
      <ActivityScreen
        appLanguage="en"
        likedProfiles={[]}
        passedProfiles={[]}
        matchedProfiles={[match]}
        onChatWith={onChatWith}
        onViewProfile={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    expect(onChatWith).toHaveBeenCalledWith(42)
  })
})

describe('ActivityScreen — liked + passed lists', () => {
  it('renders View buttons for liked profiles and wires onViewProfile', () => {
    const onViewProfile = vi.fn()
    const liked = buildProfile({ id: 7, name: 'Sasha', city: 'Cluj' })
    render(
      <ActivityScreen
        appLanguage="en"
        likedProfiles={[liked]}
        passedProfiles={[]}
        matchedProfiles={[]}
        onChatWith={vi.fn()}
        onViewProfile={onViewProfile}
      />,
    )
    expect(screen.getByText('Sasha')).toBeInTheDocument()
    expect(screen.getByText('Cluj')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /view/i }))
    expect(onViewProfile).toHaveBeenCalledWith(7)
  })

  it('renders passed profiles in their own section without crashing', () => {
    const passed = buildProfile({ id: 99, name: 'Quinn', city: 'Timișoara' })
    render(
      <ActivityScreen
        appLanguage="en"
        likedProfiles={[]}
        passedProfiles={[passed]}
        matchedProfiles={[]}
        onChatWith={vi.fn()}
        onViewProfile={vi.fn()}
      />,
    )
    expect(screen.getByText('Quinn')).toBeInTheDocument()
    expect(screen.getByText('Timișoara')).toBeInTheDocument()
  })
})

describe('ActivityScreen — counts in overview', () => {
  it('overview counts match the array lengths', () => {
    const likedA = buildProfile({ id: 1 })
    const likedB = buildProfile({ id: 2 })
    const passed = buildProfile({ id: 3 })
    const matched = buildProfile({ id: 4 })
    const { container } = render(
      <ActivityScreen
        appLanguage="en"
        likedProfiles={[likedA, likedB]}
        passedProfiles={[passed]}
        matchedProfiles={[matched]}
        onChatWith={vi.fn()}
        onViewProfile={vi.fn()}
      />,
    )
    // The overview block lists "Liked", "Passed", "Matches" each with a
    // bold number. We query within the overview section to avoid
    // confusing matches with the same numbers elsewhere.
    const overview = container.querySelector('.activity-overview')
    expect(overview).not.toBeNull()
    const strongs = overview!.querySelectorAll('strong')
    // Order in JSX is: liked, passed, matches.
    expect(strongs[0]?.textContent).toBe('2')
    expect(strongs[1]?.textContent).toBe('1')
    expect(strongs[2]?.textContent).toBe('1')
  })
})
