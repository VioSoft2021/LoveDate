# Waitlist v2 — full mini-questionnaire + magic-link follow-up

**Decided 2026-05-27.** Master picked the most ambitious option on all
three questions in our criteria discussion:
- Form shape: full mini-questionnaire (7 fields)
- Borderline handling: magic-link reply page (option B)
- Gender balance: active 2:1 gating

## The 7 fields the public waitlist form will collect

All required, in this order:

1. **First name**
2. **Email**
3. **Age** (number, 18+)
4. **Gender** (Man / Woman / Other)
5. **City**
6. **Looking for** (Long-term / Open / Not sure yet)
7. **"Why Privé, in one paragraph?"** (free text, replaces today's `note`)

## What we're building, in order

### 1. SQL migration
- Extend `public.waitlist` table: add columns `first_name`, `age`, `gender`, `city`, `looking_for`, `admin_note`, `reply_token`, `user_reply`.
- Add `'needs-info'` to the `status` check constraint.
- Rewrite `submit_waitlist()` RPC with the new signature.
- Add `admin_request_more_info(p_id, p_question)` RPC — stores the question in `admin_note`, generates a `reply_token` (cryptographically random), flips status to `'needs-info'`.
- Add `submit_waitlist_reply(p_token, p_reply)` anon-accessible RPC — looks up by token, stores the reply, flips status back to `'pending'`.
- Update `admin_list_waitlist` RPC return shape to include all new fields + the count breakdown by gender for the ratio header.

### 2. Privé client — public form (LoginScreen)
- Expand the existing waitlist surface to render 7 fields.
- EN + RO copy in `uiText.ts`.
- Validation: age ≥ 18, all fields non-empty, gender from the 3-option list, looking-for from the 3-option list.
- Submit calls `backendSubmitWaitlist` with the new payload shape.

### 3. Privé client — public reply page (new route)
- Route: `/#/waitlist-reply/<reply_token>` (hash routing already in place).
- Page renders: Privé crest header + Master's question (from `admin_note`) + a single textarea for the reply + Submit button.
- Submit calls `submit_waitlist_reply(token, reply)`. After success, shows a quiet "thank you, we'll come back to you soon" confirmation.
- Token-only access — no email check, no auth. Token is the gate; it's random enough to be unguessable.

### 4. InviteAdmin — Waitlist panel
- Render the 7 new fields in each row (compact card: name + age/gender/city/looking-for chip row + the paragraph in a collapsible). 
- New "Ask for info" button on each pending row → opens a small textarea for Master's question → calls `admin_request_more_info`.
- For rows with status `'needs-info'`: show Master's question + (if replied) the user's reply.
- Header counter: "X men · Y women · Z other · ratio M:W = N.NN".
- Gating: when approving would push the ratio past 2:1 in either direction, show a confirmation modal: "This will make the pool X men : Y women (Z:1). Approve anyway?"

### 5. Tests + APK + ship
- Update `App.test.tsx` (Privé) for the new form fields.
- Update `App.test.tsx` (InviteAdmin) for the new panel shape.
- `npx tsc -b --noEmit` clean on both repos.
- Rebuild InviteAdmin APK, `adb install -r`.
- Commit + push both repos.

## Estimated effort
~2 hours total.

## Files we'll touch

**Privé:**
- `scripts/2026_05_27_waitlist_v2.sql` (new)
- `src/screens/LoginScreen.tsx` — form expansion
- `src/screens/WaitlistReplyScreen.tsx` (new) — magic-link reply page
- `src/App.tsx` — route the new screen
- `src/constants/uiText.ts` — EN + RO copy for new fields + reply page
- `src/services/backendApi.ts` — `backendSubmitWaitlist` signature change + new `backendSubmitWaitlistReply`

**InviteAdmin:**
- `src/services/waitlistService.ts` — WaitlistEntry type + new fields + `requestMoreInfo` action
- `src/components/WaitlistPanel.tsx` — render fields, ratio header, gating modal, ask-for-info button

## Why these picks defend Privé's positioning

The 7-field form filters tire-kickers via friction itself — anyone who fills it out really wants in. Gender-ratio gating prevents the "one-gender pool, no matches" failure mode that kills small dating apps. Magic-link follow-up lets Master have a hand-touch conversation with borderline applicants without writing yet-another off-platform email — and the reply ends up structured in InviteAdmin, not lost in his inbox.

Built for Master's solo-operator scale: works for 1 request/week and 100 requests/week, with the same workflow.
