// Boot-time localStorage cleanup, extracted from App.tsx (Phase D, 2026-05-30).
// Runs once per render call (currently from inside the App() function body,
// matching the legacy behavior); operations are idempotent so re-execution is
// harmless. Two pieces:
//   1. Remove the legacy global self-profile key from devices that used pre-fix
//      builds — the current code never reads it, but leaving it sitting in
//      localStorage is a passive data-at-rest leak on shared devices.
//   2. First-launch sweep: if there's no real auth session, clear any
//      leftover demo/test data so a fresh install starts truly empty.
//      Gated by a one-time CLEAN_FLAG so we only do the sweep once.

import {
  AUTH_STORAGE_KEY,
  CALL_HISTORY_STORAGE_KEY,
  CHAT_THREADS_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
} from '../persistence/keys'

const LEGACY_SELF_PROFILE_KEY = 'lovedate:self-profile'
const CLEAN_FLAG = 'lovedate:clean-v1'
const BLOCKED_PROFILES_KEY = 'lovedate:blocked-profiles'
const MODERATION_QUEUE_KEY = 'lovedate:moderation-queue'

export function bootCleanup(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(LEGACY_SELF_PROFILE_KEY)
  } catch {
    // best-effort
  }

  if (window.localStorage.getItem(CLEAN_FLAG)) return

  const auth = window.localStorage.getItem(AUTH_STORAGE_KEY)
  let isRealAuth = false
  try {
    const parsed = JSON.parse(auth ?? '{}') as { isAuthenticated?: boolean }
    isRealAuth = parsed.isAuthenticated === true
  } catch {
    // treat parse failure as no real auth
  }

  if (!isRealAuth) {
    ;[
      HISTORY_STORAGE_KEY,
      CHAT_THREADS_STORAGE_KEY,
      CALL_HISTORY_STORAGE_KEY,
      BLOCKED_PROFILES_KEY,
      MODERATION_QUEUE_KEY,
    ].forEach((key) => window.localStorage.removeItem(key))
  }

  window.localStorage.setItem(CLEAN_FLAG, '1')
}
