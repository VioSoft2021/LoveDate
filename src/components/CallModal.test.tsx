import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CallModal } from './CallModal'
import type { CallState } from '../domain'
import type { JitsiProviderConfig } from '../services/jitsiEmbedConfig'

// EmbeddedCallStage pulls in the Jitsi External API <script> at runtime,
// which jsdom can't load. Stub it to a single div so the surrounding
// CallModal layout is still testable.
vi.mock('./EmbeddedCallStage', () => ({
  EmbeddedCallStage: () => <div data-testid="embedded-call-stage" />,
}))

const baseProvider: JitsiProviderConfig = {
  domain: 'meet.jit.si',
  scriptUrl: 'https://meet.jit.si/external_api.js',
  jwt: '',
  needsModeratorAuth: false,
  setupMessage: null,
  formatRoomName: (id) => id,
  buildRoomUrl: (id) => `https://meet.jit.si/${id}`,
}

const baseCallState: CallState = {
  active: true,
  type: 'video',
  status: 'live',
  startedAt: Date.UTC(2026, 4, 20, 12, 0, 0),
  targetProfileId: 42,
  muted: false,
  cameraOff: false,
  roomId: 'room-abc',
  roomUrl: 'https://meet.jit.si/room-abc',
}

const baseProps = {
  callState: baseCallState,
  appLanguage: 'en' as const,
  videoCallLabel: 'Video Call',
  audioCallLabel: 'Audio Call',
  matchName: 'Riley',
  displayName: 'Alex',
  jitsiProvider: baseProvider,
  onConnected: vi.fn(),
  onEnded: vi.fn(),
  onFailed: vi.fn(),
  setMuted: vi.fn(),
  setCameraOff: vi.fn(),
  onCopyInvite: vi.fn(),
  onOpenRoom: vi.fn(),
}

describe('CallModal', () => {
  it('returns null when callState.active is false', () => {
    const { container } = render(
      <CallModal {...baseProps} callState={{ ...baseCallState, active: false }} />,
    )
    expect(container.querySelector('.match-modal')).toBeNull()
  })

  it('renders header with the match name + video call label', () => {
    render(<CallModal {...baseProps} />)
    expect(screen.getByText('Riley')).toBeInTheDocument()
    expect(screen.getByText('Video Call')).toBeInTheDocument()
  })

  it('uses the audio label for audio calls', () => {
    render(
      <CallModal {...baseProps} callState={{ ...baseCallState, type: 'audio' }} />,
    )
    expect(screen.getByText('Audio Call')).toBeInTheDocument()
  })

  it('shows the "Preparing" status during connecting', () => {
    render(
      <CallModal {...baseProps} callState={{ ...baseCallState, status: 'connecting' }} />,
    )
    expect(screen.getByText(/Preparing your private Privé room/i)).toBeInTheDocument()
  })

  it('shows the error status when the room failed', () => {
    render(
      <CallModal {...baseProps} callState={{ ...baseCallState, status: 'error' }} />,
    )
    expect(screen.getByText(/private room could not be prepared/i)).toBeInTheDocument()
  })

  it('renders the EmbeddedCallStage when type/roomId/roomUrl are all set', () => {
    render(<CallModal {...baseProps} />)
    expect(screen.getByTestId('embedded-call-stage')).toBeInTheDocument()
  })

  it('does NOT render the EmbeddedCallStage when roomUrl is null', () => {
    render(
      <CallModal
        {...baseProps}
        callState={{ ...baseCallState, roomUrl: null, roomId: null }}
      />,
    )
    expect(screen.queryByTestId('embedded-call-stage')).not.toBeInTheDocument()
  })

  it('Open Private Room calls onOpenRoom', () => {
    const onOpenRoom = vi.fn()
    render(<CallModal {...baseProps} onOpenRoom={onOpenRoom} />)
    fireEvent.click(screen.getByRole('button', { name: /Open Private Room/i }))
    expect(onOpenRoom).toHaveBeenCalled()
  })

  it('Copy Invite calls onCopyInvite', () => {
    const onCopyInvite = vi.fn()
    render(<CallModal {...baseProps} onCopyInvite={onCopyInvite} />)
    fireEvent.click(screen.getByRole('button', { name: /Copy Invite/i }))
    expect(onCopyInvite).toHaveBeenCalled()
  })

  it('End Call calls onEnded', () => {
    const onEnded = vi.fn()
    render(<CallModal {...baseProps} onEnded={onEnded} />)
    fireEvent.click(screen.getByRole('button', { name: /End Call/i }))
    expect(onEnded).toHaveBeenCalled()
  })

  it('disables Open + Copy buttons when roomUrl is null', () => {
    render(
      <CallModal {...baseProps} callState={{ ...baseCallState, roomUrl: null }} />,
    )
    expect(screen.getByRole('button', { name: /Open Private Room/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Copy Invite/i })).toBeDisabled()
  })

  it('renders Romanian copy for the End Call button', () => {
    render(<CallModal {...baseProps} appLanguage="ro" />)
    expect(screen.getByRole('button', { name: /Închide apelul/i })).toBeInTheDocument()
  })
})
