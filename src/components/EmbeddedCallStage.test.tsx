import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { EmbeddedCallStage } from './EmbeddedCallStage'

// Smoke tests for the Jitsi-embedded call stage.
// We don't load the real Jitsi external API in jsdom — we stub
// window.JitsiMeetExternalAPI with a tiny constructor that captures
// the listeners the component registers and lets tests fire them back.
// Goal: "does the component mount and wire up correctly?", not "does
// Jitsi work?" (the latter is verified by hand in the running app).

type RecordedListener = (event?: Record<string, unknown>) => void

class FakeJitsiApi {
  static lastInstance: FakeJitsiApi | null = null
  listeners: Map<string, RecordedListener> = new Map()
  disposed = false

  constructor() {
    FakeJitsiApi.lastInstance = this
  }

  addListener(eventName: string, listener: RecordedListener) {
    this.listeners.set(eventName, listener)
  }

  executeCommand(_command: string) {
    // no-op for tests
    void _command
  }

  dispose() {
    this.disposed = true
  }

  fire(eventName: string, event?: Record<string, unknown>) {
    this.listeners.get(eventName)?.(event)
  }
}

const baseProps = (overrides: Record<string, unknown> = {}) => ({
  callType: 'video' as const,
  domain: 'meet.example.com',
  scriptUrl: 'https://meet.example.com/external_api.js',
  jwt: 'test-jwt',
  setupMessage: null,
  roomId: 'room-1',
  roomUrl: 'https://meet.example.com/room-1',
  // Distinct from the EN "You" label so getByText assertions stay unambiguous.
  displayName: 'TestSelf',
  matchName: 'TestMatch',
  startedAtLabel: '12:00',
  muted: false,
  cameraOff: false,
  language: 'en' as const,
  onConnected: vi.fn(),
  onEnded: vi.fn(),
  onFailed: vi.fn(),
  onMuteChange: vi.fn(),
  onCameraChange: vi.fn(),
  onCopyInvite: vi.fn(),
  onOpenFallback: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  FakeJitsiApi.lastInstance = null
  ;(window as unknown as { JitsiMeetExternalAPI: typeof FakeJitsiApi }).JitsiMeetExternalAPI =
    FakeJitsiApi
})

afterEach(() => {
  delete (window as { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI
})

describe('<EmbeddedCallStage />', () => {
  it('mounts with the match name + display name in the chrome', async () => {
    render(<EmbeddedCallStage {...baseProps()} />)
    expect(await screen.findByText('TestMatch')).toBeTruthy()
    expect(screen.getByText('TestSelf')).toBeTruthy()
  })

  it('instantiates Jitsi on mount and flips onConnected when joined', async () => {
    const props = baseProps()
    render(<EmbeddedCallStage {...props} />)

    await waitFor(() => {
      expect(FakeJitsiApi.lastInstance).not.toBeNull()
    })

    await act(async () => {
      FakeJitsiApi.lastInstance!.fire('videoConferenceJoined')
    })
    expect(props.onConnected).toHaveBeenCalled()
  })

  it('skips Jitsi and goes straight to the fallback when setupMessage is provided', async () => {
    const props = baseProps({ setupMessage: 'configure your camera' })
    render(<EmbeddedCallStage {...props} />)
    // setupMessage path renders the failure state immediately + invokes onFailed.
    await waitFor(() => {
      expect(props.onFailed).toHaveBeenCalled()
    })
    // The component renders the fallback button in two places when in
    // the failed state (loading panel + footer); we just care that AT
    // LEAST one is visible.
    expect(screen.getAllByRole('button', { name: /Open in browser/i }).length).toBeGreaterThan(0)
    expect(FakeJitsiApi.lastInstance).toBeNull()
  })

  it('disposes the Jitsi instance on unmount', async () => {
    const { unmount } = render(<EmbeddedCallStage {...baseProps()} />)
    await waitFor(() => {
      expect(FakeJitsiApi.lastInstance).not.toBeNull()
    })
    const api = FakeJitsiApi.lastInstance!
    unmount()
    expect(api.disposed).toBe(true)
  })
})
