// src/services/webrtc/callPush.ts
//
// Fires the incoming-call PUSH (FCM to the callee's phone + Web Push to their
// browsers) via the `send-call-push` Edge Function. Called alongside the
// Realtime invite in callInvites: Realtime rings them instantly when they're
// online; this push rings them when the app is backgrounded or closed.
//
// Best-effort + non-blocking: if it fails (or the callee is online and already
// got the Realtime invite), the call still proceeds.
import { supabase } from '../backend/client'

export const sendCallPush = async (args: {
  calleeId: string
  roomId: string
  callType: 'audio' | 'video'
  callerName: string
}): Promise<void> => {
  if (!supabase || !args.calleeId) return
  try {
    await supabase.functions.invoke('send-call-push', { body: args })
  } catch {
    // Non-fatal — the online Realtime path covers callees who are present.
  }
}
