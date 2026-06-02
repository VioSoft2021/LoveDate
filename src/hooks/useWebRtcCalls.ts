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
import { initNativePush, setIncomingCallPushHandler } from '../services/nativePush'
import { sendCallPush } from '../services/webrtc/callPush'
import { openAppSettings, canOpenAppSettings } from '../services/appSettings'
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

type Toast = (
  message: string,
  tone?: 'info' | 'success' | 'error',
  action?: { label: string; onClick: () => void },
) => void

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
                micError && canOpenAppSettings()
                  ? {
                      label: appLanguage === 'ro' ? 'Deschide Setări' : 'Open Settings',
                      onClick: () => void openAppSettings(),
                    }
                  : undefined,
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
      // Also push (FCM to the phone / Web Push to browsers) so the callee rings
      // even if their app is closed — Realtime only reaches them when online.
      void sendCallPush({ calleeId: peerId, roomId, callType: type, callerName: selfName })
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

  // Present an incoming call (from either the Realtime inbox or an offline
  // push). Deduped by roomId so the online invite + the push don't double-ring;
  // auto-declines if we're already busy with a different call.
  const presentIncoming = useCallback(
    (invite: { roomId: string; callType: 'audio' | 'video'; fromId: string; fromName: string }) => {
      const myId = selfIdRef.current
      if (!myId) return
      if (viewRef.current.roomId === invite.roomId) return
      if (viewRef.current.phase !== 'idle') {
        void sendCallMessage(invite.fromId, {
          kind: 'decline',
          roomId: invite.roomId,
          fromId: myId,
        })
        return
      }
      pendingIncomingRef.current = {
        roomId: invite.roomId,
        type: invite.callType,
        fromId: invite.fromId,
        fromName: invite.fromName,
      }
      setView({
        phase: 'incoming',
        callType: invite.callType,
        peerId: invite.fromId,
        peerName: invite.fromName,
        roomId: invite.roomId,
        sessionState: null,
        muted: false,
        cameraOff: invite.callType === 'audio',
      })
    },
    [],
  )

  // The per-user call inbox: rings, accepts, declines, cancels.
  useEffect(() => {
    if (!isAuthenticated || !selfId) return
    const unsubscribe = subscribeToCallInbox(selfId, (message) => {
      if (!selfIdRef.current) return
      if (message.kind === 'invite') {
        presentIncoming({
          roomId: message.roomId,
          callType: message.callType,
          fromId: message.fromId,
          fromName: message.fromName,
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
  }, [isAuthenticated, selfId, appLanguage, pushToast, resetCall, presentIncoming])

  // Native (installed-app) offline ringing: register for FCM and route an
  // incoming-call push into the same ringing UI as the Realtime inbox above.
  useEffect(() => {
    if (!isAuthenticated || !selfId) return
    void initNativePush()
    setIncomingCallPushHandler((call) =>
      presentIncoming({
        roomId: call.roomId,
        callType: call.callType,
        fromId: call.callerId,
        fromName: call.callerName,
      }),
    )
    return () => setIncomingCallPushHandler(null)
  }, [isAuthenticated, selfId, presentIncoming])

  // Web/PWA: when the app is opened from an incoming-call notification, the SW
  // puts the call coords in the query string. Pick them up, ring, then strip
  // them so a refresh doesn't re-trigger.
  useEffect(() => {
    if (!isAuthenticated || !selfId) return
    const params = new URLSearchParams(window.location.search)
    const roomId = params.get('incomingCall')
    const from = params.get('from')
    if (!roomId || !from) return
    const callType: 'audio' | 'video' = params.get('ctype') === 'video' ? 'video' : 'audio'
    const fromName = params.get('cname') || 'Privé'
    // Strip the params first so a refresh can't re-trigger the ring.
    window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    // Defer the ring out of the effect body (avoids synchronous setState).
    const timer = window.setTimeout(() => {
      presentIncoming({ roomId, callType, fromId: from, fromName })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [isAuthenticated, selfId, presentIncoming])

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
