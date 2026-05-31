// src/services/backend/auth.ts — split from backendApi.ts (2026-05-31).
import { isAllowedEmailDomain, runtimeConfig } from '../runtimeConfig'
import { LOCAL_INVITE_PASS_KEY, LOCAL_INVITE_ATTEMPTS_KEY, supabase, wait } from './client'

export const backendLogin = async (email: string, password: string): Promise<{ email: string }> => {
  if (!isAllowedEmailDomain(email)) {
    throw new Error('Email domain not allowed for this beta.')
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return { email: data.user?.email ?? email }
  }

  await wait(280)
  if (!email.includes('@') || password.length < 6) {
    throw new Error('Invalid credentials')
  }

  return { email }
}
export const backendRegister = async (
  email: string,
  password: string,
): Promise<{ email: string; signedIn: boolean; needsEmailConfirmation: boolean }> => {
  if (!isAllowedEmailDomain(email)) {
    throw new Error('Email domain not allowed for this beta.')
  }

  if (password.length < 6) {
    throw new Error('Password must have at least 6 characters.')
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    const signedIn = Boolean(data.session)

    // If we have an active session, record which invite code this user
    // signed up with. The admin's Codes admin screen joins on this so
    // it can search by user email later. Fire-and-forget: never let an
    // audit/link insert failure break signup.
    if (signedIn) {
      void recordInviteRedemption()
    }

    return {
      email: data.user?.email ?? email,
      signedIn,
      needsEmailConfirmation: !signedIn,
    }
  }

  await wait(320)
  return {
    email,
    signedIn: true,
    needsEmailConfirmation: false,
  }
}
export const backendGuestLogin = async (): Promise<{ email: string }> => {
  if (!runtimeConfig.auth.allowGuestLogin) {
    throw new Error('Guest login disabled')
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signInAnonymously()

    if (!error) {
      return {
        email: data.user?.email ?? 'guest@lovedate.app',
      }
    }
  }

  await wait(180)
  return { email: 'guest@lovedate.app' }
}
export const backendSignOut = async (): Promise<void> => {
  if (supabase) {
    await supabase.auth.signOut()
  }
}
const normalizeInvite = (code: string): string => code.trim().toUpperCase()
const getEnvInviteCodes = (): Set<string> => {
  const raw =
    (import.meta.env.VITE_BETA_INVITE_CODES as string | undefined) ??
    (import.meta.env.NEXT_PUBLIC_BETA_INVITE_CODES as string | undefined) ??
    ''
  const parsed = new Set(
    raw
      .split(',')
      .map((item) => normalizeInvite(item))
      .filter((item) => item.length > 0),
  )
  // Keep guaranteed beta fallback codes so packaged desktop builds never lock out testers.
  parsed.add('LOVE-BETA-001')
  parsed.add('LOVEDATE-BETA-001')
  return parsed
}
const isInviteAlreadyValidated = (inviteCode: string): boolean => {
  const stored = window.localStorage.getItem(LOCAL_INVITE_PASS_KEY)
  return stored === normalizeInvite(inviteCode)
}
const rememberValidatedInvite = (inviteCode: string): void => {
  window.localStorage.setItem(LOCAL_INVITE_PASS_KEY, normalizeInvite(inviteCode))
}
/**
 * Sends the invite code this user signed up with to the
 * record-invite-redemption Edge Function so the admin can later look up
 * "which code did this email use". Fire-and-forget: swallow failures.
 */
const recordInviteRedemption = async (): Promise<void> => {
  if (!supabase) return
  const cached = window.localStorage.getItem(LOCAL_INVITE_PASS_KEY)
  if (!cached) return
  try {
    await supabase.functions.invoke('record-invite-redemption', {
      body: { code: cached },
    })
  } catch {
    // Best-effort. The admin can still find this user by other means.
  }
}
const getRecentInviteAttempts = (): number[] => {
  const raw = window.localStorage.getItem(LOCAL_INVITE_ATTEMPTS_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  } catch {
    return []
  }
}
const recordInviteAttempt = (): void => {
  const now = Date.now()
  const cutoff = now - 15 * 60 * 1000
  const kept = getRecentInviteAttempts().filter((value) => value >= cutoff)
  kept.push(now)
  window.localStorage.setItem(LOCAL_INVITE_ATTEMPTS_KEY, JSON.stringify(kept))
}
const assertInviteAttemptLimit = (): void => {
  const maxAttempts = Math.max(3, runtimeConfig.limits.inviteAttemptsPer15Min)
  const now = Date.now()
  const cutoff = now - 15 * 60 * 1000
  const attempts = getRecentInviteAttempts().filter((value) => value >= cutoff)
  if (attempts.length >= maxAttempts) {
    throw new Error('Too many invite attempts. Please wait and retry.')
  }
}
export const backendValidateInviteCode = async (inviteCode: string): Promise<void> => {
  if (!runtimeConfig.auth.requireInviteCode) {
    return
  }

  const normalized = normalizeInvite(inviteCode)
  if (normalized.length < 4) {
    throw new Error('Invite code too short')
  }

  // Permanent beta bypass codes for local/desktop test builds.
  if (normalized === 'LOVE-BETA-001' || normalized === 'LOVEDATE-BETA-001') {
    rememberValidatedInvite(normalized)
    return
  }

  assertInviteAttemptLimit()
  recordInviteAttempt()

  if (isInviteAlreadyValidated(normalized)) {
    return
  }

  const envCodes = getEnvInviteCodes()
  if (envCodes.has(normalized)) {
    rememberValidatedInvite(normalized)
    return
  }

  if (supabase) {
    // Calls a SECURITY DEFINER RPC instead of selecting from beta_invites
    // directly. Direct SELECT used to be allowed for `anon`, which let
    // anyone with the public anon key dump every active invite code. The
    // RPC only answers a yes/no for the supplied code.
    const { data, error } = await supabase.rpc('validate_beta_invite', {
      p_code: normalized,
    })

    if (!error && data === true) {
      rememberValidatedInvite(normalized)
      return
    }
  }

  throw new Error('Invite code not valid')
}
/**
 * Phase C4 — user-initiated account deletion. Calls the
 * delete_self_account() SECURITY DEFINER RPC which removes the
 * auth.users row for auth.uid() and cascades through every user-owned
 * table. Returns true on success, false on any failure (caller should
 * surface the error and keep the user signed in if false).
 *
 * NOTE: the caller is responsible for clearing local state (matches,
 * chat threads, profile draft, etc.) and signing out AFTER this returns
 * true. The signOut() call may itself fail because the user no longer
 * exists — that's expected.
 */
export const backendDeleteSelfAccount = async (): Promise<boolean> => {
  if (!supabase) return false
  const { error } = await supabase.rpc('delete_self_account')
  if (error) {

    console.warn('Account deletion failed:', error.message)
    return false
  }
  return true
}
