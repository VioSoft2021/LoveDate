import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsScreen, type SettingsScreenProps } from './SettingsScreen'
import type { SelfProfile } from '../domain'
import type { LikertAnswer } from '../services/compatibility'

const emptySelfProfile: SelfProfile = {
  name: 'Alex',
  age: 30,
  city: 'Bucharest',
  vibe: '',
  bio: '',
  interests: [],
  pronouns: '',
  gender: '',
  orientation: '',
  lookingFor: '',
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
  personalityAnswers: [3, 3, 3, 3, 3, 3, 3, 3] as LikertAnswer[],
}

const baseProps: SettingsScreenProps = {
  appLanguage: 'en',
  isGuest: false,
  setAppLanguage: vi.fn(),
  settings: { pushNotifications: true, emailNotifications: false },
  settingsSaveStatus: 'idle',
  preferenceSaveStatus: 'idle',
  handleSettingsToggle: vi.fn(),
  socialConnectedCount: 0,
  socialMotivationLine: '',
  unreadNotificationCount: 0,
  selfProfile: emptySelfProfile,
  toggleSocialPromotionOptIn: vi.fn(),
  setSocialConnectionDecision: vi.fn(),
  sharePriveOnPlatform: vi.fn(),
  activePlan: 'free',
  setActivePlan: vi.fn(),
  persistActivePlan: vi.fn(),
  refreshEngagementUsage: vi.fn(),
  likeUsage: { used: 3, limit: 15, remaining: 12 },
  superLikeUsage: { used: 1, limit: 3, remaining: 2 },
  boostsLeft: 1,
  rewindsLeft: 3,
  backendMode: 'supabase',
  notifications: [],
  markAllNotificationsRead: vi.fn(),
  blockedProfileIds: [],
  safetyReports: [],
  profileById: new Map(),
  isModerationAdmin: false,
  onOpenModeration: vi.fn(),
  onDeleteAccount: vi.fn().mockResolvedValue(true),
}

describe('SettingsScreen — rendering', () => {
  it('renders the Settings title', () => {
    render(<SettingsScreen {...baseProps} />)
    // The h1 in the hero card is the screen title.
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings.length).toBeGreaterThan(0)
  })

  it('renders push + email notification toggles reflecting settings', () => {
    const { container } = render(<SettingsScreen {...baseProps} />)
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    // First two checkboxes (Preferences) — push + email.
    expect(checkboxes[0].checked).toBe(true) // pushNotifications: true
    expect(checkboxes[1].checked).toBe(false) // emailNotifications: false
  })
})

describe('SettingsScreen — toggle handlers', () => {
  it('clicking push notifications calls handleSettingsToggle with pushNotifications + new value', () => {
    const handleSettingsToggle = vi.fn()
    const { container } = render(
      <SettingsScreen {...baseProps} handleSettingsToggle={handleSettingsToggle} />,
    )
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    fireEvent.click(checkboxes[0])
    // Was true, click toggles → false
    expect(handleSettingsToggle).toHaveBeenCalledWith('pushNotifications', false)
  })

  it('app language select change calls setAppLanguage', () => {
    // Re-enabled 2026-05-30 after the Romanian copy pass landed (the
    // picker was hidden 2026-05-26 during the English hard-lock).
    const setAppLanguage = vi.fn()
    render(<SettingsScreen {...baseProps} setAppLanguage={setAppLanguage} />)
    // The language label is the first select with EN/RO options
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'ro' } })
    expect(setAppLanguage).toHaveBeenCalledWith('ro')
  })
})

describe('SettingsScreen — Danger Zone account deletion', () => {
  it('shows the initial Delete-my-account button (not the confirm form)', () => {
    render(<SettingsScreen {...baseProps} />)
    expect(screen.getByRole('button', { name: /Delete my account/i })).toBeInTheDocument()
    // Confirm input is NOT in the DOM yet
    expect(screen.queryByText(/Type DELETE/i)).not.toBeInTheDocument()
  })

  it('clicking Delete reveals the confirm input + Cancel + Delete buttons', () => {
    render(<SettingsScreen {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/i }))
    // After click, the confirm form is shown
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    // The danger Delete button is still present (now in confirm form)
    const dangerButtons = screen
      .getAllByRole('button')
      .filter((b) => b.className.includes('danger'))
    expect(dangerButtons.length).toBeGreaterThan(0)
  })

  it('Delete button stays disabled until user types the confirm word', () => {
    const onDeleteAccount = vi.fn().mockResolvedValue(true)
    render(<SettingsScreen {...baseProps} onDeleteAccount={onDeleteAccount} />)
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/i }))

    const dangerButtons = screen
      .getAllByRole('button')
      .filter((b) => b.className.includes('danger'))
    const finalDelete = dangerButtons[dangerButtons.length - 1]
    expect(finalDelete).toBeDisabled()

    // Type the wrong word — still disabled
    const inputs = screen.getAllByRole('textbox')
    const confirmInput = inputs[inputs.length - 1]
    fireEvent.change(confirmInput, { target: { value: 'WRONG' } })
    expect(finalDelete).toBeDisabled()

    // Type the right word (case-insensitive — code uppercases input)
    fireEvent.change(confirmInput, { target: { value: 'delete' } })
    expect(finalDelete).not.toBeDisabled()
  })

  it('Cancel returns to the initial state', () => {
    render(<SettingsScreen {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/i }))
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    // Initial button back; confirm form gone.
    expect(screen.getByRole('button', { name: /Delete my account/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument()
  })

  it('confirmed delete calls onDeleteAccount; shows error on failure', async () => {
    const onDeleteAccount = vi.fn().mockResolvedValue(false)
    render(<SettingsScreen {...baseProps} onDeleteAccount={onDeleteAccount} />)
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/i }))
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[inputs.length - 1], { target: { value: 'DELETE' } })
    const dangerButtons = screen
      .getAllByRole('button')
      .filter((b) => b.className.includes('danger'))
    fireEvent.click(dangerButtons[dangerButtons.length - 1])

    await waitFor(() => {
      expect(onDeleteAccount).toHaveBeenCalled()
    })
    // Error path: the screen should show the failure copy
    await waitFor(() => {
      expect(screen.getByText(/Couldn't delete account/i)).toBeInTheDocument()
    })
  })
})

