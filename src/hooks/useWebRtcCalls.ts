// src/hooks/useWebRtcCalls.ts
//
// The brain of the free P2P calling feature. Owns the call lifecycle and
// stitches the two signaling layers together:
//   - callInvites (calls:<authUserId>)  → ringing: who's calling whom
//   - signaling   (call:<roomId>)       → the per-call WebRTC handshake
// plus the CallSession (RTCPeerConnection + media). Exposes a single `view`
// state machine + handlers + the live local/remote streams for the UI.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createCallSession,
  buildIceServers,
  type CallSession,
  type CallSessionState,
} from '../services/webrtc/callSession'
import { createSupabaseSignaling } from '../services/webrtc/signaling'
import { subscribeToCallInbox, sendCallMessage } from '../services/webrtc/callInvites'
import { getCurrentUserId } from '../services/backend/client'
import type { AppLanguage } from '../domain'

export type WebRtcCallPhase = 'idle' | 'outgoing' | 'incoming' | 'active'

export type WebRtcCallView = {
  phase: WebRtcCallPhase
  callType: 'audio' | 'video'
  peerId: string | null
  peerName: string
  roomId: string | null
  sessionState: CallSessionState | null
  muted: boolean
  cameraOff: boolean
}

const IDLE_VIEW: WebRtcCallView = {
  phase: 'idle',
  callType: 'audio',
  peerId: null,
  peerName: '',
  roomId: null,
  sessionState: null,
  muted: false,
  cameraOff: false,
}

export type StartCallArgs = { peerId: string; peerName: string; type: 'audio' | 'video' }

type Toast = (message: string, tone?: 'info' | 'success' | 'error') => void

// getUserMedia rejects with these when the OS won't hand over the mic — either
// the user denied the permission (NotAllowedError) or it's stuck in Android's
// silent-deny state (NotReadableError "Could not start audio source"). Both are
// fixed the same way: the user re-enables microphone access in Settings — so we
// show that guidance instead of a blank "Call failed."
const isMicAccessError = (error: Error | null): boolean =>
  !!error &&
  (error.name === 'NotAllowedError' ||
    error.name === 'NotReadableError' ||
    error.name === 'NotFoundError' ||
    /audio source|permission|microphone/i.test(error.message))

export const useWebRtcCalls = ({
  isAuthenticated,
  selfName,
  appLanguage,
  pushToast,
  debugSelfId,
}: {
  isAuthenticated: boolean
  selfName: string
  appLanguage: AppLanguage
  pushToast: Toast
  /** DEV/test only: inject the auth id instead of resolving getCurrentUserId
   *  (used by the ?harness=webrtc-call two-browser proof). */
  debugSelfId?: string
}) => {
  const [view, setView] = useState<WebRtcCallView>(IDLE_VIEW)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)

  const viewRef = useRef<WebRtcCallView>(IDLE_VIEW)
  const selfIdRef = useRef<string | null>(null)
  const sessionRef = useRef<CallSession | null>(null)
  const pendingIncomingRef = useRef<{
    roomId: string
    type: 'audio' | 'video'
    fromId: string
    fromName: string
  } | null>(null)
  // The most recent session error, captured by onError so the 'failed' state
  // handler can tailor the toast (mic-permission vs generic).
  const lastErrorRef = useRef<Error | null>(null)

  useEffect(() => {
    viewRef.current = view
  }, [view])
  useEffect(() => {
    selfIdRef.current = selfId
  }, [selfId])

  // Resolve the current user's auth id (needed to address the per-user call
  // inboxes). Cleared on sign-out.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const id = debugSelfId ?? (isAuthenticated ? await getCurrentUserId() : null)
      if (!cancelled) setSelfId(id)
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, debugSelfId])

  const resetCall = useCallback(() => {
    sessionRef.current = null
    pendingIncomingRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
    setView(IDLE_VIEW)
  }, [])

  const beginSession = useCallback(
    (roomId: string, type: 'audio' | 'video', isInitiator: boolean) => {
      const myId = selfIdRef.current
      if (!myId) return
      const session = createCallSession({
        selfId: myId,
        isInitiator,
        withVideo: type === 'video',
        iceServers: buildIceServers(),
        createTransport: createSupabaseSignaling(roomId, myId),
        onState: (state) => {
          setView((current) => ({
            ...current,
            sessionState: state,
            phase: state === 'connected' ? 'active' : current.phase,
          }))
          if (state === 'failed' || state === 'ended') {
            if (state === 'failed') {
              const micError = isMicAccessError(lastErrorRef.current)
              pushToast(
                micError
                  ? appLanguage === 'ro'
                    ? 'Privé are nevoie de acces la microfon pentru apeluri. Activează microfonul din Setări → Aplicații → Privé → Permisiuni.'
                    : 'Privé needs microphone access for calls. Turn it on in Settings → Apps → Privé → Permissions.'
                  : appLanguage === 'ro'
                    ? 'Apelul a eșuat.'
                    : 'Call failed.',
                'error',
              )
            }
            lastErrorRef.current = null
            resetCall()
          }
        },
        onLocalStream: setLocalStream,
        onRemoteStream: setRemoteStream,
        onError: (error) => {
          lastErrorRef.current = error
        },
      })
      sessionRef.current = session
      void session.start()
    },
    [appLanguage, pushToast, resetCall],
  )

  const startCall = useCallback(
    ({ peerId, peerName, type }: StartCallArgs) => {
      const myId = selfIdRef.current
      if (!myId) {
        pushToast(
          appLanguage === 'ro'
            ? 'Apelul nu e gata încă — încearcă din nou într-o clipă.'
            : 'Calling is not ready yet — try again in a moment.',
          'error',
        )
        return
      }
      if (viewRef.current.phase !== 'idle') return
      const roomId = `wrtc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      setView({
        phase: 'outgoing',
        callType: type,
        peerId,
        peerName,
        roomId,
        sessionState: null,
        muted: false,
        cameraOff: type === 'audio',
      })
      void sendCallMessage(peerId, {
        kind: 'invite',
        roomId,
        callType: type,
        fromId: myId,
        fromName: selfName,
      })
      beginSession(roomId, type, true)
    },
    [appLanguage, pushToast, selfName, beginSession],
  )

  const acceptCall = useCallback(() => {
    const incoming = pendingIncomingRef.current
    const myId = selfIdRef.current
    if (!incoming || !myId) return
    pendingIncomingRef.current = null
    setView({
      phase: 'active',
      callType: incoming.type,
      peerId: incoming.fromId,
      peerName: incoming.fromName,
      roomId: incoming.roomId,
      sessionState: 'connecting',
      muted: false,
      cameraOff: incoming.type === 'audio',
    })
    void sendCallMessage(incoming.fromId, {
      kind: 'accept',
      roomId: incoming.roomId,
      fromId: myId,
    })
    beginSession(incoming.roomId, incoming.type, false)
  }, [beginSession])

  const declineCall = useCallback(() => {
    const incoming = pendingIncomingRef.current
    const myId = selfIdRef.current
    if (incoming && myId) {
      void sendCallMessage(incoming.fromId, {
        kind: 'decline',
        roomId: incoming.roomId,
        fromId: myId,
      })
    }
    pendingIncomingRef.current = null
    setView(IDLE_VIEW)
  }, [])

  const hangup = useCallback(() => {
    const current = viewRef.current
    const myId = selfIdRef.current
    sessionRef.current?.hangup()
    // Notify the peer. Covers cancel-before-answer (peer hasn't joined the call
    // channel yet, so the session 'bye' wouldn't reach them) and is harmless
    // after connect (their session already ended via 'bye').
    if (current.peerId && current.roomId && myId) {
      void sendCallMessage(current.peerId, {
        kind: 'cancel',
        roomId: current.roomId,
        fromId: myId,
      })
    }
    resetCall()
  }, [resetCall])

  const setMuted = useCallback((muted: boolean) => {
    sessionRef.current?.setMuted(muted)
    setView((current) => ({ ...current, muted }))
  }, [])

  const setCameraOff = useCallback((cameraOff: boolean) => {
    sessionRef.current?.setVideoEnabled(!cameraOff)
    setView((current) => ({ ...current, cameraOff }))
  }, [])

  // The per-user call inbox: rings, accepts, declines, cancels.
  useEffect(() => {
    if (!isAuthenticated || !selfId) return
    const unsubscribe = subscribeToCallInbox(selfId, (message) => {
      const myId = selfIdRef.current
      if (!myId) return
      if (message.kind === 'invite') {
        // Already busy → auto-decline so the caller isn't left ringing.
        if (viewRef.current.phase !== 'idle') {
          void sendCallMessage(message.fromId, {
            kind: 'decline',
            roomId: message.roomId,
            fromId: myId,
          })
          return
        }
        pendingIncomingRef.current = {
          roomId: message.roomId,
          type: message.callType,
          fromId: message.fromId,
          fromName: message.fromName,
        }
        setView({
          phase: 'incoming',
          callType: message.callType,
          peerId: message.fromId,
          peerName: message.fromName,
          roomId: message.roomId,
          sessionState: null,
          muted: false,
          cameraOff: message.callType === 'audio',
        })
      } else if (message.kind === 'decline') {
        if (viewRef.current.roomId === message.roomId) {
          sessionRef.current?.hangup()
          const who =
            viewRef.current.peerName || (appLanguage === 'ro' ? 'Cealaltă persoană' : 'They')
          pushToast(
            appLanguage === 'ro' ? `${who} a refuzat apelul.` : `${who} declined the call.`,
            'info',
          )
          resetCall()
        }
      } else if (message.kind === 'cancel') {
        if (viewRef.current.roomId === message.roomId) {
          sessionRef.current?.hangup()
          resetCall()
        }
      } else if (message.kind === 'accept') {
        if (viewRef.current.roomId === message.roomId && viewRef.current.phase === 'outgoing') {
          setView((current) => ({ ...current, sessionState: 'connecting' }))
        }
      }
    })
    return unsubscribe
  }, [isAuthenticated, selfId, appLanguage, pushToast, resetCall])

  return {
    view,
    localStream,
    remoteStream,
    callsReady: selfId != null,
    startCall,
    acceptCall,
    declineCall,
    hangup,
    setMuted,
    setCameraOff,
  }
}
