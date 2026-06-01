// src/components/dev/WebRtcTestHarness.tsx
//
// DEV-ONLY. Verifies the free P2P call core (services/webrtc/*) between two
// real browsers over Supabase Realtime. Open two tabs:
//   /?harness=webrtc&room=t1&role=caller
//   /?harness=webrtc&room=t1&role=callee
// Tree-shaken out of production (gated by import.meta.env.DEV in main.tsx).
import { useEffect, useRef, useState } from 'react'
import { createCallSession, type CallSessionState } from '../../services/webrtc/callSession'
import { createSupabaseSignaling } from '../../services/webrtc/signaling'

export default function WebRtcTestHarness() {
  const params = new URLSearchParams(window.location.search)
  const room = params.get('room') ?? 'harness-room'
  const role = params.get('role') === 'callee' ? 'callee' : 'caller'
  const withVideo = params.get('video') === '1'

  const [state, setState] = useState<CallSessionState | 'init'>('init')
  const [remoteReceived, setRemoteReceived] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const localRef = useRef<HTMLVideoElement | null>(null)
  const remoteRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const session = createCallSession({
      selfId: role,
      isInitiator: role === 'caller',
      withVideo,
      createTransport: createSupabaseSignaling(room, role),
      onState: setState,
      onLocalStream: (stream) => {
        if (localRef.current) localRef.current.srcObject = stream
      },
      onRemoteStream: (stream) => {
        setRemoteReceived(stream.getTracks().length > 0)
        if (remoteRef.current) remoteRef.current.srcObject = stream
      },
      onError: (err) => setError(err.message),
    })
    void session.start()
    return () => session.hangup()
  }, [room, role, withVideo])

  return (
    <div
      style={{
        padding: 24,
        fontFamily: 'monospace',
        color: '#e8f2ff',
        background: '#0e1534',
        minHeight: '100vh',
      }}
    >
      <h1>WebRTC P2P harness</h1>
      <p>
        room=<b>{room}</b> · role=<b>{role}</b> · video=<b>{String(withVideo)}</b>
      </p>
      <p>
        state: <b data-testid="state">{state}</b>
      </p>
      <p>
        remote stream: <b data-testid="remote">{remoteReceived ? 'received' : 'none'}</b>
      </p>
      <p>
        error: <b data-testid="error">{error ?? 'none'}</b>
      </p>
      <video
        data-testid="local"
        ref={localRef}
        autoPlay
        muted
        playsInline
        style={{ width: 220, background: '#000', marginRight: 12 }}
      />
      <video
        data-testid="remote-video"
        ref={remoteRef}
        autoPlay
        playsInline
        style={{ width: 220, background: '#000' }}
      />
    </div>
  )
}
