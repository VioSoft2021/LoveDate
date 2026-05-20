import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CirclesScreen, type CirclesScreenProps } from './CirclesScreen'
import type { Circle, CirclePost } from '../domain'

const buildCircle = (overrides: Partial<Circle> = {}): Circle => ({
  id: 'c-1',
  name: 'Builder Mode Bucharest',
  theme: 'For curious makers',
  description: 'A community for people who like to build things together.',
  tags: ['coffee', 'tech', 'art'],
  memberCount: 128,
  hero: 'https://example.com/circle.jpg',
  events: [
    { id: 'e-1', title: 'Friday demo night', when: 'Fri 7pm', where: 'OAR' },
  ],
  ...overrides,
})

const buildPost = (overrides: Partial<CirclePost> = {}): CirclePost => ({
  id: 'p-1',
  circleId: 'c-1',
  author: 'Riley',
  text: 'Excited to meet everyone tonight!',
  createdAt: Date.UTC(2026, 4, 20, 18, 0, 0),
  ...overrides,
})

const baseProps: CirclesScreenProps = {
  appLanguage: 'en',
  circleSearch: '',
  setCircleSearch: vi.fn(),
  filteredCircles: [],
  joinedCircleIds: [],
  selectedCircle: null,
  setSelectedCircleId: vi.fn(),
  toggleCircleJoin: vi.fn(),
  circleRsvps: {},
  toggleCircleRsvp: vi.fn(),
  circlePostDraft: '',
  setCirclePostDraft: vi.fn(),
  publishCirclePost: vi.fn(),
  selectedCirclePosts: [],
}

describe('CirclesScreen — list panel', () => {
  it('renders the search input + circle title', () => {
    render(<CirclesScreen {...baseProps} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Circles/i })).toBeInTheDocument()
  })

  it('typing in search calls setCircleSearch', () => {
    const setCircleSearch = vi.fn()
    render(<CirclesScreen {...baseProps} setCircleSearch={setCircleSearch} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'tech' } })
    expect(setCircleSearch).toHaveBeenCalledWith('tech')
  })

  it('renders one button per filtered circle', () => {
    const circles = [
      buildCircle({ id: 'a', name: 'Alpha' }),
      buildCircle({ id: 'b', name: 'Beta' }),
    ]
    render(<CirclesScreen {...baseProps} filteredCircles={circles} />)
    expect(screen.getByRole('button', { name: /Alpha/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Beta/ })).toBeInTheDocument()
  })

  it('clicking a circle calls setSelectedCircleId with its id', () => {
    const setSelectedCircleId = vi.fn()
    const circle = buildCircle({ id: 'cluj-makers', name: 'Cluj Makers' })
    render(
      <CirclesScreen
        {...baseProps}
        filteredCircles={[circle]}
        setSelectedCircleId={setSelectedCircleId}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Cluj Makers/ }))
    expect(setSelectedCircleId).toHaveBeenCalledWith('cluj-makers')
  })

  it('shows joined member count + 1 when user has joined the circle', () => {
    const circle = buildCircle({ id: 'cm', memberCount: 100 })
    render(
      <CirclesScreen
        {...baseProps}
        filteredCircles={[circle]}
        joinedCircleIds={['cm']}
      />,
    )
    // Member text is "<count> members" — joined adds +1 to display.
    expect(screen.getByText(/101 members/i)).toBeInTheDocument()
  })

  it('shows unjoined member count as-is', () => {
    const circle = buildCircle({ id: 'cm', memberCount: 100 })
    render(<CirclesScreen {...baseProps} filteredCircles={[circle]} />)
    expect(screen.getByText(/100 members/i)).toBeInTheDocument()
  })
})

describe('CirclesScreen — detail panel (selected circle)', () => {
  it('shows empty-state copy when no circle selected', () => {
    render(<CirclesScreen {...baseProps} />)
    expect(screen.getByText(/No circles found/i)).toBeInTheDocument()
  })

  it('renders selected circle name + theme + description', () => {
    const circle = buildCircle({
      name: 'Builder Mode Bucharest',
      theme: 'For curious makers',
      description: 'Hand-picked community',
    })
    render(<CirclesScreen {...baseProps} selectedCircle={circle} />)
    // h3 in the hero overlay
    expect(
      screen.getByRole('heading', { level: 3, name: 'Builder Mode Bucharest' }),
    ).toBeInTheDocument()
    expect(screen.getByText('For curious makers')).toBeInTheDocument()
    expect(screen.getByText('Hand-picked community')).toBeInTheDocument()
  })

  it('Join Circle button toggles join state via toggleCircleJoin', () => {
    const toggleCircleJoin = vi.fn()
    const circle = buildCircle({ id: 'c42' })
    render(
      <CirclesScreen
        {...baseProps}
        selectedCircle={circle}
        toggleCircleJoin={toggleCircleJoin}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Join Circle/i }))
    expect(toggleCircleJoin).toHaveBeenCalledWith('c42')
  })

  it('Join button shows Leave when already joined', () => {
    const circle = buildCircle({ id: 'c1' })
    render(
      <CirclesScreen
        {...baseProps}
        selectedCircle={circle}
        joinedCircleIds={['c1']}
      />,
    )
    expect(screen.getByRole('button', { name: /Leave Circle/i })).toBeInTheDocument()
  })

  it('event RSVP button calls toggleCircleRsvp with event id', () => {
    const toggleCircleRsvp = vi.fn()
    const circle = buildCircle({
      events: [{ id: 'ev-99', title: 'Mixer', when: 'Sat 8pm', where: 'Studio' }],
    })
    render(
      <CirclesScreen
        {...baseProps}
        selectedCircle={circle}
        toggleCircleRsvp={toggleCircleRsvp}
      />,
    )
    // The RSVP button is the only one inside the event card with "RSVP" copy.
    fireEvent.click(screen.getByRole('button', { name: /^RSVP$/i }))
    expect(toggleCircleRsvp).toHaveBeenCalledWith('ev-99')
  })

  it('RSVP button shows confirmed state when circleRsvps[eventId] is true', () => {
    const circle = buildCircle({
      events: [{ id: 'ev-99', title: 'Mixer', when: 'Sat 8pm', where: 'Studio' }],
    })
    render(
      <CirclesScreen
        {...baseProps}
        selectedCircle={circle}
        circleRsvps={{ 'ev-99': true }}
      />,
    )
    expect(screen.getByRole('button', { name: /RSVP Saved/i })).toBeInTheDocument()
  })
})

describe('CirclesScreen — feed', () => {
  it('shows "no posts" placeholder when posts list is empty', () => {
    const circle = buildCircle()
    render(<CirclesScreen {...baseProps} selectedCircle={circle} selectedCirclePosts={[]} />)
    expect(screen.getByText(/No posts yet/i)).toBeInTheDocument()
  })

  it('renders posts with author + text', () => {
    const circle = buildCircle()
    const posts = [
      buildPost({ id: 'p1', author: 'Mira', text: 'Hello circle!' }),
      buildPost({ id: 'p2', author: 'Jordan', text: 'Welcome!' }),
    ]
    render(
      <CirclesScreen
        {...baseProps}
        selectedCircle={circle}
        selectedCirclePosts={posts}
      />,
    )
    expect(screen.getByText('Mira')).toBeInTheDocument()
    expect(screen.getByText('Hello circle!')).toBeInTheDocument()
    expect(screen.getByText('Jordan')).toBeInTheDocument()
    expect(screen.getByText('Welcome!')).toBeInTheDocument()
  })

  it('typing in the post textarea calls setCirclePostDraft', () => {
    const setCirclePostDraft = vi.fn()
    const circle = buildCircle()
    render(
      <CirclesScreen
        {...baseProps}
        selectedCircle={circle}
        setCirclePostDraft={setCirclePostDraft}
      />,
    )
    // textarea — find by role
    const textarea = screen.getByRole('textbox', { name: /share/i })
    fireEvent.change(textarea, { target: { value: 'Just joined!' } })
    expect(setCirclePostDraft).toHaveBeenCalledWith('Just joined!')
  })

  it('Publish button calls publishCirclePost', () => {
    const publishCirclePost = vi.fn()
    const circle = buildCircle()
    render(
      <CirclesScreen
        {...baseProps}
        selectedCircle={circle}
        publishCirclePost={publishCirclePost}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Publish/i }))
    expect(publishCirclePost).toHaveBeenCalled()
  })
})
