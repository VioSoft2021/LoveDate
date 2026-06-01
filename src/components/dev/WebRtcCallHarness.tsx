// src/components/dev/WebRtcCallHarness.tsx
//
// DEV-ONLY. Proves the FULL Phase 2 call stack (useWebRtcCalls + callInvites +
// signaling + CallSession + WebRtcCallModal) between two real browsers, without
// app auth — selfId is injected via debugSelfId. Open two tabs:
//   /?harness=webrtc-call&selfId=A&peerId=B&peerName=Bea&role=caller
//   /?harness=webrtc-call&selfId=B&peerId=A&peerName=Alex&role=callee
// Tree-shaken out of production (gated by import.meta.env.DEV in main.tsx).
import { useWebRtcCalls } from '../../hooks/useWebRtcCalls'
import { WebRtcCallModal } from '../WebRtcCallModal'

export default function WebRtcCallHarness() {
  const params = new URLSearchParams(window.location.search)
  const selfId = params.get('selfId') ?? 'self'
  const role = params.get('role') === 'callee' ? 'callee' : 'caller'
  const peerId = params.get('peerId') ?? 'peer'
  const peerName = params.get('peerName') ?? 'Peer'
  const callType = params.get('type') === 'video' ? 'video' : 'audio'

  const calls = useWebRtcCalls({
    isAuthenticated: true,
    selfName: selfId,
    pushToast: () => {},
    debugSelfId: selfId,
  })

  const remoteTracks = calls.remoteStream ? calls.remoteStream.getTracks().length : 0

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
      <h1>WebRTC call harness</h1>
      <p>
        self=<b>{selfId}</b> · role=<b>{role}</b> · peer=<b>{peerId}</b> · type=<b>{callType}</b>
      </p>
      <p>
        ready: <b data-testid="ready">{calls.callsReady ? 'yes' : 'no'}</b>
      </p>
      <p>
        phase: <b data-testid="phase">{calls.view.phase}</b>
      </p>
      <p>
        session: <b data-testid="session">{calls.view.sessionState ?? 'none'}</b>
      </p>
      <p>
        remote tracks: <b data-testid="remote">{remoteTracks}</b>
      </p>
      {role === 'caller' ? (
        <button
          data-testid="start-call"
          type="button"
          onClick={() => calls.startCall({ peerId, peerName, type: callType })}
        >
          Start call
        </button>
      ) : null}
      <WebRtcCallModal
        view={calls.view}
        localStream={calls.localStream}
        remoteStream={calls.remoteStream}
        appLanguage="en"
        audioCallLabel="Audio call"
        videoCallLabel="Video call"
        onAccept={calls.acceptCall}
        onDecline={calls.declineCall}
        onHangup={calls.hangup}
        onToggleMute={() => calls.setMuted(!calls.view.muted)}
        onToggleCamera={() => calls.setCameraOff(!calls.view.cameraOff)}
      />
    </div>
  )
}
