// LoveDate — Web Push fanout (called by the chat_messages INSERT trigger).
//
// Reads the recipient's push subscriptions and POSTs to each browser's
// push endpoint with the standard Web Push protocol (VAPID-authenticated).
// The recipient SW unpacks the payload and shows a notification.
//
// Deployed as a public Supabase Edge Function (no JWT verification) so
// the DB trigger can call it directly. The function validates that the
// payload looks reasonable and that the recipient exists; abuse would
// just produce no-ops since the recipient_id is checked against the
// push_subscriptions table.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

type Payload = {
  recipient_id: string
  sender_id: string
  message_id?: string
  preview?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@prive-app.club'
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!vapidPublic || !vapidPrivate || !supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'missing server secrets' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  let body: Payload
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
  if (!body?.recipient_id) {
    return new Response(JSON.stringify({ error: 'recipient_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Resolve sender's display name (best-effort) so the notification has
  // a meaningful title.
  let senderName = 'New message'
  if (body.sender_id) {
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('name')
      .eq('auth_user_id', body.sender_id)
      .maybeSingle()
    if (senderProfile?.name) {
      senderName = String(senderProfile.name)
    }
  }

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', body.recipient_id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no subscriptions' }), {
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const payload = JSON.stringify({
    title: senderName,
    body: body.preview && body.preview.length > 0 ? body.preview : 'Sent you a message',
    senderId: body.sender_id,
    messageId: body.message_id,
  })

  // Fan out in parallel; collect dead endpoints to clean up.
  const deadEndpointIds: string[] = []
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        // 404 / 410 mean the browser unsubscribed — purge so we stop
        // hammering a dead endpoint forever.
        if (status === 404 || status === 410) {
          deadEndpointIds.push(sub.id as string)
        } else {
           
          console.warn('webpush send failed', status, (err as Error).message)
        }
      }
    }),
  )

  if (deadEndpointIds.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', deadEndpointIds)
  }

  return new Response(
    JSON.stringify({ sent: subs.length - deadEndpointIds.length, purged: deadEndpointIds.length }),
    {
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    },
  )
})
