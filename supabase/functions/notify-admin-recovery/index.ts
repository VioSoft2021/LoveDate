// Privé — Password-recovery admin notification (2026-05-26)
//
// When a beta visitor taps "Forgot password?" on the Sign-In card and
// submits their email, the client calls this Edge Function. The
// function emails MASTER (admin@prive-app.club) — NOT the user — with
// a "please send a recovery link to user X" notification. Master then
// uses the Supabase Dashboard to generate a recovery link for that
// user and delivers it personally.
//
// Why this design instead of Supabase's built-in resetPasswordForEmail:
//   1. Resend free tier with the shared `onboarding@resend.dev` sender
//      restricts recipients to addresses verified on the Resend
//      account. Only admin@prive-app.club is verified, so sends to
//      real users (gmail / yahoo / etc.) get rejected at SMTP.
//   2. This function sends ONLY to admin@prive-app.club — the
//      whitelisted address — which works on the free tier today
//      without any DNS verification.
//   3. For a beta with a handful of users, having Master personally
//      handle every recovery request is intentionally high-touch and
//      keeps trust + community feel high.
//
// When real user volume arrives (50+ active users / month), this
// function can be swapped back for supabase.auth.resetPasswordForEmail
// after the prive-app.club domain is verified in Resend.
//
// Setup required before first use:
//   - Supabase Edge Function secret RESEND_API_KEY must be set to the
//     same Resend API key currently configured in Auth → SMTP. Add
//     via Supabase Dashboard → Edge Functions → Manage secrets.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ADMIN_EMAIL = 'admin@prive-app.club'
// Resend free tier: the shared `onboarding@resend.dev` sender is the
// only sender that works without verifying a custom domain. Recipients
// are restricted to addresses you've verified on the Resend account —
// admin@prive-app.club is the only one Master has verified, which is
// also the only address this function ever emails. So this works on
// free tier today, with no DNS.
const SENDER = 'Privé <onboarding@resend.dev>'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    return json({ error: 'server missing RESEND_API_KEY' }, 500)
  }

  const timestamp = new Date().toISOString()
  const subject = `Password reset request: ${email}`
  const html = `
    <!doctype html>
    <html>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1a1024;">
      <h2 style="font-family: 'Bodoni Moda', serif; color: #b78a3e; margin: 0 0 1rem;">Password reset request</h2>
      <p>A user has requested a password reset on Privé.</p>
      <table cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="color: #555; padding-right: 12px;"><strong>User email:</strong></td><td><code>${email}</code></td></tr>
        <tr><td style="color: #555; padding-right: 12px;"><strong>Requested at:</strong></td><td>${timestamp}</td></tr>
      </table>
      <p><strong>To send them a recovery link:</strong></p>
      <ol>
        <li>Open the Supabase Dashboard for Privé.</li>
        <li>Authentication → Users → search <code>${email}</code>.</li>
        <li>Click the row → <strong>⋯</strong> menu → <strong>Generate recovery link</strong>.</li>
        <li>Copy the URL Supabase returns.</li>
        <li>Send the URL to the user via email / WhatsApp / Signal — whichever you prefer.</li>
      </ol>
      <p>The user will land on the "Set a new password" card when they open the link.</p>
      <hr style="border: none; border-top: 1px solid rgba(216,184,109,0.2); margin: 2rem 0;" />
      <p style="font-size: 0.85rem; color: #888;">This notification was sent automatically by the <code>notify-admin-recovery</code> Edge Function on prive-app.club.</p>
    </body>
    </html>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER,
        to: ADMIN_EMAIL,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.warn('[notify-admin-recovery] Resend rejected:', detail)
      return json({ error: 'failed to send notification' }, 502)
    }

    return json({ ok: true }, 200)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.warn('[notify-admin-recovery] threw:', message)
    return json({ error: message }, 500)
  }
})
