// src/services/webrtc/signaling.ts
//
// WebRTC signaling over Supabase Realtime — the FREE transport that replaces
// Jitsi. A "call" is a Realtime channel `call:<roomId>` that both peers join:
//   - SDP offer/answer + ICE candidates travel as `broadcast` events, and
//   - `presence` tells the initiator when the other peer has actually arrived,
//     so the one-shot offer is never broadcast into an empty room (the classic
//     signaling race). No media ever touches a server — this only carries the
//     handshake; audio/video flow peer-to-peer once connected.
//
// Mirrors the existing Realtime pattern in services/backend/chat.ts
// (`supabase.channel(...).subscribe()` + `supabase.removeChannel(...)`).
import { supabase } from '../backend/client'

export type SignalMessage =
  | { kind: 'offer'; from: string; sdp?: string }
  | { kind: 'answer'; from: string; sdp?: string }
  | { kind: 'ice'; from: string; candidate: RTCIceCandidateInit }
  | { kind: 'bye'; from: string }

export type SignalingHandlers = {
  /** A signaling message arrived from the OTHER peer (own echoes filtered). */
  onSignal: (message: SignalMessage) => void
  /** The other peer is now present in the room (fired once, on first arrival). */
  onPeerReady: () => void
  /** The other peer left the room. */
  onPeerLeft?: () => void
}

export type SignalingTransport = {
  send: (message: SignalMessage) => void
  close: () => void
}

/** A transport is created lazily by the call session, which wires in its own
 *  handlers — this keeps the session in control and makes it trivial to swap a
 *  loopback transport in for tests. */
export type TransportFactory = (handlers: SignalingHandlers) => SignalingTransport

/** Build a Supabase-Realtime signaling transport for a given room + self id. */
export const createSupabaseSignaling =
  (roomId: string, selfId: string): TransportFactory =>
  ({ onSignal, onPeerReady, onPeerLeft }) => {
    if (!supabase) {
      return { send: () => {}, close: () => {} }
    }
    let peerPresent = false
    const channel = supabase.channel(`call:${roomId}`, {
      config: { broadcast: { self: false }, presence: { key: selfId } },
    })

    channel.on('broadcast', { event: 'signal' }, (payload) => {
      const message = (payload as { payload?: SignalMessage }).payload
      if (message && message.from !== selfId) {
        onSignal(message)
      }
    })

    const evaluatePresence = () => {
      const others = Object.keys(channel.presenceState()).filter((key) => key !== selfId)
      if (others.length > 0 && !peerPresent) {
        peerPresent = true
        onPeerReady()
      } else if (others.length === 0 && peerPresent) {
        peerPresent = false
        onPeerLeft?.()
      }
    }
    channel.on('presence', { event: 'sync' }, evaluatePresence)
    channel.on('presence', { event: 'join' }, evaluatePresence)
    channel.on('presence', { event: 'leave' }, evaluatePresence)

    void channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track({ id: selfId })
      }
    })

    return {
      send: (message) => {
        void channel.send({ type: 'broadcast', event: 'signal', payload: message })
      },
      close: () => {
        if (supabase) {
          void supabase.removeChannel(channel)
        }
      },
    }
  }
