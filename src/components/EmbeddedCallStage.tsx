import { useEffect, useRef, useState } from 'react'
import { createJitsiEmbedOptions, type JitsiCallType } from '../services/jitsiEmbedConfig'

type JitsiApi = {
  addListener: (eventName: string, listener: (event?: Record<string, unknown>) => void) => void
  dispose: () => void
  executeCommand: (command: string) => void
}

type JitsiApiConstructor = new (
  domain: string,
  options: ReturnType<typeof createJitsiEmbedOptions> & { parentNode: HTMLElement },
) => JitsiApi

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiApiConstructor
  }
}

type EmbeddedCallStageProps = {
  callType: JitsiCallType
  domain: string
  scriptUrl: string
  jwt: string
  setupMessage: string | null
  roomId: string
  roomUrl: string
  displayName: string
  matchName: string
  startedAtLabel: string
  muted: boolean
  cameraOff: boolean
  language: 'en' | 'ro'
  onConnected: () => void
  onEnded: () => void
  onFailed: () => void
  onMuteChange: (muted: boolean) => void
  onCameraChange: (cameraOff: boolean) => void
  onCopyInvite: () => void
  onOpenFallback: () => void
}

const jitsiScriptPromises = new Map<string, Promise<void>>()

const loadJitsiExternalApi = (scriptUrl: string): Promise<void> => {
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve()
  }

  if (!jitsiScriptPromises.has(scriptUrl)) {
    jitsiScriptPromises.set(scriptUrl, new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[data-lifeline="jitsi-external-api"][src="${scriptUrl}"]`)
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error('Jitsi API failed to load')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = scriptUrl
      script.async = true
      script.dataset.lifeline = 'jitsi-external-api'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Jitsi API failed to load'))
      document.head.appendChild(script)
    }))
  }

  return jitsiScriptPromises.get(scriptUrl) as Promise<void>
}

export function EmbeddedCallStage({
  callType,
  domain,
  scriptUrl,
  jwt,
  setupMessage,
  roomId,
  roomUrl,
  displayName,
  matchName,
  startedAtLabel,
  muted,
  cameraOff,
  language,
  onConnected,
  onEnded,
  onFailed,
  onMuteChange,
  onCameraChange,
  onCopyInvite,
  onOpenFallback,
}: EmbeddedCallStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const apiRef = useRef<JitsiApi | null>(null)
  const [embedStatus, setEmbedStatus] = useState<'loading' | 'joining' | 'live' | 'failed'>('loading')
  const visibleStatus = setupMessage ? 'failed' : embedStatus

  useEffect(() => {
    let cancelled = false

    if (setupMessage) {
      onFailed()
      return () => {
        cancelled = true
      }
    }

    loadJitsiExternalApi(scriptUrl)
      .then(() => {
        if (cancelled || !hostRef.current || !window.JitsiMeetExternalAPI) {
          return
        }

        setEmbedStatus('joining')
        hostRef.current.innerHTML = ''

        const api = new window.JitsiMeetExternalAPI(domain, {
          ...createJitsiEmbedOptions({
            roomName: roomId,
            displayName,
            callType,
            jwt,
          }),
          parentNode: hostRef.current,
        })

        apiRef.current = api
        api.addListener('videoConferenceJoined', () => {
          setEmbedStatus('live')
          onConnected()
        })
        api.addListener('videoConferenceLeft', onEnded)
        api.addListener('readyToClose', onEnded)
        api.addListener('audioMuteStatusChanged', (event) => {
          onMuteChange(Boolean(event?.muted))
        })
        api.addListener('videoMuteStatusChanged', (event) => {
          onCameraChange(Boolean(event?.muted))
        })
      })
      .catch(() => {
        if (!cancelled) {
          setEmbedStatus('failed')
          onFailed()
        }
      })

    return () => {
      cancelled = true
      apiRef.current?.dispose()
      apiRef.current = null
    }
  }, [callType, displayName, domain, jwt, onCameraChange, onConnected, onEnded, onFailed, onMuteChange, roomId, scriptUrl, setupMessage])

  const toggleMute = () => {
    apiRef.current?.executeCommand('toggleAudio')
    onMuteChange(!muted)
  }

  const toggleCamera = () => {
    apiRef.current?.executeCommand('toggleVideo')
    onCameraChange(!cameraOff)
  }

  const hangUp = () => {
    apiRef.current?.executeCommand('hangup')
    onEnded()
  }

  const copy = {
    status:
      setupMessage
        ? language === 'ro'
          ? 'Configurarea video este necesara'
          : 'Video setup needed'
        : visibleStatus === 'failed'
        ? language === 'ro'
          ? 'Camera incorporata nu s-a putut incarca.'
          : 'The embedded room could not load.'
        : visibleStatus === 'live'
          ? language === 'ro'
            ? 'Camera este activa'
            : 'Room is live'
          : language === 'ro'
            ? 'Conectam camera privata'
            : 'Connecting private room',
    fallback: language === 'ro' ? 'Deschide in browser' : 'Open in browser',
    copyInvite: language === 'ro' ? 'Copiaza invitatia' : 'Copy invite',
    mute: muted ? (language === 'ro' ? 'Activeaza microfonul' : 'Unmute') : language === 'ro' ? 'Opreste microfonul' : 'Mute',
    camera: cameraOff ? (language === 'ro' ? 'Porneste camera' : 'Camera on') : language === 'ro' ? 'Opreste camera' : 'Camera off',
    hangUp: language === 'ro' ? 'Inchide apelul' : 'End call',
    prompt: language === 'ro' ? 'Intrebare buna' : 'Good prompt',
    reaction: language === 'ro' ? 'Reactie' : 'Reaction',
  }

  return (
    <div className={`call-cinema-stage ${callType === 'audio' ? 'audio-only' : ''}`}>
      <div className="call-stage-topline">
        <div>
          <span>{callType === 'video' ? 'Video' : 'Audio'}</span>
          <strong>{matchName}</strong>
        </div>
        <div className={`call-stage-status ${visibleStatus}`}>
          <span aria-hidden="true" />
          {copy.status} | {startedAtLabel}
        </div>
      </div>

      <div className="call-stage-body">
        <div className="call-stage-video">
          <div ref={hostRef} className="call-jitsi-host" aria-label={roomUrl} />
          {visibleStatus !== 'live' ? (
            <div className="call-stage-loading">
              <div className="call-stage-pulse" aria-hidden="true" />
              <p>{copy.status}</p>
              {setupMessage ? <p className="call-stage-setup-note">{setupMessage}</p> : null}
              {visibleStatus === 'failed' ? (
                <button type="button" className="ghost" onClick={onOpenFallback}>
                  {copy.fallback}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="call-stage-side">
          <div className="call-self-tile">
            <span>{language === 'ro' ? 'Tu' : 'You'}</span>
            <strong>{displayName}</strong>
            <p>{muted ? 'Mic off' : 'Mic on'} | {cameraOff ? 'Camera off' : 'Camera on'}</p>
          </div>
          <div className="call-date-tools">
            <button type="button" className="mini-btn" disabled>
              {copy.prompt}
            </button>
            <button type="button" className="mini-btn" disabled>
              {copy.reaction}
            </button>
          </div>
        </aside>
      </div>

      <div className="call-stage-controls">
        <button type="button" className={muted ? 'solid' : 'ghost'} onClick={toggleMute}>
          {copy.mute}
        </button>
        <button type="button" className={cameraOff ? 'solid' : 'ghost'} onClick={toggleCamera} disabled={callType === 'audio'}>
          {copy.camera}
        </button>
        <button type="button" className="ghost" onClick={onOpenFallback}>
          {copy.fallback}
        </button>
        <button type="button" className="ghost" onClick={onCopyInvite}>
          {copy.copyInvite}
        </button>
        <button type="button" className="danger" onClick={hangUp}>
          {copy.hangUp}
        </button>
      </div>
    </div>
  )
}
