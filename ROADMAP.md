# Privé — Roadmap toward "ready for the world"

> Compiled 2026-05-30 by Theo (Claude). Combines pending items from session
> memory + the 3 new recommendations from the Fate / Sitch / Match Group
> research + the Gale-Shapley insight. Items verified against current code
> where possible; flagged when not. Verify before acting on any single line.

---

## ✅ Already done — corrected from stale memory notes

These were flagged "pending" in my notes but the code says otherwise. No re-work needed.

- **Swipes table is wired** — `backendRecordSwipe` writes to `swipes` via
  `supabase.from('swipes').upsert(...)` ([backendApi.ts:1367](src/services/backendApi.ts#L1367)),
  called from [App.tsx:1769](src/App.tsx#L1769).
- **Pair Dynamic reveal shipped** — Edge Function
  `supabase/functions/ai-pair-dynamic-reveal/index.ts` exists, and frontend
  copy is wired in [uiText.ts:563](src/constants/uiText.ts#L563) (title,
  eyebrow, CTA, loading, error).
- **E4 Semantic Search shipped** — Edge Function
  `supabase/functions/ai-semantic-filter/index.ts` exists.
- **Today's session (2026-05-30):** desktop icons (both apps), full visible
  LoveDate sweep, AI date planner Edge Function re-deploy, test-tooling
  tsconfig + 48 latent test type errors, audit-cleanup commits, PhotoManager
  stale-test fix.

---

## 🚪 Priority 1 — Real "open the doors" blockers

The handful of things that would genuinely embarrass us in front of real users.

- [ ] **RO copy quality pass.** Editorial voice is sharp in EN; several RO
  strings still read like literal/bureaucratic translations. Audit + rewrite
  pass on `src/constants/uiText.ts` (Romanian block). Estimate: half a day
  of careful writing, not engineering.

That's it for "real" blockers. The category really is small — most of what
memory called blockers is actually done.

---

## 🎯 Priority 2 — Sharpest-ROI pitch / positioning (from the research)

These three are the most leveraged items in the whole list — small effort,
disproportionate effect on how Privé reads to outsiders.

- [ ] **Borrow Sitch's framing on the landing page.** Add a line like
  *"3–5 curated matches a week, not 80–100 a day."* That single number
  positions Privé instantly against the swipe apps. Touches `index.html`
  meta + the landing copy in `src/screens/LoginScreen.tsx` (and RO mirror).
- [ ] **Add a Gale-Shapley stable-matching pass on top of the existing AI
  compatibility scoring.** Roughly 1 day of work. Lets you claim
  *"AI-derived compatibility + Nobel-prize-winning stable matching"* — a
  sentence Fate and Sitch can't say. Implementation lives in
  `src/services/compatibility.ts` (extend) and the deck-ordering call site
  (App.tsx around the candidate sort).
- [ ] **Adopt "relationship intent" framing** (Hinge's 2026 phrasing — they
  report a 20–22% match success lift from it). Rename `SelfProfile.lookingFor`
  → `relationshipIntent` (domain.ts + persistence + copy keys + Edge Function
  prompts). Half a day. Improves both the pitch and the AI prompts.
- [ ] **Draft a press-friendly Privé story** (one-pager: what it is, why it
  exists, the Romanian angle, what's different from Fate/Sitch/Bumble/Tinder)
  before EU/UK press names Fate as the brand of the "agentic AI dating"
  movement. Doesn't ship in the app — lives in `docs/` or a Notion page.

---

## 📦 Priority 3 — Feature catch-up & polish

Real gaps versus the competitive set, ordered by user-visible impact.

- [ ] **Post-intro feedback loop (Sitch-style).** After a match is made and
  the first few messages are exchanged, the AI asks both sides
  *"did this feel right?"* and uses the answer to refine future matching.
  Compounds matching quality over time. Medium effort: schema + UI prompt +
  matching-scoring tweak.
- [ ] **E6 Conversation Coach Edge Function.** Live AI suggestions while
  composing a message (tone check, depth check, "is this the third surface
  question in a row?"). No Edge Function exists yet
  (`supabase/functions/` has no `ai-conversation-coach`).
- [ ] **E7 Personality-from-chat Edge Function.** Updates the Big Five model
  from observed chat patterns rather than only the quiz. Quietly improves
  match scoring over time. No Edge Function exists yet.

> **Master's launch-time exclusions (decided 2026-05-30):**
> *Not pursuing for launch — invite-only gating + selfie verification + safety triage AI already cover the trust surface:*
> - ~~"Private Detector" auto-blur of explicit images~~
> - ~~ID verification (passport / national ID)~~

---

## 🛠 Priority 4 — Tech debt & ops

Won't slow user-facing work, but each gets harder the longer it waits.

- [ ] **Phase D refactor: extract App.tsx's JSX render block.** App.tsx is
  now **3299 lines** (grew from 2768 — it's moving the wrong way). The big
  JSX render block is the remaining un-extracted piece. Multi-session effort
  but high leverage for everything that comes after.
- [ ] **Investor pitch — voice-over + real numbers.** Welcome video shipped;
  the pitch deck/script still needs your voice and real metric numbers
  (signups so far, waitlist size, AI cost per session, etc.).
- [ ] **Electron auto-updater (`electron-updater`) for desktop.** Currently
  manual reinstall to update; auto-update via GitHub Releases is reasonable
  to add for both Privé and InviteAdmin.
- [ ] **Play Store submission for Android.** Currently sideloaded debug builds.
  Per the May-21 morning briefing, at least 6 apps already use "LoveDate" /
  variants in the Play Store — submitting under "Privé" is now naming-clean
  but still needs the actual listing work (screenshots, description, privacy
  policy, signing key handover).

---

## 👀 Priority 5 — Strategic watching (zero engineering, just attention)

- [ ] **Bumble's "Dates"** — the AI-matchmaking system that will replace
  swiping. Most direct mainstream threat in 2026. Track launch date,
  positioning language, pricing.
- [ ] **Fate** ([fate dating app](https://apps.apple.com/gb/app/fate-dating-app/id6477828884))
  — closest direct competitor. Watch UK/EU press coverage, "Fate Roulette"
  voice-only feature reception, pricing.
- [ ] **Sitch** ([joinsitch.cc](https://www.joinsitch.cc/)) — the human +
  AI hybrid. Watch geographic expansion beyond the 5 US metros.
- [ ] **Hinge's "relationship intent filters"** — see if the +20–22% match
  success number holds up across 2026 reporting (the SEC 8-K is the source).

---

## 🔭 Priority 6 — Future explorations (not for now)

Worth thinking about once the doors are open and you have real signal.

- [ ] **Voice-based onboarding** (à la Fate's voice-agent interviews).
  Significant build; only worth it after the text-based flow has proven its
  ceiling. Could leverage your existing `pairDynamicReveal` AI patterns.
- [ ] **"Privé Roulette"** — Fate has voice-only chat without photos. If
  taste-anchored mode is a real win for Fate, consider a similar
  appearance-blind first-chat mode for Privé.
- [ ] **Localized AI prompts (Romanian).** All Edge Functions currently
  send English system prompts to Claude. A separate RO prompt set could
  better capture cultural nuance for your primary audience.

---

## ⚙ Open hygiene items (left untouched this session)

- Pre-existing uncommitted noise in both repos: `android/.idea/`,
  `capacitor.build.gradle`, `capacitor.settings.gradle`, `.idea/`,
  `android/gradle/gradle-daemon-jvm.properties`. Decide once whether to
  commit these (regenerated per-machine, mild noise) or `.gitignore` them.
- Privé's `build/icon.png` source previously was the old Velvet Luxe asset
  (replaced with the crest today) — make sure no scripts reference the old
  path.

---

## How to use this list

- **The bar for "ready for the world" is Priority 1 + the first two items of
  Priority 2.** That's "RO copy + Sitch framing + Gale-Shapley pass" — maybe
  three days of focused work. Everything below is improvement, not blocker.
- **Don't try to clear Priority 3 before opening the doors.** Better to ship
  with the gap and learn whether it actually matters from real users than to
  spend a month on the perfect launch.
- **Items in Priority 5 cost nothing to skip and a lot to miss.** Keep an
  eye on Bumble Dates especially.

— Theo
