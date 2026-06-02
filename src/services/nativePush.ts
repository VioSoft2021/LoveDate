// src/services/nativePush.ts
//
// Native (Capacitor/Android) push wiring for OFFLINE CALL RINGING. On the
// installed app it registers the device's FCM token (stored in
// `device_push_tokens`) and listens for incoming-call data pushes sent by the
// `send-call-push` Edge Function — so a call can ring even when the app is
// backgrounded or closed.
//
// No-op on the web (browser/PWA users are covered by Web Push via the service
// worker + the existing push_subscriptions flow), and degrades silently if FCM
// isn't configured yet (no google-services.json) or the user denies the
// notification permission.
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase, getCurrentUserId } from './backend/client'

export type IncomingCallPush = {
  roomId: string
  callType: 'audio' | 'video'
  callerId: string
  callerName: string
}

let incomingHandler: ((call: IncomingCallPush) => void) | null = null
let buffered: IncomingCallPush | null = null
let initialized = false

/** Register the handler that turns an incoming-call push into a ringing UI.
 *  If a push already arrived before the handler was set (cold start from a
 *  notification tap), it's delivered immediately. */
export const setIncomingCallPushHandler = (
  handler: ((call: IncomingCallPush) => void) | null,
): void => {
  incomingHandler = handler
  if (handler && buffered) {
    const pending = buffered
    buffered = null
    handler(pending)
  }
}

const emitIncoming = (call: IncomingCallPush): void => {
  if (incomingHandler) incomingHandler(call)
  else buffered = call
}

const toIncomingCall = (data: unknown): IncomingCallPush | null => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (d.type !== 'incoming_call' || !d.roomId || !d.callerId) return null
  return {
    roomId: String(d.roomId),
    callType: d.callType === 'video' ? 'video' : 'audio',
    callerId: String(d.callerId),
    callerName: typeof d.callerName === 'string' && d.callerName ? d.callerName : 'Privé',
  }
}

/** Idempotently set up native push: request permission, register for FCM, save
 *  the token, and wire incoming-call listeners. Safe to call on every auth. */
export const initNativePush = async (): Promise<void> => {
  if (initialized || !Capacitor.isNativePlatform()) return
  initialized = true
  try {
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== 'granted') {
      initialized = false // allow a later retry (e.g. user enables it in Settings)
      return
    }

    await PushNotifications.addListener('registration', (token) => {
      void (async () => {
        const userId = await getCurrentUserId()
        if (!userId || !supabase) return
        await supabase
          .from('device_push_tokens')
          .upsert(
            { user_id: userId, token: token.value, platform: Capacitor.getPlatform() },
            { onConflict: 'user_id,token' },
          )
      })()
    })

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const call = toIncomingCall(notification.data)
      if (call) emitIncoming(call)
    })

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const call = toIncomingCall(action.notification?.data)
      if (call) emitIncoming(call)
    })

    await PushNotifications.register()
  } catch {
    // FCM not configured yet (no google-services.json) or registration failed —
    // online Realtime + Web Push still cover their cases.
    initialized = false
  }
}
