import React from 'react'
import type { AppLanguage, CallState } from '../domain'
import type { JitsiProviderConfig } from '../services/jitsiEmbedConfig'
import { formatShortTime } from '../utils/format'
import { EmbeddedCallStage } from './EmbeddedCallStage'

export type CallModalProps = {
  callState: CallState
  appLanguage: AppLanguage
  videoCallLabel: string
  audioCallLabel: string
  matchName: string
  displayName: string
  jitsiProvider: JitsiProviderConfig
  onConnected: () => void
  onEnded: () => void
  onFailed: () => void
  setMuted: (value: boolean) => void
  setCameraOff: (value: boolean) => void
  onCopyInvite: () => void
  onOpenRoom: () => void
}

// Active-call overlay. Renders only when callState.active === true so
// the parent can render unconditionally. Hosts EmbeddedCallStage (the
// actual Jitsi embed) + the bottom action row (Open in browser, Copy
// invite, End call).
//
// The parent pre-resolves matchName + displayName + the call labels so
// this component stays presentation-only — no profileById / userEmail
// coupling.
export const CallModal: React.FC<CallModalProps> = ({
  callState,
  appLanguage,
  videoCallLabel,
  audioCallLabel,
  matchName,
  displayName,
  jitsiProvider,
  onConnected,
  onEnded,
  onFailed,
  setMuted,
  setCameraOff,
  onCopyInvite,
  onOpenRoom,
}) => {
  if (!callState.active) return null
  const ro = appLanguage === 'ro'

  let statusLine: string
  if (callState.status === 'connecting') {
    statusLine = ro
      ? 'Pregătim camera ta privată Privé...'
      : 'Preparing your private Privé room...'
  } else if (callState.status === 'error') {
    statusLine = ro
      ? 'Camera privată nu a putut fi pregătită.'
      : 'The private room could not be prepared.'
  } else {
    statusLine = ro
      ? `Camera privată este gata | ${formatShortTime(callState.startedAt)}`
      : `Private room ready | ${formatShortTime(callState.startedAt)}`
  }

  return (
    <div
      className="match-modal"
      role="dialog"
      aria-modal="true"
      aria-label={ro ? 'Apel în desfășurare' : 'Call in progress'}
    >
      <article className="match-card call-card call-card--embedded">
        <p className="pill">{callState.type === 'video' ? videoCallLabel : audioCallLabel}</p>
        <h2>{matchName}</h2>
        <p>{statusLine}</p>
        {callState.roomUrl ? (
          <p className="call-room-link">
            {ro ? 'Cameră' : 'Room'}: <strong>{callState.roomId}</strong>
          </p>
        ) : null}
        {callState.type && callState.roomId && callState.roomUrl ? (
          <EmbeddedCallStage
            key={callState.roomId}
            callType={callState.type}
            domain={jitsiProvider.domain}
            scriptUrl={jitsiProvider.scriptUrl}
            jwt={jitsiProvider.jwt}
            setupMessage={jitsiProvider.setupMessage}
            roomId={callState.roomId}
            roomUrl={callState.roomUrl}
            displayName={displayName}
            matchName={matchName}
            startedAtLabel={formatShortTime(callState.startedAt)}
            muted={callState.muted}
            cameraOff={callState.cameraOff}
            language={appLanguage}
            onConnected={onConnected}
            onEnded={onEnded}
            onFailed={onFailed}
            onMuteChange={setMuted}
            onCameraChange={setCameraOff}
            onCopyInvite={onCopyInvite}
            onOpenFallback={onOpenRoom}
          />
        ) : null}
        <div className="match-actions call-actions call-actions-primary">
          <button
            type="button"
            className="ghost"
            onClick={onOpenRoom}
            disabled={!callState.roomUrl}
          >
            {ro ? 'Deschide camera privată' : 'Open Private Room'}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={onCopyInvite}
            disabled={!callState.roomUrl}
          >
            {ro ? 'Copiază invitația' : 'Copy Invite'}
          </button>
          <button type="button" className="danger" onClick={onEnded}>
            {ro ? 'Închide apelul' : 'End Call'}
          </button>
        </div>
      </article>
    </div>
  )
}
