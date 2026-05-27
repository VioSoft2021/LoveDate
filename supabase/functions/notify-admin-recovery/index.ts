// Privé — Password-recovery request inbox (2026-05-26 v2)
//
// When a beta visitor taps "Forgot password?" on the Sign-In card and
// submits their email, the client calls this Edge Function. Instead of
// emailing anyone (no Resend, no Supabase mailer, no DNS verification),
// the function:
//   1. Uses the service_role key to call auth.admin.generateLink with
//      type='recovery' for the given email. Supabase returns a URL
//      containing a one-time recovery token but does NOT send any email.
//   2. Inserts a row into public.recovery_requests with the user's
//      email + the recovery link + status='pending'.
//   3. Master opens the InviteAdmin app, sees the pending request,
//      copies the link, and sends it to the user himself via WhatsApp /
//      Signal / email / whatever channel works for that person.
//
// This is the simplest possible implementation: no third-party email
// service, no rate limits beyond Supabase, no recipient whitelist, one
// admin inbox to check.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Redirect target after the user clicks the recovery link. Privé's
// client picks the recovery token out of window.location.hash at boot
// (services/initialHash.ts) and shows the "Set a new password" card.
const REDIRECT_TO = 'https://prive-app.club/'

type RequestBody = {
  email?: string
}

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'invalid email' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'server misconfigured' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Generate a recovery URL. Supabase returns the URL but does NOT send
  // an email — the email-template-driven send only fires when you call
  // auth.resetPasswordForEmail(). If the email isn't in auth.users,
  // generateLink returns a 404 / "user not found" error. We treat that
  // as success on the client side to prevent user enumeration, and we
  // skip the insert (nothing useful to deliver).
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: REDIRECT_TO },
  })

  if (error || !data?.properties?.action_link) {
    console.warn(
      '[notify-admin-recovery] generateLink failed for',
      email,
      error?.message ?? 'no action_link',
    )
    return json({ ok: true }, 200)
  }

  const recoveryLink = data.properties.action_link

  const { error: insertError } = await admin
    .from('recovery_requests')
    .insert({ email, recovery_link: recoveryLink })

  if (insertError) {
    console.warn('[notify-admin-recovery] insert failed:', insertError.message)
    return json({ error: 'failed to record request' }, 500)
  }

  return json({ ok: true }, 200)
})
