/**
 * Lightweight Guest Tour constants, split out from demoProfiles.ts so the
 * heavy DEMO_PROFILES / DEMO_PAIR_DYNAMIC_REVEALS fixtures stay behind a
 * dynamic import. These small values are imported statically in hot paths
 * (App.tsx, useAuth.ts, pairDynamicReveal.ts), so keeping them here prevents
 * the bulky demo data from being pulled into the main bundle.
 */

/**
 * The synthetic "self" identity Guest Tour uses. Not a real Supabase
 * auth user — these values are populated in local state only and
 * used as a marker in the AI wrappers (e.g. pair-dynamic-reveal
 * short-circuits to canned reveals when selfId equals this).
 */
export const DEMO_GUEST_EMAIL = 'guest@prive-app.club'

/**
 * Lightweight auto-reply lines used when a guest sends a message
 * to one of the pre-matched profiles. Picked round-robin per thread
 * so the conversation feels alive without going off-brand. Pure
 * client-side — no AI call.
 */
export const DEMO_AUTO_REPLIES: Record<number, readonly string[]> = {
  90001: [
    'Saturday works. 4pm?',
    'Send me a piece you wish more people knew.',
    'I love that you write like you talk. Most people don\'t.',
  ],
  90002: [
    'Last weekend in June, weather permitting?',
    'Bring the Bauhaus book you mentioned. I want to see.',
    'There\'s a small place in Cotroceni that opens at 7am. Coffee?',
  ],
} as const

/**
 * Fallback auto-replies for any demo profile not in the curated map
 * above (i.e. whoever the guest swiped right on during the tour).
 * Intentionally generic-but-warm so they land plausibly on any
 * first-message — the goal is to demonstrate that conversations
 * happen here, not to write 12 unique personalities.
 */
export const DEMO_GENERIC_AUTO_REPLIES: readonly string[] = [
  'You write well. That\'s rare.',
  'I was hoping you\'d say something first.',
  'Tell me something most people don\'t know about you.',
  'Where in the city do you actually feel like yourself?',
] as const
