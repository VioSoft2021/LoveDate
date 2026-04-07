import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isAllowedEmailDomain, runtimeConfig } from './runtimeConfig'

export type SettingsPayload = {
  pushNotifications: boolean
  emailNotifications: boolean
  privateMode: boolean
}

export type BackendChatReply = {
  text: string
  createdAt: number
}

type BackendMode = 'supabase' | 'local-fallback'

const LOCAL_SETTINGS_KEY = 'lovedate:settings'
const LOCAL_PREFERENCES_KEY = 'lovedate:preferences'
const LOCAL_INVITE_PASS_KEY = 'lovedate:invite-pass'
const LOCAL_INVITE_ATTEMPTS_KEY = 'lovedate:invite-attempts'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined)
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined)

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

const persistLocal = <T>(key: string, payload: T): void => {
  window.localStorage.setItem(key, JSON.stringify(payload))
}

const getCurrentUserId = async (): Promise<string | null> => {
  if (!supabase) {
    return null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

export const getBackendMode = (): BackendMode => {
  if (!supabase && import.meta.env.PROD && !runtimeConfig.backend.allowLocalFallbackInProduction) {
    throw new Error('Backend not configured for production. Add Supabase environment variables.')
  }

  return supabase ? 'supabase' : 'local-fallback'
}

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
  return new Set(
    raw
      .split(',')
      .map((item) => normalizeInvite(item))
      .filter((item) => item.length > 0),
  )
}

const isInviteAlreadyValidated = (inviteCode: string): boolean => {
  const stored = window.localStorage.getItem(LOCAL_INVITE_PASS_KEY)
  return stored === normalizeInvite(inviteCode)
}

const rememberValidatedInvite = (inviteCode: string): void => {
  window.localStorage.setItem(LOCAL_INVITE_PASS_KEY, normalizeInvite(inviteCode))
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

  assertInviteAttemptLimit()
  recordInviteAttempt()

  const normalized = normalizeInvite(inviteCode)
  if (normalized.length < 4) {
    throw new Error('Invite code too short')
  }

  if (isInviteAlreadyValidated(normalized)) {
    return
  }

  const envCodes = getEnvInviteCodes()
  if (envCodes.has(normalized)) {
    rememberValidatedInvite(normalized)
    return
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('beta_invites')
      .select('code, active, expires_at')
      .eq('code', normalized)
      .limit(1)
      .maybeSingle()

    if (!error && data && data.active !== false) {
      if (data.expires_at && Date.parse(data.expires_at) < Date.now()) {
        throw new Error('Invite expired')
      }
      rememberValidatedInvite(normalized)
      return
    }
  }

  throw new Error('Invite code not valid')
}

export const backendSaveSettings = async (settings: SettingsPayload): Promise<void> => {
  persistLocal(LOCAL_SETTINGS_KEY, settings)

  if (!supabase) {
    await wait(220)
    return
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }

  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    push_notifications: settings.pushNotifications,
    email_notifications: settings.emailNotifications,
    private_mode: settings.privateMode,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }
}

export const backendSavePreferences = async (payload: {
  minAge: number
  maxAge: number
  city: string
  interest: string
  includeReviewed: boolean
}): Promise<void> => {
  persistLocal(LOCAL_PREFERENCES_KEY, payload)

  if (!supabase) {
    await wait(180)
    return
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }

  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    min_age: payload.minAge,
    max_age: payload.maxAge,
    city: payload.city,
    interest: payload.interest,
    include_reviewed: payload.includeReviewed,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }
}

export const backendSendChatReply = async (name: string, message: string): Promise<BackendChatReply> => {
  const reply: BackendChatReply = {
    text: `${name} liked that: "${message.slice(0, 40)}". Want to pick a time this week?`,
    createdAt: Date.now(),
  }

  if (!supabase) {
    await wait(650)
    return reply
  }

  const userId = await getCurrentUserId()
  if (userId) {
    await supabase.from('chat_events').insert({
      user_id: userId,
      match_name: name,
      outgoing_text: message,
      generated_reply: reply.text,
      created_at: new Date().toISOString(),
    })
  }

  await wait(500)
  return reply
}
