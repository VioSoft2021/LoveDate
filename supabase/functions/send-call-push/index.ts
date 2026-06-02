// Privé — incoming-call push fanout.
//
// Called by the CALLER's client (supabase.functions.invoke) right after it
// broadcasts a Realtime call invite. Rings the callee even when their app is
// closed/backgrounded by pushing to:
//   • their phone(s) via FCM HTTP v1  (device_push_tokens)
//   • their browser(s) via Web Push   (push_subscriptions)
//
// The caller is taken from the verified JWT (NOT from the body), so a client
// can only ring as itself. The body supplies who to ring + the call coords.
//
// Required secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT      (web push)
//   FCM_SERVICE_ACCOUNT  = the Firebase service-account JSON (string)  (native)
// FCM is skipped gracefully if FCM_SERVICE_ACCOUNT is unset (web push still
// fires), so this works before Firebase is fully wired.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

type Body = {
  calleeId: string
  roomId: string
  callType: 'audio' | 'video'
  callerName?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })

// ── FCM HTTP v1 auth (service-account → OAuth2 access token) ───────────────
const b64urlFromString = (s: string) =>
  btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const b64urlFromBytes = (bytes: Uint8Array) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const pemToDer = (pem: string): Uint8Array => {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

type ServiceAccount = { client_email: string; private_key: string; project_id: string }

const getFcmAccessToken = async (sa: ServiceAccount): Promise<string> => {
  const now = Math.floor(Date.now() / 1000)
  const header = b64urlFromString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64urlFromString(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const unsigned = `${header}.${claim}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  )
  const jwt = `${unsigned}.${b64urlFromBytes(new Uint8Array(sig))}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('FCM token exchange failed: ' + JSON.stringify(data))
  return data.access_token as string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: 'missing server secrets' }, 500)
  }

  // Identify the caller from the verified JWT (don't trust the body for this).
  const authHeader = req.headers.get('Authorization') ?? ''
  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await asCaller.auth.getUser()
  const callerId = userData?.user?.id
  if (!callerId) return json({ error: 'unauthorized' }, 401)

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  if (!body?.calleeId || !body?.roomId) return json({ error: 'calleeId + roomId required' }, 400)
  const callType: 'audio' | 'video' = body.callType === 'video' ? 'video' : 'audio'

  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Resolve the caller's display name server-side (trustworthy), fall back to
  // the body, then a generic label.
  let callerName = body.callerName?.trim() || 'Privé'
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('name')
    .eq('auth_user_id', callerId)
    .maybeSingle()
  if (callerProfile?.name) callerName = String(callerProfile.name)

  const callTitle = callerName
  const callBody = callType === 'video' ? 'Incoming video call' : 'Incoming call'
  const dataPayload = {
    type: 'incoming_call',
    roomId: body.roomId,
    callType,
    callerId,
    callerName,
  }

  let nativeSent = 0
  let webSent = 0

  // ── Native (FCM v1) ────────────────────────────────────────────────────
  const fcmRaw = Deno.env.get('FCM_SERVICE_ACCOUNT')
  if (fcmRaw) {
    try {
      const sa = JSON.parse(fcmRaw) as ServiceAccount
      const { data: tokens } = await admin
        .from('device_push_tokens')
        .select('id, token')
        .eq('user_id', body.calleeId)
      if (tokens && tokens.length > 0) {
        const accessToken = await getFcmAccessToken(sa)
        const deadTokenIds: string[] = []
        await Promise.all(
          tokens.map(async (row) => {
            try {
              const res = await fetch(
                `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    message: {
                      token: row.token,
                      notification: { title: callTitle, body: callBody },
                      data: dataPayload,
                      // No custom channel_id — the app hasn't created a "calls"
                      // channel, and Android silently drops notifications posted to
                      // a non-existent channel. Omitting it uses the FCM fallback
                      // channel (proven to display in the direct test).
                      android: { priority: 'high' },
                    },
                  }),
                },
              )
              if (res.ok) {
                nativeSent++
              } else {
                const errText = await res.text()
                // Stale/unregistered tokens → purge so we stop hammering them.
                if (res.status === 404 || /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/.test(errText)) {
                  deadTokenIds.push(row.id as string)
                } else {
                  console.warn('fcm send failed', res.status, errText)
                }
              }
            } catch (err) {
              console.warn('fcm send error', (err as Error).message)
            }
          }),
        )
        if (deadTokenIds.length > 0) {
          await admin.from('device_push_tokens').delete().in('id', deadTokenIds)
        }
      }
    } catch (err) {
      console.warn('fcm block failed', (err as Error).message)
    }
  }

  // ── Web (VAPID Web Push) ───────────────────────────────────────────────
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@prive-app.club'
  if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', body.calleeId)
    if (subs && subs.length > 0) {
      const payload = JSON.stringify({ title: callTitle, body: callBody, ...dataPayload })
      const deadIds: string[] = []
      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
            )
            webSent++
          } catch (err: unknown) {
            const status = (err as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) deadIds.push(sub.id as string)
            else console.warn('webpush call send failed', status, (err as Error).message)
          }
        }),
      )
      if (deadIds.length > 0) await admin.from('push_subscriptions').delete().in('id', deadIds)
    }
  }

  return json({ ok: true, nativeSent, webSent })
})
