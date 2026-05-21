import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createJitsiProviderConfig } from '../services/jitsiEmbedConfig'
import { buildCallRoom } from '../utils'
import { UI_TEXT } from '../constants'
import type { JitsiProviderConfig } from '../services/jitsiEmbedConfig'
import type {
  CallLogEntry,
  CallState,
  ChatMessage,
} from '../domain'
import type { Profile } from '../services/loveDateApi'

// Phase D2.4 — useCallScreen
//
// Owns the audio/video call lifecycle: callState + the synced ref,
// the active call-log id ref, the Jitsi provider memo (built once
// per env config), and 9 handlers covering start/end/connect/fail/
// mute/camera/open-room/copy-link/rejoin.
//
// Side-effects callers care about:
//   - startCall + endCall append a call-meta ChatMessage into the
//     active thread so the chat shows the invite/ended event.
//   - both append CallLogEntry to the call-history cache (state owned
//     by App.tsx — passed in via setCallHistory).
//   - sign-out resets the active call. The hook watches
//     isAuthenticated; when it drops to false the call state is
//     hard-reset.

const INITIAL_CALL_STATE: CallState = {
  active: false,
  type: null,
  status: 'connecting',
  startedAt: 0,
  targetProfileId: null,
  muted: false,
  cameraOff: false,
  roomId: null,
  roomUrl: null,
}

type RuntimeCalls = {
  jitsiDomain: string | null | undefined
  jitsiAppId: string | null | undefined
  jitsiJwt: string | null | undefined
}

type UseCallScreenInput = {
  isAuthenticated: boolean
  selectedChatProfile: Profile | null
  userEmail: string
  runtimeCalls: RuntimeCalls
  setCallHistory: React.Dispatch<React.SetStateAction<CallLogEntry[]>>
  setChatThreads: React.Dispatch<
    React.SetStateAction<Record<number, ChatMessage[]>>
  >
  pushToast: (
    message: string,
    tone?: 'info' | 'success' | 'error',
  ) => void
  appLanguage: import('../domain').AppLanguage
}

export const useCallScreen = ({
  isAuthenticated,
  selectedChatProfile,
  userEmail,
  runtimeCalls,
  setCallHistory,
  setChatThreads,
  pushToast,
  appLanguage,
}: UseCallScreenInput) => {
  const [callState, setCallState] = useState<CallState>(INITIAL_CALL_STATE)

  // Mirror to a ref so endCall can read the live state without
  // depending on it (endCall runs when the user taps end, or when an
  // event lands from the embedded Jitsi iframe; either way we want
  // the latest snapshot, not whatever the closure captured).
  const callStateRef = useRef<CallState>(INITIAL_CALL_STATE)
  useEffect(() => {
    callStateRef.current = callState
  }, [callState])

  const activeCallLogIdRef = useRef<string | null>(null)

  const jitsiProvider: JitsiProviderConfig = useMemo(
    () =>
      createJitsiProviderConfig({
        domain: runtimeCalls.jitsiDomain ?? undefined,
        appId: runtimeCalls.jitsiAppId ?? undefined,
        jwt: runtimeCalls.jitsiJwt ?? undefined,
      }),
    [runtimeCalls.jitsiDomain, runtimeCalls.jitsiAppId, runtimeCalls.jitsiJwt],
  )

  // Sign-out side-effect: when isAuthenticated drops, hard-reset the
  // call so a returning session doesn't restore the previous user's
  // active call. The lint rule that warns on setState-in-effect is
  // suppressed here because:
  //   - isAuthenticated changes at most a handful of times per session
  //     (sign-in, sign-out), so this doesn't trigger cascading renders
  //   - the alternative (a parent-owned resetCall callback) leaks the
  //     hook's internal state shape into the auth flow, which is the
  //     exact coupling this extraction was meant to remove.
  useEffect(() => {
    if (!isAuthenticated) {
      activeCallLogIdRef.current = null
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCallState(INITIAL_CALL_STATE)
    }
  }, [isAuthenticated])

  const startCall = useCallback(
    (type: 'audio' | 'video') => {
      if (!selectedChatProfile) return
      const rawRoomId = buildCallRoom(
        userEmail || 'guest@prive-app.club',
        selectedChatProfile.id,
        type,
      )
      const roomId = jitsiProvider.formatRoomName(rawRoomId)
      const roomUrl = jitsiProvider.buildRoomUrl(rawRoomId)
      const now = Date.now()
      const logId = `call_${now}_${selectedChatProfile.id}`
      const nextCallEntry: CallLogEntry = {
        id: logId,
        profileId: selectedChatProfile.id,
        profileName: selectedChatProfile.name,
        type,
        roomId,
        roomUrl,
        startedAt: now,
        answeredAt: null,
        endedAt: null,
        outcome: 'initiated',
      }
      activeCallLogIdRef.current = logId
      setCallHistory((current) => [nextCallEntry, ...current].slice(0, 200))
      setCallState({
        active: true,
        type,
        status: 'connecting',
        startedAt: now,
        targetProfileId: selectedChatProfile.id,
        muted: false,
        cameraOff: type === 'audio',
        roomId,
        roomUrl,
      })
      setChatThreads((current) => {
        const currentThread = current[selectedChatProfile.id] ?? []
        return {
          ...current,
          [selectedChatProfile.id]: [
            ...currentThread,
            {
              id: now,
              sender: 'me',
              text: `Private ${type} call invite (no phone number): ${roomUrl}`,
              callMeta: { type, roomId, roomUrl, event: 'invite' },
              createdAt: now,
              status: 'sent',
            },
          ],
        }
      })
      pushToast(
        jitsiProvider.needsModeratorAuth
          ? 'Private call link created, but meet.jit.si may require a moderator login. Configure JaaS for reliable calls.'
          : 'Private call link created and shared in chat.',
        jitsiProvider.needsModeratorAuth ? 'info' : 'success',
      )
    },
    [
      selectedChatProfile,
      userEmail,
      jitsiProvider,
      setCallHistory,
      setChatThreads,
      pushToast,
    ],
  )

  const markCallConnected = useCallback(() => {
    const connectedAt = Date.now()
    const logId = activeCallLogIdRef.current
    if (logId) {
      setCallHistory((current) =>
        current.map((entry) =>
          entry.id === logId && !entry.answeredAt
            ? { ...entry, outcome: 'connected', answeredAt: connectedAt }
            : entry,
        ),
      )
    }
    setCallState((current) => (current.active ? { ...current, status: 'live' } : current))
  }, [setCallHistory])

  const markCallFailed = useCallback(() => {
    const logId = activeCallLogIdRef.current
    if (logId) {
      setCallHistory((current) =>
        current.map((entry) =>
          entry.id === logId &&
          entry.outcome !== 'connected' &&
          entry.outcome !== 'ended'
            ? { ...entry, outcome: 'failed' }
            : entry,
        ),
      )
    }
    setCallState((current) => (current.active ? { ...current, status: 'error' } : current))
  }, [setCallHistory])

  const setCallMuted = useCallback((muted: boolean) => {
    setCallState((current) => (current.active ? { ...current, muted } : current))
  }, [])

  const setCallCameraOff = useCallback((cameraOff: boolean) => {
    setCallState((current) => (current.active ? { ...current, cameraOff } : current))
  }, [])

  const endCall = useCallback(() => {
    const snapshot = callStateRef.current
    const activeType = snapshot.type
    const activeTargetProfileId = snapshot.targetProfileId
    const activeRoomId = snapshot.roomId
    const activeRoomUrl = snapshot.roomUrl
    const activeStatus = snapshot.status
    const endedAt = Date.now()
    const logId = activeCallLogIdRef.current
    if (logId) {
      setCallHistory((current) =>
        current.map((entry) =>
          entry.id === logId
            ? {
                ...entry,
                outcome: entry.answeredAt
                  ? 'ended'
                  : entry.outcome === 'failed'
                    ? 'failed'
                    : 'missed',
                endedAt,
              }
            : entry,
        ),
      )
    }
    if (activeTargetProfileId && activeType && activeRoomId && activeRoomUrl) {
      const callMetaEvent: 'ended' | 'missed' =
        activeStatus === 'live' ? 'ended' : 'missed'
      setChatThreads((current) => {
        const currentThread = current[activeTargetProfileId] ?? []
        return {
          ...current,
          [activeTargetProfileId]: [
            ...currentThread,
            {
              id: endedAt,
              sender: 'me',
              text:
                activeStatus === 'live'
                  ? `${activeType} call ended.`
                  : `${activeType} call was missed.`,
              callMeta: {
                type: activeType,
                roomId: activeRoomId,
                roomUrl: activeRoomUrl,
                event: callMetaEvent,
              },
              createdAt: endedAt,
              status: 'sent',
            },
          ],
        }
      })
    }
    activeCallLogIdRef.current = null
    setCallState(INITIAL_CALL_STATE)
  }, [setCallHistory, setChatThreads])

  const openCallRoom = useCallback(() => {
    if (!callState.roomUrl) return
    markCallConnected()
    window.open(callState.roomUrl, '_blank', 'noopener,noreferrer')
  }, [callState.roomUrl, markCallConnected])

  const copyCallInvite = useCallback(async () => {
    if (!callState.roomUrl) return
    const tCall = UI_TEXT[appLanguage].callToasts
    try {
      await navigator.clipboard.writeText(callState.roomUrl)
      pushToast(tCall.inviteCopied, 'success')
    } catch {
      pushToast(tCall.copyFailed, 'error')
    }
  }, [callState.roomUrl, pushToast, appLanguage])

  const rejoinCallFromHistory = useCallback(
    (entry: CallLogEntry) => {
      activeCallLogIdRef.current = entry.id
      setCallState({
        active: true,
        type: entry.type,
        status: 'connecting',
        startedAt: entry.startedAt,
        targetProfileId: entry.profileId,
        muted: false,
        cameraOff: entry.type === 'audio',
        roomId: entry.roomId,
        roomUrl: entry.roomUrl,
      })
      pushToast(
        `Rejoining ${entry.type} call with ${entry.profileName}.`,
        'info',
      )
    },
    [pushToast],
  )

  return {
    callState,
    jitsiProvider,
    startCall,
    markCallConnected,
    markCallFailed,
    setCallMuted,
    setCallCameraOff,
    endCall,
    openCallRoom,
    copyCallInvite,
    rejoinCallFromHistory,
  } as const
}
