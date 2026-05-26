# Resend Domain Verification — final SMTP setup

**Status:** the only remaining step to make password-recovery emails (and any future email — welcome, drip, etc.) deliverable to any recipient, not just `admin@prive-app.club`.

**Why this is needed:** Resend's free tier restricts the `onboarding@resend.dev` shared sender to recipients verified on your Resend account. Your own `admin@prive-app.club` is auto-verified, so sends there work. Sends to `viorelbox1@gmail.com` or any other address are rejected at the SMTP layer with `Error sending recovery email`. Verifying `prive-app.club` as a sending domain removes this restriction entirely.

**Total time:** ~5 minutes of clicks + ~5–15 minutes of DNS propagation wait. No code changes — the app side is already done and tested (342 tests).

---

## Step 1 — Add the domain in Resend

1. [resend.com](https://resend.com) → sign in → **Domains** (left sidebar).
2. Click **+ Add Domain**.
3. Enter `prive-app.club` → click **Add**.
4. Resend will display ~3 DNS records: one **SPF** (TXT), one **DKIM** (TXT), optionally one **return-path** (CNAME). Keep this tab open — you'll need to copy these values.

## Step 2 — Add the DNS records at your domain registrar

Wherever you bought `prive-app.club`. The records you copy from Resend look like:

| Type | Host / Name | Value |
|---|---|---|
| TXT | `send` (or `@`) | `v=spf1 include:amazonses.com ~all` |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqG...` (long string) |
| CNAME | `send` (sometimes) | `feedback-smtp.us-east-1.amazonses.com` |

(Exact values shown by Resend take precedence over the example above.)

Common registrar UIs:
- **Namecheap**: Domain List → Manage → Advanced DNS → Add New Record (one row per DNS record).
- **GoDaddy**: My Products → DNS → DNS Records → Add.
- **Cloudflare**: Websites → prive-app.club → DNS → Records → + Add record. **Turn off the proxy (orange cloud → grey)** for email-related records.
- **Hover**: Domains → prive-app.club → DNS → Add a Record.

Paste each Resend record exactly. Save.

## Step 3 — Wait + verify

1. Back in Resend → Domains → `prive-app.club` page.
2. Click **Verify DNS Records** (or wait — it auto-rechecks).
3. Status flips from Pending → **Verified**. Usually 5–15 min; can take an hour on slow registrars.

## Step 4 — Switch Supabase to send from the verified domain

1. Supabase Dashboard → **Authentication** → **Emails** → **SMTP Settings**.
2. Change **Sender email** from `onboarding@resend.dev` → `noreply@prive-app.club` (or any address on the verified domain).
3. **Sender name** stays as `Privé`.
4. All other fields (Host: `smtp.resend.com`, Port: `465`, Username: `resend`, Password: your API key) stay unchanged.
5. Save.

## Step 5 — Test

Send a password recovery to ANY email address (your `viorelbox1@gmail.com`, a fresh Gmail, anything). It should arrive within 30 seconds. The Resend Logs view will show a `Delivered` status. The recovery link will land on the "Set a new password" card on `prive-app.club` (this part is already shipped and tested — commit `c401d75`).

---

## What's already done in code

- Password-recovery URL token handling — `src/services/initialHash.ts` captures the recovery hash before any Supabase client can consume it. (Commit `d2f3b00`.)
- Recovery card UI — `LoginScreen.tsx` renders the "Set a new password" form when `passwordRecoveryActive` is true. Hero return no longer swallows the recovery branch.
- Forgot-password inline form — `LoginScreen.tsx`, accessible from the Sign-In card, calls `supabase.auth.resetPasswordForEmail`.
- 22 new tests covering every layer of the flow (commit `c401d75`).

When verification completes, no further code changes are needed.

---

## If something goes sideways

- **Resend shows "Failed to verify" after waiting 30+ min**: re-check the DNS records at the registrar. Most failures are typos in the long DKIM value, or the registrar adding a trailing dot to the value.
- **Cloudflare DNS proxy is enabled**: turn it off for SPF / DKIM records (set the cloud icon to grey, not orange).
- **Recovery email still fails after Step 4**: check Resend Logs first; the rejection reason will say exactly which record / sender is wrong.

---

**Authored 2026-05-26.** Updated whenever the SMTP setup changes.
