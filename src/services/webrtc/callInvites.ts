// src/services/webrtc/callInvites.ts
//
// The "ringing" layer for P2P calls. Separate from the per-call signaling
// (./signaling): the callee doesn't yet know the call's roomId, so the invite
// must reach a channel they're ALWAYS subscribed to while logged in —
// `calls:<authUserId>`, mirroring the existing message-inbox pattern in
// App.tsx (which matches senders by Profile.authUserId).
//
// Flow:
//   caller  --invite-->  calls:<calleeId>      (callee's phone rings)
//   callee  --accept-->  calls:<callerId>      (caller transitions to connecting)
//   callee  --decline--> calls:<callerId>      (caller shows "declined")
//   caller  --cancel-->  calls:<calleeId>      (caller hung up before answer)
// Both then join `call:<roomId>` for the actual WebRTC handshake.
import { supabase } from '../backend/client'

export type CallInviteMessage =
  | { kind: 'invite'; roomId: string; callType: 'audio' | 'video'; fromId: string; fromName: string }
  | { kind: 'accept'; roomId: string; fromId: string }
  | { kind: 'decline'; roomId: string; fromId: string }
  | { kind: 'cancel'; roomId: string; fromId: string }

/** Subscribe to MY call inbox (`calls:<selfAuthId>`). Fires when someone rings
 *  me or controls a call I'm part of. Returns an unsubscribe fn. */
export const subscribeToCallInbox = (
  selfAuthId: string,
  onMessage: (message: CallInviteMessage) => void,
): (() => void) => {
  if (!supabase || !selfAuthId) {
    return () => {}
  }
  const channel = supabase
    .channel(`calls:${selfAuthId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'call' }, (payload) => {
      const message = (payload as { payload?: CallInviteMessage }).payload
      if (message) onMessage(message)
    })
    .subscribe()
  return () => {
    if (supabase) {
      void supabase.removeChannel(channel)
    }
  }
}

/** Send one call message to a peer's inbox (`calls:<peerAuthId>`). Joins the
 *  peer's channel just long enough to deliver, then leaves — invites are
 *  occasional so a short-lived channel is fine. Resolves once sent. */
export const sendCallMessage = (
  peerAuthId: string,
  message: CallInviteMessage,
): Promise<void> =>
  new Promise((resolve) => {
    if (!supabase || !peerAuthId) {
      resolve()
      return
    }
    const channel = supabase.channel(`calls:${peerAuthId}`)
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      if (supabase) void supabase.removeChannel(channel)
      resolve()
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.send({ type: 'broadcast', event: 'call', payload: message }).finally(finish)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        finish()
      }
    })
    // Safety net so a stuck subscribe never leaves a dangling promise/channel.
    setTimeout(finish, 5000)
  })
