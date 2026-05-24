import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiscoverScreen, type DiscoverScreenProps } from './DiscoverScreen'
import type { SelfProfile } from '../domain'
import type { Profile } from '../services/priveApi'

const buildSelfProfile = (): SelfProfile => ({
  name: 'Alex',
  age: 30,
  city: 'Bucharest',
  vibe: 'builder',
  bio: '',
  interests: [],
  pronouns: '',
  gender: 'Non-binary',
  orientation: '',
  lookingFor: 'Long-term',
  relationshipIntent: '',
  heightCm: 170,
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
  zodiac: 'Leo',
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
  personalityAnswers: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
})

const buildProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 100,
  authUserId: 'auth-100',
  name: 'Riley',
  age: 28,
  city: 'Bucharest',
  vibe: 'curious',
  bio: 'designer and runner',
  interests: ['coffee'],
  palette: ['#000', '#111'],
  photos: ['https://example.com/a.jpg'],
  gender: 'Woman',
  distanceKm: 3,
  verified: true,
  relationshipGoal: 'Long-term',
  zodiac: 'Aries',
  personalityAnswers: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
  ...overrides,
})

const baseProps: DiscoverScreenProps = {
  appLanguage: 'en',
  selfProfile: buildSelfProfile(),
  filteredProfiles: [buildProfile()],
  matchedProfiles: [],
  topProfile: buildProfile(),
  upcoming: [],
  topProfileMatchAnalysis: null,
  topProfileChemistry: null,
  likeUsage: { used: 3, limit: 15, remaining: 12 },
  superLikeUsage: { used: 1, limit: 3, remaining: 2 },
  boostsLeft: 1,
  setBoostsLeft: vi.fn(),
  loadingProfiles: false,
  loadError: null,
  showingNoResults: false,
  showingDeckCompletion: false,
  loadProfiles: vi.fn(),
  isDragging: false,
  isResolvingSwipe: false,
  likeLimitReached: false,
  superLikeLimitReached: false,
  lastIntent: null,
  rightBadgeOpacity: 0,
  leftBadgeOpacity: 0,
  swipeCard: vi.fn(),
  handlePointerDown: vi.fn(),
  handlePointerMove: vi.fn(),
  handlePointerUp: vi.fn(),
  handlePointerCancel: vi.fn(),
  getCardStyle: vi.fn().mockReturnValue({}),
  getDiscoverCardBackground: vi.fn().mockReturnValue('#141937'),
  getCompatibilityScore: vi.fn().mockReturnValue(80),
  setFilters: vi.fn(),
  setIndex: vi.fn(),
  setHistory: vi.fn(),
  setSwipeLog: vi.fn(),
  setChatThreads: vi.fn(),
  setUnreadChats: vi.fn(),
  setMatchQueueIds: vi.fn(),
  setActiveChatId: vi.fn(),
  setBlockedProfileIds: vi.fn(),
  hiddenBreakdown: [],
  navigate: vi.fn(),
  openProfileDetail: vi.fn(),
  pushToast: vi.fn(),
  pushNotification: vi.fn(),
}

describe('DiscoverScreen — KPI tiles', () => {
  it('shows deck count, matches count, likes-left, super-likes-left', () => {
    const { container } = render(
      <DiscoverScreen
        {...baseProps}
        filteredProfiles={[buildProfile({ id: 1 }), buildProfile({ id: 2 })]}
        matchedProfiles={[buildProfile({ id: 3 })]}
        likeUsage={{ used: 3, limit: 15, remaining: 12 }}
        superLikeUsage={{ used: 1, limit: 3, remaining: 2 }}
      />,
    )
    const kpiValues = Array.from(
      container.querySelectorAll<HTMLElement>('.discover-kpi-value'),
    ).map((el) => el.textContent || '')
    // [deck=2, matches=1, likes-left=15-3=12, super-likes-left=3-1=2]
    expect(kpiValues).toEqual(['2', '1', '12', '2'])
  })

  it('renders ∞ when the like limit is null (unlimited plan)', () => {
    render(
      <DiscoverScreen
        {...baseProps}
        likeUsage={{ used: 50, limit: null, remaining: null }}
      />,
    )
    // ∞ shows for unlimited tier
    expect(screen.getAllByText('∞').length).toBeGreaterThan(0)
  })
})

describe('DiscoverScreen — metric controls (filters, boost, reset)', () => {
  it('Open Filters button calls navigate("filters")', () => {
    const navigate = vi.fn()
    render(<DiscoverScreen {...baseProps} navigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: /filters/i }))
    expect(navigate).toHaveBeenCalledWith('filters')
  })

  it('Reset button calls setFilters with initialFilters', () => {
    const setFilters = vi.fn()
    render(<DiscoverScreen {...baseProps} setFilters={setFilters} />)
    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
    expect(setFilters).toHaveBeenCalled()
  })

  it('Boost button with boosts available decrements counter + pushes toast', () => {
    const setBoostsLeft = vi.fn()
    const pushToast = vi.fn()
    const pushNotification = vi.fn()
    const setIndex = vi.fn()
    render(
      <DiscoverScreen
        {...baseProps}
        boostsLeft={1}
        setBoostsLeft={setBoostsLeft}
        pushToast={pushToast}
        pushNotification={pushNotification}
        setIndex={setIndex}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /boost/i }))
    expect(setBoostsLeft).toHaveBeenCalled()
    expect(setIndex).toHaveBeenCalledWith(0)
    expect(pushToast).toHaveBeenCalledWith(expect.stringMatching(/boost activated/i), 'success')
    expect(pushNotification).toHaveBeenCalled()
  })

  it('Boost button with no boosts shows error toast + does NOT decrement', () => {
    const setBoostsLeft = vi.fn()
    const pushToast = vi.fn()
    render(
      <DiscoverScreen
        {...baseProps}
        boostsLeft={0}
        setBoostsLeft={setBoostsLeft}
        pushToast={pushToast}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /boost/i }))
    expect(setBoostsLeft).not.toHaveBeenCalled()
    expect(pushToast).toHaveBeenCalledWith(expect.stringMatching(/no boosts/i), 'error')
  })
})

describe('DiscoverScreen — load state', () => {
  it('shows loading state when loadingProfiles=true', () => {
    render(<DiscoverScreen {...baseProps} loadingProfiles={true} topProfile={null} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error + Retry button when loadError set', () => {
    const loadProfiles = vi.fn()
    render(
      <DiscoverScreen
        {...baseProps}
        loadError="Network failed"
        topProfile={null}
        loadProfiles={loadProfiles}
      />,
    )
    expect(screen.getByText('Network failed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(loadProfiles).toHaveBeenCalled()
  })

  it('shows no-results state with Reset Filters + Reset Swipe History buttons', () => {
    const setFilters = vi.fn()
    const setHistory = vi.fn()
    const setSwipeLog = vi.fn()
    const setIndex = vi.fn()
    render(
      <DiscoverScreen
        {...baseProps}
        showingNoResults={true}
        topProfile={null}
        setFilters={setFilters}
        setHistory={setHistory}
        setSwipeLog={setSwipeLog}
        setIndex={setIndex}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /reset filters/i }))
    expect(setFilters).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /reset swipe history/i }))
    expect(setHistory).toHaveBeenCalledWith({ likedIds: [], passedIds: [], matchIds: [] })
    expect(setSwipeLog).toHaveBeenCalledWith([])
    expect(setIndex).toHaveBeenCalledWith(0)
  })
})

describe('DiscoverScreen — swipe action buttons', () => {
  it('Pass button calls swipeCard("left")', () => {
    const swipeCard = vi.fn()
    render(<DiscoverScreen {...baseProps} swipeCard={swipeCard} />)
    fireEvent.click(screen.getByRole('button', { name: /^pass$/i }))
    expect(swipeCard).toHaveBeenCalledWith('left')
  })

  it('Like button calls swipeCard("right")', () => {
    const swipeCard = vi.fn()
    render(<DiscoverScreen {...baseProps} swipeCard={swipeCard} />)
    fireEvent.click(screen.getByRole('button', { name: /^like$/i }))
    expect(swipeCard).toHaveBeenCalledWith('right')
  })

  it('Super Like button calls swipeCard("right", "super-like")', () => {
    const swipeCard = vi.fn()
    render(<DiscoverScreen {...baseProps} swipeCard={swipeCard} />)
    fireEvent.click(screen.getByRole('button', { name: /super like/i }))
    expect(swipeCard).toHaveBeenCalledWith('right', 'super-like')
  })

  it('Like button is disabled when likeLimitReached', () => {
    render(<DiscoverScreen {...baseProps} likeLimitReached={true} />)
    expect(screen.getByRole('button', { name: /^like$/i })).toBeDisabled()
  })

  it('Super Like button is disabled when superLikeLimitReached', () => {
    render(<DiscoverScreen {...baseProps} superLikeLimitReached={true} />)
    expect(screen.getByRole('button', { name: /super like/i })).toBeDisabled()
  })

  it('All swipe buttons disabled while isResolvingSwipe', () => {
    render(<DiscoverScreen {...baseProps} isResolvingSwipe={true} />)
    expect(screen.getByRole('button', { name: /^pass$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^like$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /super like/i })).toBeDisabled()
  })
})

describe('DiscoverScreen — View full profile + deck completion', () => {
  it('clicking View Full Profile calls openProfileDetail with id + "discover"', () => {
    const openProfileDetail = vi.fn()
    const profile = buildProfile({ id: 77 })
    render(
      <DiscoverScreen
        {...baseProps}
        topProfile={profile}
        openProfileDetail={openProfileDetail}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /view full profile/i }))
    expect(openProfileDetail).toHaveBeenCalledWith(77, 'discover')
  })

  it('Deck completion: Start Again calls setIndex(0)', () => {
    const setIndex = vi.fn()
    render(
      <DiscoverScreen
        {...baseProps}
        showingDeckCompletion={true}
        topProfile={null}
        setIndex={setIndex}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /start again/i }))
    expect(setIndex).toHaveBeenCalledWith(0)
  })

  it('Deck completion: Clear History resets all four collections + index', () => {
    const setHistory = vi.fn()
    const setSwipeLog = vi.fn()
    const setChatThreads = vi.fn()
    const setUnreadChats = vi.fn()
    const setMatchQueueIds = vi.fn()
    const setActiveChatId = vi.fn()
    const setIndex = vi.fn()
    render(
      <DiscoverScreen
        {...baseProps}
        showingDeckCompletion={true}
        topProfile={null}
        setHistory={setHistory}
        setSwipeLog={setSwipeLog}
        setChatThreads={setChatThreads}
        setUnreadChats={setUnreadChats}
        setMatchQueueIds={setMatchQueueIds}
        setActiveChatId={setActiveChatId}
        setIndex={setIndex}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /clear history/i }))
    expect(setHistory).toHaveBeenCalledWith({ likedIds: [], passedIds: [], matchIds: [] })
    expect(setSwipeLog).toHaveBeenCalledWith([])
    expect(setChatThreads).toHaveBeenCalledWith({})
    expect(setUnreadChats).toHaveBeenCalledWith({})
    expect(setMatchQueueIds).toHaveBeenCalledWith([])
    expect(setActiveChatId).toHaveBeenCalledWith(null)
    expect(setIndex).toHaveBeenCalledWith(0)
  })
})
