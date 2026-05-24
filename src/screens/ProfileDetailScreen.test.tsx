import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProfileDetailScreen, type ProfileDetailScreenProps } from './ProfileDetailScreen'
import type { MatchAnalysis, SelfProfile } from '../domain'
import type { Profile } from '../services/priveApi'

const buildSelfProfile = (): SelfProfile => ({
  name: 'Alex',
  age: 30,
  city: 'Bucharest',
  vibe: 'builder',
  bio: 'I make things.',
  interests: ['coffee', 'design'],
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
  interests: ['coffee', 'design'],
  palette: ['#000', '#111'],
  photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
  gender: 'Woman',
  distanceKm: 3,
  verified: true,
  relationshipGoal: 'Long-term',
  zodiac: 'Aries',
  personalityAnswers: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
  ...overrides,
})

const baseProps: ProfileDetailScreenProps = {
  appLanguage: 'en',
  selectedDetailProfile: buildProfile(),
  selfProfile: buildSelfProfile(),
  selfPersonalityCode: 'CMFR',
  selectedDetailMatchAnalysis: null,
  selectedDetailChemistry: null,
  getCompatibilityScore: vi.fn().mockReturnValue(73),
  reportProfile: vi.fn(),
  blockProfile: vi.fn(),
  openLightbox: vi.fn(),
  closeProfileDetail: vi.fn(),
  onBackToDiscover: vi.fn(),
  isModerationAdmin: false,
  onToggleProfileActive: vi.fn(),
}

describe('ProfileDetailScreen — empty state', () => {
  it('renders the "Profile was not found" panel when selection is null', () => {
    render(
      <ProfileDetailScreen
        {...baseProps}
        selectedDetailProfile={null}
      />,
    )
    expect(screen.getByText(/Profile was not found/i)).toBeInTheDocument()
  })

  it('empty-state Back button fires onBackToDiscover', () => {
    const onBackToDiscover = vi.fn()
    render(
      <ProfileDetailScreen
        {...baseProps}
        selectedDetailProfile={null}
        onBackToDiscover={onBackToDiscover}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /back to discover/i }))
    expect(onBackToDiscover).toHaveBeenCalled()
  })
})

describe('ProfileDetailScreen — rendering the selected profile', () => {
  it('renders name + age', () => {
    render(<ProfileDetailScreen {...baseProps} />)
    expect(screen.getByText('Riley, 28')).toBeInTheDocument()
  })

  it('falls back to getCompatibilityScore when matchAnalysis is null', () => {
    const getCompatibilityScore = vi.fn().mockReturnValue(73)
    render(
      <ProfileDetailScreen
        {...baseProps}
        selectedDetailMatchAnalysis={null}
        getCompatibilityScore={getCompatibilityScore}
      />,
    )
    expect(getCompatibilityScore).toHaveBeenCalled()
    expect(screen.getByText(/73%/)).toBeInTheDocument()
  })

  it('uses matchAnalysis.score when provided (overrides fallback)', () => {
    const analysis: MatchAnalysis = {
      score: 88,
      personalityScore: 75,
      pairCode: 'CMFR x ABCD',
      sharedInterests: ['coffee'],
      intentAligned: true,
      zodiacAligned: true,
      ageGap: 2,
      reasons: ['shared coffee'],
      caution: null,
    }
    render(
      <ProfileDetailScreen {...baseProps} selectedDetailMatchAnalysis={analysis} />,
    )
    expect(screen.getByText(/88%/)).toBeInTheDocument()
    expect(screen.getByText(/CMFR x ABCD/)).toBeInTheDocument()
  })

  it('renders bio + vibe + city + gender + distance', () => {
    render(<ProfileDetailScreen {...baseProps} />)
    expect(screen.getByText('curious')).toBeInTheDocument()
    expect(screen.getByText('designer and runner')).toBeInTheDocument()
    // Combined info line with separators
    expect(screen.getByText(/Bucharest/)).toBeInTheDocument()
    expect(screen.getByText(/3 km/)).toBeInTheDocument()
  })

  it('renders reasons list when matchAnalysis provides them', () => {
    const analysis: MatchAnalysis = {
      score: 75,
      personalityScore: 80,
      pairCode: 'CMFR x ABCD',
      sharedInterests: ['coffee'],
      intentAligned: true,
      zodiacAligned: false,
      ageGap: 2,
      reasons: ['both into coffee', 'aligned on long-term'],
      caution: null,
    }
    render(<ProfileDetailScreen {...baseProps} selectedDetailMatchAnalysis={analysis} />)
    expect(screen.getByText('both into coffee')).toBeInTheDocument()
    expect(screen.getByText('aligned on long-term')).toBeInTheDocument()
  })

  it('renders caution note when present', () => {
    const analysis: MatchAnalysis = {
      score: 40,
      personalityScore: 50,
      pairCode: 'CMFR x DSOA',
      sharedInterests: [],
      intentAligned: false,
      zodiacAligned: false,
      ageGap: 10,
      reasons: ['mostly different'],
      caution: 'Intent and personality both off — proceed slowly.',
    }
    render(<ProfileDetailScreen {...baseProps} selectedDetailMatchAnalysis={analysis} />)
    expect(screen.getByText(/proceed slowly/i)).toBeInTheDocument()
  })
})

describe('ProfileDetailScreen — handlers', () => {
  it('Back button fires closeProfileDetail', () => {
    const closeProfileDetail = vi.fn()
    render(
      <ProfileDetailScreen
        {...baseProps}
        closeProfileDetail={closeProfileDetail}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^← Back$/ }))
    expect(closeProfileDetail).toHaveBeenCalled()
  })

  it('Report profile button calls reportProfile with the selected profile', () => {
    const reportProfile = vi.fn()
    const profile = buildProfile({ id: 999 })
    render(
      <ProfileDetailScreen
        {...baseProps}
        selectedDetailProfile={profile}
        reportProfile={reportProfile}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /report profile/i }))
    expect(reportProfile).toHaveBeenCalledWith(profile)
  })

  it('Block profile button calls blockProfile with the selected profile', () => {
    const blockProfile = vi.fn()
    const profile = buildProfile({ id: 999 })
    render(
      <ProfileDetailScreen
        {...baseProps}
        selectedDetailProfile={profile}
        blockProfile={blockProfile}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /block profile/i }))
    expect(blockProfile).toHaveBeenCalledWith(profile)
  })

  it('clicking a photo opens the lightbox with the photo URL', () => {
    const openLightbox = vi.fn()
    const profile = buildProfile({
      photos: ['https://example.com/x.jpg', 'https://example.com/y.jpg'],
    })
    render(
      <ProfileDetailScreen
        {...baseProps}
        selectedDetailProfile={profile}
        openLightbox={openLightbox}
      />,
    )
    // photo-button uses an img inside; we can grab by alt text.
    const firstPhoto = screen.getByAltText('Riley photo 1')
    fireEvent.click(firstPhoto)
    expect(openLightbox).toHaveBeenCalledWith('https://example.com/x.jpg')
  })
})

describe('ProfileDetailScreen — Romanian copy', () => {
  it('shows RO labels when appLanguage="ro"', () => {
    render(<ProfileDetailScreen {...baseProps} appLanguage="ro" />)
    expect(screen.getByRole('button', { name: /Înapoi/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Raportează profilul/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Blochează profilul/i })).toBeInTheDocument()
  })
})
