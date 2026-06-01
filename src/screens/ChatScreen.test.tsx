import React from 'react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatScreen, type ChatScreenProps } from './ChatScreen'
import type { ChatMessage } from '../domain'
import type { Profile } from '../services/priveApi'

// jsdom doesn't ship matchMedia. ChatScreen reads it on mount for the
// phone/desktop layout split, so polyfill it to a permissive stub that
// always reports desktop (no media query matches).
beforeAll(() => {
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }
})

const buildProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 100,
  authUserId: 'auth-100',
  name: 'Riley',
  age: 28,
  city: 'Bucharest',
  vibe: 'curious',
  bio: 'designer',
  interests: ['coffee'],
  palette: ['#000', '#111'],
  photos: ['https://example.com/a.jpg'],
  gender: 'Woman',
  distanceKm: 3,
  verified: true,
  relationshipGoal: 'Long-term',
  zodiac: 'Aries',
  ...overrides,
})

const baseProps: ChatScreenProps = {
  appLanguage: 'en',
  selfLovePersonality: null,
  chatSearch: '',
  setChatSearch: vi.fn(),
  filteredChatPreviews: [],
  activeChatId: null,
  setActiveChatId: vi.fn(),
  selectedChatProfile: null,
  selectedChatChemistry: null,
  selectedChatBigFive: null,
  selectedChatAttachment: null,
  selectedChatMessages: [],
  hiddenChatMessageCount: 0,
  revealOlderMessages: vi.fn(),
  messagesContainerRef: React.createRef<HTMLDivElement>(),
  handleMessagesScroll: vi.fn(),
  aiCoachSuggestions: [],
  aiCoachLoading: false,
  generateAiCoachSuggestions: vi.fn(),
  clearAiCoachSuggestions: vi.fn(),
  aiDatePlans: [],
  aiDatePlannerLoading: false,
  generateAiDatePlans: vi.fn(),
  clearAiDatePlans: vi.fn(),
  chatDraft: '',
  setChatDraft: vi.fn(),
  chatAttachmentDraft: null,
  setChatAttachmentDraft: vi.fn(),
  attachmentInputRef: React.createRef<HTMLInputElement>(),
  handleAttachmentPick: vi.fn(),
  isRecordingVoice: false,
  startVoiceRecording: vi.fn(),
  sendChatMessage: vi.fn(),
  openProfileDetail: vi.fn(),
  onStartCall: vi.fn(),
  callsEnabled: true,
}

describe('ChatScreen — list panel (no active chat)', () => {
  it('renders the search input + empty state in the thread pane', () => {
    render(<ChatScreen {...baseProps} />)
    // Search input has aria-label from copy.chats.searchPlaceholder
    const searchInputs = screen.getAllByRole('textbox')
    expect(searchInputs.length).toBeGreaterThan(0)
    // No active chat → state-box with "select a match" copy
    expect(screen.getByText(/Select a match/i)).toBeInTheDocument()
  })

  it('typing in search calls setChatSearch', () => {
    const setChatSearch = vi.fn()
    render(<ChatScreen {...baseProps} setChatSearch={setChatSearch} />)
    const searchInputs = screen.getAllByRole('textbox')
    fireEvent.change(searchInputs[0], { target: { value: 'riley' } })
    expect(setChatSearch).toHaveBeenCalledWith('riley')
  })

  it('renders one button per chat preview', () => {
    const profile1 = buildProfile({ id: 1, name: 'Mira' })
    const profile2 = buildProfile({ id: 2, name: 'Jordan' })
    render(
      <ChatScreen
        {...baseProps}
        filteredChatPreviews={[
          { profile: profile1, lastText: 'hey', lastTime: '12:00', unread: 0 },
          { profile: profile2, lastText: 'yo', lastTime: '11:30', unread: 2 },
        ]}
      />,
    )
    expect(screen.getByText('Mira')).toBeInTheDocument()
    expect(screen.getByText('Jordan')).toBeInTheDocument()
    // Unread badge for Jordan
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('clicking a chat in list calls setActiveChatId with the profile id', () => {
    const setActiveChatId = vi.fn()
    const profile = buildProfile({ id: 42, name: 'Mira' })
    render(
      <ChatScreen
        {...baseProps}
        filteredChatPreviews={[
          { profile, lastText: 'hey', lastTime: '12:00', unread: 0 },
        ]}
        setActiveChatId={setActiveChatId}
      />,
    )
    fireEvent.click(screen.getByText('Mira'))
    expect(setActiveChatId).toHaveBeenCalledWith(42)
  })
})

describe('ChatScreen — active chat thread', () => {
  it('renders the chat header with the active profile name', () => {
    const profile = buildProfile({ name: 'Riley' })
    render(
      <ChatScreen
        {...baseProps}
        activeChatId={profile.id}
        selectedChatProfile={profile}
      />,
    )
    // Header h2 has the name
    expect(screen.getByRole('heading', { level: 2, name: 'Riley' })).toBeInTheDocument()
  })

  it('Back button calls setActiveChatId(null)', () => {
    const setActiveChatId = vi.fn()
    const profile = buildProfile()
    render(
      <ChatScreen
        {...baseProps}
        activeChatId={profile.id}
        selectedChatProfile={profile}
        setActiveChatId={setActiveChatId}
      />,
    )
    fireEvent.click(screen.getByLabelText('Back to chats'))
    expect(setActiveChatId).toHaveBeenCalledWith(null)
  })

  it('typing in composer calls setChatDraft', () => {
    const setChatDraft = vi.fn()
    const profile = buildProfile()
    render(
      <ChatScreen
        {...baseProps}
        activeChatId={profile.id}
        selectedChatProfile={profile}
        setChatDraft={setChatDraft}
      />,
    )
    // The composer textbox has an aria-label of "Type message..."
    const composer = screen.getByPlaceholderText(/Type a message|Scrie un mesaj/i)
    fireEvent.change(composer, { target: { value: 'hello' } })
    expect(setChatDraft).toHaveBeenCalledWith('hello')
  })

  it('submitting the composer form fires sendChatMessage', () => {
    const sendChatMessage = vi.fn()
    const profile = buildProfile()
    const { container } = render(
      <ChatScreen
        {...baseProps}
        activeChatId={profile.id}
        selectedChatProfile={profile}
        sendChatMessage={sendChatMessage}
      />,
    )
    const form = container.querySelector('form.chat-input')
    expect(form).not.toBeNull()
    fireEvent.submit(form!)
    expect(sendChatMessage).toHaveBeenCalled()
  })
})

describe('ChatScreen — AI Coach panel', () => {
  it('Generate Suggestions button calls generateAiCoachSuggestions', () => {
    const generateAiCoachSuggestions = vi.fn()
    const profile = buildProfile()
    render(
      <ChatScreen
        {...baseProps}
        activeChatId={profile.id}
        selectedChatProfile={profile}
        generateAiCoachSuggestions={generateAiCoachSuggestions}
      />,
    )
    // Find the generate button — it has the copy.chats.generateSuggestions
    // label.  Find by text containing "Suggest" (EN copy) — first match.
    const btn = screen
      .getAllByRole('button')
      .find((b) => /suggest/i.test(b.textContent || ''))
    expect(btn).toBeDefined()
    fireEvent.click(btn!)
    expect(generateAiCoachSuggestions).toHaveBeenCalled()
  })

  it('Generate button is disabled while aiCoachLoading=true', () => {
    const profile = buildProfile()
    render(
      <ChatScreen
        {...baseProps}
        activeChatId={profile.id}
        selectedChatProfile={profile}
        aiCoachLoading={true}
      />,
    )
    const loadingBtn = screen
      .getAllByRole('button')
      .find((b) => /thinking/i.test(b.textContent || ''))
    expect(loadingBtn).toBeDefined()
    expect(loadingBtn).toBeDisabled()
  })

  it('renders one suggestion button per aiCoachSuggestions entry', () => {
    const profile = buildProfile()
    render(
      <ChatScreen
        {...baseProps}
        activeChatId={profile.id}
        selectedChatProfile={profile}
        aiCoachSuggestions={['Talk about coffee', 'Ask about design']}
      />,
    )
    expect(screen.getByText('Talk about coffee')).toBeInTheDocument()
    expect(screen.getByText('Ask about design')).toBeInTheDocument()
  })
})

describe('ChatScreen — messages render', () => {
  it('renders message text for each entry', () => {
    const profile = buildProfile()
    const messages: ChatMessage[] = [
      { id: 1, sender: 'me', text: 'hello there', createdAt: Date.now(), status: 'sent' },
      { id: 2, sender: 'them', text: 'general kenobi', createdAt: Date.now(), status: 'read' },
    ]
    render(
      <ChatScreen
        {...baseProps}
        activeChatId={profile.id}
        selectedChatProfile={profile}
        selectedChatMessages={messages}
      />,
    )
    expect(screen.getByText('hello there')).toBeInTheDocument()
    expect(screen.getByText('general kenobi')).toBeInTheDocument()
  })

  it('shows "Reveal older messages" button when hiddenChatMessageCount > 0', () => {
    const profile = buildProfile()
    render(
      <ChatScreen
        {...baseProps}
        activeChatId={profile.id}
        selectedChatProfile={profile}
        hiddenChatMessageCount={5}
      />,
    )
    // The reveal button copy contains "5" + "older"
    const revealBtn = screen
      .getAllByRole('button')
      .find((b) => /5/.test(b.textContent || '') && /older|history|anterior/i.test(b.textContent || ''))
    expect(revealBtn).toBeDefined()
  })
})

describe('ChatScreen — attachment preview', () => {
  it('shows preview row when chatAttachmentDraft is set; Remove clears it', () => {
    const setChatAttachmentDraft = vi.fn()
    const profile = buildProfile()
    render(
      <ChatScreen
        {...baseProps}
        activeChatId={profile.id}
        selectedChatProfile={profile}
        chatAttachmentDraft={{
          kind: 'image',
          name: 'sunset.jpg',
          url: 'data:image/jpeg;base64,xxx',
        }}
        setChatAttachmentDraft={setChatAttachmentDraft}
      />,
    )
    expect(screen.getByText('sunset.jpg')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }))
    expect(setChatAttachmentDraft).toHaveBeenCalledWith(null)
  })
})

describe('ChatScreen — header overflow menu (2026-06-01)', () => {
  const menuProfile = buildProfile({ id: 7, name: 'Mira' })
  const activeProps: ChatScreenProps = {
    ...baseProps,
    activeChatId: 7,
    selectedChatProfile: menuProfile,
  }

  it('keeps the menu (and its call actions) closed until the ⋮ button is clicked', () => {
    render(<ChatScreen {...activeProps} />)
    expect(screen.queryByRole('menuitem', { name: /audio call/i })).toBeNull()
  })

  it('opens the menu and starts an audio call', () => {
    const onStartCall = vi.fn()
    render(<ChatScreen {...activeProps} onStartCall={onStartCall} />)
    fireEvent.click(screen.getByRole('button', { name: /more options/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /audio call/i }))
    expect(onStartCall).toHaveBeenCalledWith('audio')
  })

  it('starts a video call from the menu', () => {
    const onStartCall = vi.fn()
    render(<ChatScreen {...activeProps} onStartCall={onStartCall} />)
    fireEvent.click(screen.getByRole('button', { name: /more options/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /video call/i }))
    expect(onStartCall).toHaveBeenCalledWith('video')
  })

  it('opens the full profile from the menu', () => {
    const openProfileDetail = vi.fn()
    render(<ChatScreen {...activeProps} openProfileDetail={openProfileDetail} />)
    fireEvent.click(screen.getByRole('button', { name: /more options/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /view full profile/i }))
    expect(openProfileDetail).toHaveBeenCalledWith(7, 'chats')
  })

  it('hides the call actions when callsEnabled is false (keeps View profile)', () => {
    render(<ChatScreen {...activeProps} callsEnabled={false} />)
    fireEvent.click(screen.getByRole('button', { name: /more options/i }))
    expect(screen.getByRole('menuitem', { name: /view full profile/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /audio call/i })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /video call/i })).toBeNull()
  })
})
