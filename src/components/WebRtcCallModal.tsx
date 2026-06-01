// src/components/WebRtcCallModal.tsx
//
// Presentation for the free P2P call, driven by useWebRtcCalls' `view` state
// machine. One overlay covers all phases: incoming (accept/decline), outgoing
// (ringing/cancel) and active (live media + mute/camera/end). Reuses the
// existing match-modal / call-card styling for a consistent Privé look.
import React, { useEffect, useRef } from 'react'
import './WebRtcCallModal.css'
import type { AppLanguage } from '../domain'
import type { WebRtcCallView } from '../hooks/useWebRtcCalls'

type WebRtcCallModalProps = {
  view: WebRtcCallView
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  appLanguage: AppLanguage
  audioCallLabel: string
  videoCallLabel: string
  onAccept: () => void
  onDecline: () => void
  onHangup: () => void
  onToggleMute: () => void
  onToggleCamera: () => void
}

export const WebRtcCallModal: React.FC<WebRtcCallModalProps> = ({
  view,
  localStream,
  remoteStream,
  appLanguage,
  audioCallLabel,
  videoCallLabel,
  onAccept,
  onDecline,
  onHangup,
  onToggleMute,
  onToggleCamera,
}) => {
  const ro = appLanguage === 'ro'
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream
  }, [remoteStream])
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream
  }, [localStream])

  if (view.phase === 'idle') return null

  const isVideo = view.callType === 'video'
  const pill = isVideo ? videoCallLabel : audioCallLabel

  let statusLine: string
  if (view.phase === 'incoming') {
    statusLine = ro ? 'te sună…' : 'is calling you…'
  } else if (view.phase === 'outgoing') {
    statusLine =
      view.sessionState === 'connecting'
        ? ro
          ? 'se conectează…'
          : 'connecting…'
        : ro
          ? 'sună…'
          : 'ringing…'
  } else {
    statusLine =
      view.sessionState === 'connected'
        ? ro
          ? 'conectat'
          : 'connected'
        : ro
          ? 'se conectează…'
          : 'connecting…'
  }

  return (
    <div className="match-modal webrtc-call" role="dialog" aria-modal="true" aria-label={ro ? 'Apel' : 'Call'}>
      <article className="match-card call-card webrtc-call-card">
        <p className="pill">{pill}</p>
        <h2>{view.peerName || (ro ? 'Apel' : 'Call')}</h2>
        <p className="webrtc-call-status">{statusLine}</p>

        <div className={`webrtc-stage${isVideo ? ' is-video' : ''}`}>
          {isVideo ? (
            <>
              <video ref={remoteVideoRef} className="webrtc-remote-video" autoPlay playsInline />
              <video ref={localVideoRef} className="webrtc-local-video" autoPlay playsInline muted />
            </>
          ) : (
            <>
              <div className="webrtc-audio-orb" aria-hidden="true">
                {(view.peerName || '?').slice(0, 1).toUpperCase()}
              </div>
              <audio ref={remoteAudioRef} autoPlay />
            </>
          )}
        </div>

        <div className="match-actions call-actions">
          {view.phase === 'incoming' ? (
            <>
              <button type="button" className="danger" onClick={onDecline}>
                {ro ? 'Refuză' : 'Decline'}
              </button>
              <button type="button" onClick={onAccept}>
                {ro ? 'Răspunde' : 'Accept'}
              </button>
            </>
          ) : view.phase === 'outgoing' ? (
            <button type="button" className="danger" onClick={onHangup}>
              {ro ? 'Anulează' : 'Cancel'}
            </button>
          ) : (
            <>
              <button type="button" className="ghost" onClick={onToggleMute}>
                {view.muted ? (ro ? 'Activează microfonul' : 'Unmute') : ro ? 'Oprește microfonul' : 'Mute'}
              </button>
              {isVideo ? (
                <button type="button" className="ghost" onClick={onToggleCamera}>
                  {view.cameraOff
                    ? ro
                      ? 'Pornește camera'
                      : 'Camera on'
                    : ro
                      ? 'Oprește camera'
                      : 'Camera off'}
                </button>
              ) : null}
              <button type="button" className="danger" onClick={onHangup}>
                {ro ? 'Închide' : 'End'}
              </button>
            </>
          )}
        </div>
      </article>
    </div>
  )
}
