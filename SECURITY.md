# Privé — security checklist

Last audited: 2026-05-21 (post custom-domain migration). This is a one-page checklist for the operator (Master), not a policy doc. Items are sorted by severity.

---

## What's exposed at the public URL

The deploy URL is now **`https://prive-app.club`** (custom domain, HTTPS live as of 2026-05-21). The old `viosoft2021.github.io/LoveDate/` URL still works but auto-redirects to the custom domain — and no longer leaks the GitHub username in the address bar.

What still leaks (lower-impact now):
- **Repo source** if `VioSoft2021/LoveDate` is still public — every line of code, every commit message. The repo URL is no longer in the user-facing address bar, but anyone who runs `whois` or guesses the public-repo pattern can find it.
- **Past commit authors** — git history may expose real names/emails of past contributors.

Mitigation: privatize the repo (see §6 below). Less urgent now that the URL no longer fingerprints the operator.

---

## RLS audit summary

| Table | RLS | Posture | Verdict |
|---|---|---|---|
| `beta_invites` | ✓ | Public read active+unexpired | OK |
| `profiles` | ✓ | Public read where `is_active=true`; writes via SECURITY DEFINER | OK structurally, see §1 |
| `user_settings` | ✓ | Owner-only | OK |
| `user_preferences` | ✓ | Owner-only | OK |
| `user_profiles` | ✓ | Owner-only | OK |
| `swipes` | ✓ | Owner-only (`liker_id`) | OK |
| `user_blocks` | ✓ | Owner-only | OK |
| `safety_reports` | ✓ | Owner insert+select; admin select+update | OK |
| `chat_messages` | ✓ | Sender/recipient select; sender insert only if matched | OK |
| `push_subscriptions` | ✓ | Owner-only | OK |
| **Storage** `profile-photos` | n/a | Public read; writes to `auth.uid()/` folder | OK by design — photos are meant to be seen |

Every base table has RLS enabled. No `using (true)` policies, no missing INSERT/UPDATE guards. The Supabase anon key alone cannot read private data — that protection holds.

---

## Findings — fix in this order

### 1. `personalityAnswers` + `dealbreakers` are publicly readable — HIGH

These ride along in `profiles.extras` (a `jsonb` column included in [scripts/supabase_beta_setup.sql:189](scripts/supabase_beta_setup.sql#L189)), and the `profiles_public_read` policy ([scripts/supabase_beta_setup.sql:138](scripts/supabase_beta_setup.sql#L138)) hands the entire row to anyone with the anon key when `is_active=true`.

- `dealbreakers` is user-written private feedback ("rudeness, dishonesty").
- `personalityAnswers` is the raw quiz answers used to derive the personality code — letting strangers read the answers lets them reverse-engineer your compatibility math.

**Fix:** strip these from `extras` before the upsert, OR move them to a private adjacent table (`profile_private` with owner-only RLS) and keep public `profiles.extras` lean. I can do this in a follow-up commit.

### 2. Admin emails hardcoded in committed SQL — HIGH (PII)

[scripts/supabase_beta_setup.sql:471](scripts/supabase_beta_setup.sql#L471) lists `viomediere@gmail.com` and `viorelbox1@gmail.com` in plaintext in a **public** repo. These emails are now Google-indexed against the repo URL.

**Fix:** move the admin allowlist into a `private.admins` table (or a Postgres setting) instead of literal SQL. Mid-priority — the emails are already out there, but stop the bleeding for any new operator emails.

### 3. Anthropic API key rotation — HIGH (per memory)

A previous chat session pasted an Anthropic key in plain text. Per the memory note, that key is compromised and rotation status is unknown.

**To rotate (do this yourself, in the Anthropic + Supabase dashboards — NEVER in chat):**
1. Anthropic Console → API Keys → revoke the old key.
2. Create a new key. Copy it once; never paste it anywhere except step 3.
3. Supabase Dashboard → Project Settings → Edge Functions → Secrets → update `ANTHROPIC_API_KEY` to the new value.
4. (No code changes; functions read the secret at request time.) Verify by calling any AI feature in the app — if it works, the new key is live.

### 4. URL fingerprint — ~~MEDIUM~~ ✅ RESOLVED 2026-05-21

The deployed URL is now `https://prive-app.club` (custom domain on GitHub Pages, Let's Encrypt SSL auto-provisioned). The old `viosoft2021.github.io/LoveDate/` URL auto-redirects to the custom domain. The GitHub username is no longer exposed in the public address bar.

### 5. Custom domain — ✅ DONE 2026-05-21

Migrated to `prive-app.club`. CNAME committed in `public/CNAME`. DNS A records point at the GitHub Pages IPs. HTTPS via Let's Encrypt. The "Enforce HTTPS" toggle is on in repo Pages settings.

Remaining domain hygiene:
- `prive.ro` not registered (deferred — international brand positioning doesn't require it; can grab defensively later if needed).
- Supabase Auth redirect URLs may need updating to include `https://prive-app.club` if OAuth / magic-link flows fail. Master to verify in Supabase Dashboard → Authentication → URL Configuration.

### 6. Privatize the repo — LOW (defense in depth)

GitHub Pages serves public repos publicly. If you want to keep deploying from a private repo:
- Move LoveDate to a private repo, OR
- Switch deploy to **Cloudflare Pages** or **Vercel** — both deploy from private GitHub repos on the free tier and are faster than GH Pages.

This stops anyone from reading source code and commit history. Do this **after** the custom domain so URLs stay stable.

### 7. Git author identity — LOW

Current git config is `LoveDate Local`, which is fine. Past commits may include real names/emails. Audit with:
```bash
git log --format="%ae %an" | sort -u
```
If real PII shows up, it's already public — can only be erased via repo rewrite (`git filter-repo`), which breaks every existing clone.

---

## What's correctly handled — keep doing this

- All Anthropic calls go through Supabase Edge Functions; the API key never ships to the client.
- RLS is enabled on every base table; no `using (true)` policies.
- Storage writes restricted to `auth.uid()/` folders so users can't overwrite each other's photos.
- HTTPS enforced by GitHub Pages.
- Service worker auto-reload signs users out on update (intentional — "fresh login on cold start").
- The Supabase anon key in the client is the correct kind of key to expose; security depends on RLS, which is intact.

---

## Quick wins I can ship now (just say the word)

- [ ] Move `personalityAnswers` + `dealbreakers` out of public `extras` into a private `profile_private` table (~1 commit)
- [ ] Replace hardcoded admin emails with a private `admins(user_id)` table (~1 commit)
- [ ] Prep `public/CNAME` + adjust `vite.config.ts base` once you've picked a domain (~5 min)
- [ ] Audit past commit authors via `git log` and flag anything with real PII

You do the Anthropic key rotation and domain registration yourself — those need credentials I shouldn't touch.
