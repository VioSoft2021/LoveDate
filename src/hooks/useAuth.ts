import { useCallback, useEffect, useState } from 'react'
import { runtimeConfig } from '../services/runtimeConfig'
import {
  backendLogin,
  backendRegister,
  backendRepairDiscoverableProfile,
  backendResetLocalSelfProfile,
  backendSaveSelfProfile,
  backendSignOut,
  backendValidateInviteCode,
  purgeAllSelfProfileCaches,
  purgeOtherSelfProfileCaches,
} from '../services/backendApi'
import { DEMO_GUEST_EMAIL } from '../services/demo/demoProfiles'
import { readAuth, AUTH_STORAGE_KEY } from '../persistence'
import { EMPTY_SELF_PROFILE, UI_TEXT } from '../constants'
import type { AppLanguage } from '../domain'
import { getStrongPasswordError } from '../utils'

// Phase D1.1 — useAuth
//
// Owns every piece of authentication state that previously lived inline
// in App.tsx (~10 useState slots and ~150 lines of handlers). App.tsx
// now reads/writes auth through this single hook; LoginScreen receives
// its props by destructuring the return value.
//
// Side effects that don't belong to auth itself (e.g., clearing chat
// state on sign-out, navigating to /discover after sign-in) are passed
// in as the `onSignedIn` / `onSignedOut` callbacks. The hook stays pure
// to auth concerns and the consumer wires up cross-cutting state.

type Toast = (message: string, tone: 'info' | 'success' | 'error') => void

export type UseAuthOptions = {
  pushToast: Toast
  appLanguage: AppLanguage
  /** Fires after a successful sign-in / register / guest login. Used by
   *  the consumer to navigate to the home screen. */
  onSignedIn?: (email: string) => void
  /** Fires after sign-out. Used by the consumer to clear non-auth state
   *  (active chat, match modal, in-flight calls). */
  onSignedOut?: () => void
}

export const useAuth = ({ pushToast, appLanguage, onSignedIn, onSignedOut }: UseAuthOptions) => {
  const tAuth = UI_TEXT[appLanguage].authToasts
  const initial = readAuth()

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  // Guest Tour mode (2026-05-26). When true, the user entered via
  // "Take a Tour" on the landing hero — no Supabase auth, no real
  // user data, every backend read is intercepted and answered from
  // the demoProfiles fixture. Never persisted to localStorage so a
  // page refresh ends the tour cleanly.
  const [isGuest, setIsGuest] = useState(false)
  const [userEmail, setUserEmail] = useState(initial.email)
  const [loginEmail, setLoginEmail] = useState(initial.email)
  const [loginPassword, setLoginPassword] = useState('')
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginNotice, setLoginNotice] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [inviteCode, setInviteCode] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // Persist {isAuthenticated, email} to localStorage so the next cold
  // start has the right initial email pre-filled in the login form.
  // (We never auto-resume a session; we always require a fresh sign-in.)
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ isAuthenticated, email: userEmail }),
    )
  }, [isAuthenticated, userEmail])

  const submitLogin = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setLoggingIn(true)
      setLoginError(null)
      setLoginNotice(null)

      if (authMode === 'register') {
        const strongPasswordError = getStrongPasswordError(loginPassword)
        if (strongPasswordError) {
          setLoginError(strongPasswordError)
          setLoggingIn(false)
          return
        }
        if (loginPassword !== registerPasswordConfirm) {
          setLoginError('Passwords do not match.')
          setLoggingIn(false)
          return
        }
      }

      // Invite codes gate account CREATION only. Existing users already
      // redeemed their code when they registered — making them re-enter it
      // on every sign-in is a regression. (Guest sign-in still requires it
      // below, because that path effectively mints a new disposable user.)
      const inviteValidation =
        runtimeConfig.auth.requireInviteCode && authMode === 'register'
          ? backendValidateInviteCode(inviteCode.trim())
          : Promise.resolve()

      void inviteValidation
        .then(() =>
          authMode === 'register'
            ? backendRegister(loginEmail.trim(), loginPassword).then((result) => ({
                email: result.email,
                signedIn: result.signedIn,
                registered: true,
                needsEmailConfirmation: !result.signedIn && result.needsEmailConfirmation,
              }))
            : backendLogin(loginEmail.trim(), loginPassword).then((result) => ({
                email: result.email,
                signedIn: true,
                registered: false,
                needsEmailConfirmation: false,
              })),
        )
        .then((result) => {
          if (!result.signedIn && result.registered && result.needsEmailConfirmation) {
            setAuthMode('login')
            setLoginNotice(tAuth.accountCreatedConfirmEmail)
            pushToast(tAuth.accountCreatedConfirmEmailToast, 'info')
            return
          }
          // Wipe any other user's cached profile before hydrating ours so
          // a shared device never leaks data across accounts.
          purgeOtherSelfProfileCaches(result.email)
          setIsAuthenticated(true)
          setUserEmail(result.email)
          // Repair the discoverable-profile bridge for legacy accounts
          // whose public.profiles row predates B1 (null auth_user_id =
          // invisible to other users). Fire-and-forget.
          void backendRepairDiscoverableProfile(result.email)
          onSignedIn?.(result.email)
          pushToast(
            authMode === 'register' ? tAuth.accountCreatedSuccess : tAuth.signedInSuccess,
            'success',
          )
        })
        .catch((error: unknown) => {
          const detail = error instanceof Error ? error.message : 'Login failed'
          setLoginError(detail)
          pushToast(
            authMode === 'register'
              ? tAuth.accountCreationFailed
              : tAuth.loginFailed,
            'error',
          )
        })
        .finally(() => {
          setLoggingIn(false)
        })
    },
    [authMode, inviteCode, loginEmail, loginPassword, registerPasswordConfirm, pushToast, onSignedIn, tAuth],
  )

  const guestLogin = useCallback(() => {
    // Guest Tour mode (2026-05-26 rework). No Supabase, no invite code,
    // no anonymous auth user created server-side. We synchronously flip
    // local auth state to "signed-in guest"; the rest of the app reads
    // isGuest to swap real backend fetches for the demoProfiles fixture.
    setLoginError(null)
    setLoginNotice(null)
    setIsGuest(true)
    setIsAuthenticated(true)
    setUserEmail(DEMO_GUEST_EMAIL)
    setLoginEmail(DEMO_GUEST_EMAIL)
    onSignedIn?.(DEMO_GUEST_EMAIL)
    pushToast(tAuth.guestStarted, 'info')
  }, [pushToast, onSignedIn, tAuth])

  const signOut = useCallback(async () => {
    // Guest Tour exit: no Supabase session to terminate, no real
    // user data to wipe. Just flip the local state and we're back
    // on the landing hero.
    if (isGuest) {
      setIsGuest(false)
      setIsAuthenticated(false)
      setUserEmail('')
      setLoginPassword('')
      onSignedOut?.()
      return
    }
    // Await the cloud sign-out before flipping local state so the next
    // sign-in can't race with the previous session's signOut completing.
    try {
      await backendSignOut()
    } catch {
      pushToast(tAuth.signOutSyncFailed, 'error')
    }
    // Wipe every cached self-profile (current + leftovers) so the next
    // person on this device can't read profile data via devtools. Trades
    // instant-render on next sign-in (cloud fetch) for zero-leak guarantee.
    purgeAllSelfProfileCaches()
    setIsAuthenticated(false)
    setUserEmail('')
    setLoginPassword('')
    onSignedOut?.()
  }, [isGuest, pushToast, onSignedOut, tAuth])

  const exitApp = useCallback(() => {
    void signOut()
    void import('@capacitor/app')
      .then(({ App: CapacitorApp }) => CapacitorApp.exitApp())
      .catch(() => {
        window.close()
      })
  }, [signOut])

  // Dev test-account helpers (DEV only)
  const DEV_TEST_EMAIL =
    (import.meta.env.VITE_DEV_TEST_EMAIL as string | undefined) ?? 'dev@lovedate.local'

  const useDevAccount = useCallback(async () => {
    if (!import.meta.env.DEV) return
    setLoggingIn(true)
    try {
      backendResetLocalSelfProfile(DEV_TEST_EMAIL)
      await backendSaveSelfProfile(
        DEV_TEST_EMAIL,
        EMPTY_SELF_PROFILE as unknown as Record<string, unknown>,
      )
      setIsAuthenticated(true)
      setUserEmail(DEV_TEST_EMAIL)
      setLoginEmail(DEV_TEST_EMAIL)
      onSignedIn?.(DEV_TEST_EMAIL)
      pushToast('Dev account loaded.', 'info')
    } catch {
      pushToast('Dev account load failed.', 'error')
    } finally {
      setLoggingIn(false)
    }
  }, [DEV_TEST_EMAIL, pushToast, onSignedIn])

  const resetDevAccount = useCallback(async () => {
    if (!import.meta.env.DEV) return
    setLoggingIn(true)
    try {
      backendResetLocalSelfProfile(DEV_TEST_EMAIL)
      await backendSaveSelfProfile(
        DEV_TEST_EMAIL,
        EMPTY_SELF_PROFILE as unknown as Record<string, unknown>,
      )
      pushToast('Dev account reset locally.', 'success')
    } catch {
      pushToast('Dev reset failed.', 'error')
    } finally {
      setLoggingIn(false)
    }
  }, [DEV_TEST_EMAIL, pushToast])

  return {
    // state
    isAuthenticated,
    isGuest,
    userEmail,
    loginEmail,
    loginPassword,
    registerPasswordConfirm,
    loginError,
    loginNotice,
    authMode,
    inviteCode,
    loggingIn,
    // direct setters (for form inputs)
    setLoginEmail,
    setLoginPassword,
    setRegisterPasswordConfirm,
    setAuthMode,
    setInviteCode,
    setLoginError,
    setLoginNotice,
    // actions
    submitLogin,
    guestLogin,
    signOut,
    exitApp,
    useDevAccount,
    resetDevAccount,
  } as const
}
