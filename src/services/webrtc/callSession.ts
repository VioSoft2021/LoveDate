// src/services/webrtc/callSession.ts
//
// A framework-agnostic 1-on-1 WebRTC call session. Owns the RTCPeerConnection
// + local media, and drives the offer/answer/ICE handshake over an injected
// signaling transport (see ./signaling). Media flows peer-to-peer — nothing
// passes through a server — so calls cost $0 per minute.
//
// Roles are fixed per call: the `isInitiator` peer creates the offer (once the
// other peer is present), the responder answers. ICE candidates that arrive
// before the remote description is set are buffered and flushed after.
import type { SignalMessage, SignalingTransport, TransportFactory } from './signaling'

export type CallSessionState =
  | 'requesting-media'
  | 'waiting-for-peer'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'ended'

// Free public STUN — enough for the ~80-90% of calls that connect peer-to-peer.
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

// Build the ICE server list for a call: always STUN, plus a TURN relay when one
// is configured. TURN is what lets the ~10-20% behind strict/symmetric NAT or
// carrier CGNAT (common on Romanian mobile data) connect by relaying media
// instead of failing outright. Its address + credentials live in env so the
// relay can change without a code edit (and STUN-only behaviour is the default
// when unset):
//   VITE_TURN_URL=turn:turn.example.com:3478[,turns:turn.example.com:5349]
//   VITE_TURN_USERNAME=...
//   VITE_TURN_CREDENTIAL=...
export const buildIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [...DEFAULT_ICE_SERVERS]
  const env = import.meta.env as unknown as Record<string, string | undefined>
  const turnUrl = env.VITE_TURN_URL?.trim()
  if (turnUrl) {
    servers.push({
      urls: turnUrl
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean),
      username: env.VITE_TURN_USERNAME,
      credential: env.VITE_TURN_CREDENTIAL,
    })
  }
  return servers
}

// Give up if we never reach 'connected' — so a stuck/abandoned call can't sit
// forever holding the microphone open.
const CONNECT_TIMEOUT_MS = 30000

export type CallSessionOptions = {
  selfId: string
  isInitiator: boolean
  withVideo: boolean
  createTransport: TransportFactory
  iceServers?: RTCIceServer[]
  onState: (state: CallSessionState) => void
  onRemoteStream: (stream: MediaStream) => void
  onLocalStream?: (stream: MediaStream) => void
  onError?: (error: Error) => void
}

export type CallSession = {
  start: () => Promise<void>
  hangup: () => void
  setMuted: (muted: boolean) => void
  setVideoEnabled: (enabled: boolean) => void
  getLocalStream: () => MediaStream | null
}

export const createCallSession = (opts: CallSessionOptions): CallSession => {
  let pc: RTCPeerConnection | null = null
  let transport: SignalingTransport | null = null
  let localStream: MediaStream | null = null
  let remoteStream: MediaStream | null = null
  let ended = false
  let offerSent = false
  let remoteReady = false
  const pendingIce: RTCIceCandidateInit[] = []
  let connectTimer: ReturnType<typeof setTimeout> | null = null

  const toError = (value: unknown): Error =>
    value instanceof Error ? value : new Error(String(value))

  const fail = (error: Error) => {
    opts.onError?.(error)
    // teardown() releases the mic + closes the connection. Always do it on
    // failure so a dead/abandoned attempt can't keep the microphone locked.
    teardown('failed')
  }

  const flushIce = async () => {
    if (!pc) return
    while (pendingIce.length > 0) {
      const candidate = pendingIce.shift()
      if (candidate) {
        try {
          await pc.addIceCandidate(candidate)
        } catch {
          // A failed candidate is non-fatal; ICE tries the rest.
        }
      }
    }
  }

  const sendOffer = async () => {
    if (!pc || offerSent || ended) return
    offerSent = true
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      transport?.send({ kind: 'offer', from: opts.selfId, sdp: offer.sdp })
      opts.onState('connecting')
    } catch (error) {
      fail(toError(error))
    }
  }

  const handleSignal = async (message: SignalMessage) => {
    if (!pc || ended) return
    try {
      if (message.kind === 'offer' && !opts.isInitiator && message.sdp) {
        await pc.setRemoteDescription({ type: 'offer', sdp: message.sdp })
        remoteReady = true
        await flushIce()
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        transport?.send({ kind: 'answer', from: opts.selfId, sdp: answer.sdp })
        opts.onState('connecting')
      } else if (message.kind === 'answer' && opts.isInitiator && message.sdp) {
        await pc.setRemoteDescription({ type: 'answer', sdp: message.sdp })
        remoteReady = true
        await flushIce()
      } else if (message.kind === 'ice') {
        if (remoteReady) {
          await pc.addIceCandidate(message.candidate)
        } else {
          pendingIce.push(message.candidate)
        }
      } else if (message.kind === 'bye') {
        teardown('ended')
      }
    } catch (error) {
      fail(toError(error))
    }
  }

  const teardown = (finalState: CallSessionState) => {
    if (ended) return
    ended = true
    if (connectTimer) {
      clearTimeout(connectTimer)
      connectTimer = null
    }
    localStream?.getTracks().forEach((track) => track.stop())
    try {
      pc?.close()
    } catch {
      // Closing an already-closed connection is harmless.
    }
    pc = null
    transport?.close()
    transport = null
    opts.onState(finalState)
  }

  return {
    start: async () => {
      try {
        opts.onState('requesting-media')
        // Some Android WebViews (notably Samsung) reject the default mic request
        // with "NotReadableError: Could not start audio source": Chromium opens
        // the mic in echo-cancellation / communication mode and that hardware
        // audio source fails to start, even though a plain mic works. Try the
        // normal request, then fall back to a plain mic with audio processing
        // disabled, then audio-only. First one that starts wins; if all fail we
        // surface the error so the UI can prompt for microphone access.
        const audioAttempts: MediaStreamConstraints[] = [
          { audio: true, video: opts.withVideo },
          {
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
            video: opts.withVideo,
          },
          { audio: true, video: false },
        ]
        let acquired: MediaStream | null = null
        let lastMediaError: unknown = null
        for (const constraints of audioAttempts) {
          try {
            acquired = await navigator.mediaDevices.getUserMedia(constraints)
            break
          } catch (mediaError) {
            lastMediaError = mediaError
          }
        }
        if (!acquired) {
          throw lastMediaError instanceof Error ? lastMediaError : new Error('getUserMedia failed')
        }
        localStream = acquired
        if (ended) {
          localStream.getTracks().forEach((track) => track.stop())
          return
        }
        opts.onLocalStream?.(localStream)

        pc = new RTCPeerConnection({ iceServers: opts.iceServers ?? DEFAULT_ICE_SERVERS })
        remoteStream = new MediaStream()
        localStream.getTracks().forEach((track) => pc?.addTrack(track, localStream as MediaStream))

        pc.ontrack = (event) => {
          const [stream] = event.streams
          stream?.getTracks().forEach((track) => remoteStream?.addTrack(track))
          if (remoteStream) opts.onRemoteStream(remoteStream)
        }
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            transport?.send({
              kind: 'ice',
              from: opts.selfId,
              candidate: event.candidate.toJSON(),
            })
          }
        }
        pc.onconnectionstatechange = () => {
          if (ended) return
          const state = pc?.connectionState
          if (state === 'connected') {
            if (connectTimer) {
              clearTimeout(connectTimer)
              connectTimer = null
            }
            opts.onState('connected')
          } else if (state === 'failed') {
            teardown('failed')
          } else if (state === 'disconnected') {
            opts.onState('disconnected')
          }
        }

        transport = opts.createTransport({
          onSignal: handleSignal,
          onPeerReady: () => {
            if (opts.isInitiator) void sendOffer()
          },
          onPeerLeft: () => {
            if (!ended) opts.onState('disconnected')
          },
        })
        opts.onState('waiting-for-peer')
        connectTimer = setTimeout(() => {
          if (!ended && pc?.connectionState !== 'connected') {
            fail(new Error('Connection timed out'))
          }
        }, CONNECT_TIMEOUT_MS)
      } catch (error) {
        fail(toError(error))
      }
    },
    hangup: () => {
      transport?.send({ kind: 'bye', from: opts.selfId })
      teardown('ended')
    },
    setMuted: (muted) => {
      localStream?.getAudioTracks().forEach((track) => {
        track.enabled = !muted
      })
    },
    setVideoEnabled: (enabled) => {
      localStream?.getVideoTracks().forEach((track) => {
        track.enabled = enabled
      })
    },
    getLocalStream: () => localStream,
  }
}
