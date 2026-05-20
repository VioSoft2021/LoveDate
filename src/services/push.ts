import { createSupabaseClient } from './supabaseClient'

const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

export const pushSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    VAPID_PUBLIC_KEY.length > 0
  )
}

export const pushPermissionStatus = (): NotificationPermission | 'unsupported' => {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Request notification permission, subscribe the current browser to push,
 * and persist the subscription to Supabase so the send-push Edge Function
 * can fan messages out to this device. Idempotent — calling twice with an
 * already-active subscription just re-upserts the row.
 */
export const enablePushNotifications = async (): Promise<
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'no-subscription' | 'no-auth' | 'save-failed' }
> => {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }

  const supabase = createSupabaseClient()
  if (!supabase) return { ok: false, reason: 'no-auth' }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return { ok: false, reason: 'no-auth' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    } catch (err) {
       
      console.warn('pushManager.subscribe failed:', err)
      return { ok: false, reason: 'no-subscription' }
    }
  }

  const raw = subscription.toJSON()
  const endpoint = raw.endpoint
  const p256dh = raw.keys?.p256dh
  const auth = raw.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, reason: 'no-subscription' }
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
      { onConflict: 'user_id,endpoint' },
    )
  if (error) {
     
    console.warn('push_subscriptions upsert failed:', error.message)
    return { ok: false, reason: 'save-failed' }
  }
  return { ok: true }
}

export const disablePushNotifications = async (): Promise<void> => {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const supabase = createSupabaseClient()
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.user?.id) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', session.user.id)
        .eq('endpoint', subscription.endpoint)
    }
  }
  await subscription.unsubscribe()
}
