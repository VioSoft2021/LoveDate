import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Password-recovery flow tests for useAuth (2026-05-26).
//
// The recovery flow has three layers that can break independently:
//   1. INITIAL_URL_HASH must be captured BEFORE any Supabase client
//      consumes the URL fragment (see services/initialHash.ts).
//   2. useAuth must read that snapshot and flip passwordRecoveryActive.
//   3. completePasswordRecovery must validate the new password +
//      delegate to supabase.auth.updateUser + handle success/failure.
//
// We mock both `services/initialHash` (to control what the URL looked
// like at load) and `services/supabaseClient` (to control what
// updateUser returns). The actual import order of the real modules is
// proven separately by the main.tsx ordering — tests here exercise the
// branching logic given a known snapshot value.

// vi.hoisted runs BEFORE the import statements below, which is what
// vi.mock factories need to read.
const mocks = vi.hoisted(() => ({
  initialHash: '',
  updateUser: vi.fn(
    async (): Promise<{ error: { message: string } | null }> => ({ error: null }),
  ),
  getUser: vi.fn(async () => ({ data: { user: { email: 'test@example.com' } } })),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  invokeFunction: vi.fn(
    async (): Promise<{ data: { ok: boolean } | null; error: { message: string } | null }> => ({
      data: { ok: true },
      error: null,
    }),
  ),
  resetPasswordForEmail: vi.fn(
    async (): Promise<{ data: object | null; error: { message: string } | null }> => ({
      data: {},
      error: null,
    }),
  ),
  getSession: vi.fn(
    async (): Promise<{ data: { session: { user: { email: string } } | null } }> => ({
      data: { session: { user: { email: 'test@example.com' } } },
    }),
  ),
  setSession: vi.fn(async (): Promise<{ error: { message: string } | null }> => ({ error: null })),
}))

vi.mock('../services/initialHash', () => ({
  get INITIAL_URL_HASH() {
    return mocks.initialHash
  },
}))

vi.mock('../services/supabaseClient', () => ({
  // Re-export INITIAL_URL_HASH so callers that import from here still work.
  get INITIAL_URL_HASH() {
    return mocks.initialHash
  },
  createSupabaseClient: () => ({
    auth: {
      updateUser: mocks.updateUser,
      getUser: mocks.getUser,
      onAuthStateChange: mocks.onAuthStateChange,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      getSession: mocks.getSession,
      setSession: mocks.setSession,
    },
    functions: {
      invoke: mocks.invokeFunction,
    },
  }),
}))

// Mock backendApi so the auth hook can be imported without pulling in
// the real (Supabase-creating) backend module — this also keeps the
// test isolated from the import-order side-effect we're guarding.
vi.mock('../services/backendApi', () => ({
  backendLogin: vi.fn(),
  backendRegister: vi.fn(),
  backendRepairDiscoverableProfile: vi.fn(),
  backendResetLocalSelfProfile: vi.fn(),
  backendSaveSelfProfile: vi.fn(),
  backendSignOut: vi.fn(),
  backendValidateInviteCode: vi.fn(async () => true),
  purgeAllSelfProfileCaches: vi.fn(),
  purgeOtherSelfProfileCaches: vi.fn(),
}))

vi.mock('../services/runtimeConfig', () => ({
  runtimeConfig: {
    auth: {
      requireInviteCode: false,
      allowGuestLogin: false,
      allowedEmailDomains: [] as string[],
    },
  },
  isAllowedEmailDomain: () => true,
}))

import { useAuth } from './useAuth'

const baseOptions = () => ({
  pushToast: vi.fn(),
  appLanguage: 'en' as const,
  onSignedIn: vi.fn(),
  onSignedOut: vi.fn(),
})

beforeEach(() => {
  mocks.initialHash = ''
  mocks.updateUser.mockClear()
  mocks.updateUser.mockResolvedValue({ error: null })
  mocks.getUser.mockClear()
  mocks.getUser.mockResolvedValue({ data: { user: { email: 'test@example.com' } } })
  mocks.invokeFunction.mockClear()
  mocks.invokeFunction.mockResolvedValue({ data: { ok: true }, error: null })
  mocks.resetPasswordForEmail.mockClear()
  mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
  mocks.getSession.mockClear()
  mocks.getSession.mockResolvedValue({ data: { session: { user: { email: 'test@example.com' } } } })
  mocks.setSession.mockClear()
  mocks.setSession.mockResolvedValue({ error: null })
})

describe('useAuth — password-recovery detection from URL hash', () => {
  it('flips passwordRecoveryActive to true when INITIAL_URL_HASH contains type=recovery', async () => {
    mocks.initialHash = '#access_token=abc&refresh_token=def&type=recovery&token_type=bearer'
    const { result } = renderHook(() => useAuth(baseOptions()))
    await waitFor(() => {
      expect(result.current.passwordRecoveryActive).toBe(true)
    })
  })

  it('leaves passwordRecoveryActive false when the hash is empty (no recovery click)', async () => {
    mocks.initialHash = ''
    const { result } = renderHook(() => useAuth(baseOptions()))
    // Give the effect a microtask to run, then confirm no false-positive flip.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.passwordRecoveryActive).toBe(false)
  })

  it('leaves passwordRecoveryActive false for non-recovery hashes (e.g. routing)', async () => {
    mocks.initialHash = '#/discover'
    const { result } = renderHook(() => useAuth(baseOptions()))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.passwordRecoveryActive).toBe(false)
  })
})

describe('useAuth — completePasswordRecovery validation', () => {
  it('returns false and sets an error when the two passwords do not match', async () => {
    const { result } = renderHook(() => useAuth(baseOptions()))
    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.completePasswordRecovery(
        'StrongPass1!aa',
        'DifferentPass1!aa',
      )
    })
    expect(returned).toBe(false)
    expect(result.current.passwordRecoveryError).toMatch(/match/i)
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('returns false and sets a strength error when the new password is too weak', async () => {
    const { result } = renderHook(() => useAuth(baseOptions()))
    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.completePasswordRecovery('short', 'short')
    })
    expect(returned).toBe(false)
    expect(result.current.passwordRecoveryError).toMatch(/at least/i)
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('calls supabase.auth.updateUser when validation passes', async () => {
    mocks.initialHash = '#access_token=abc&type=recovery'
    const { result } = renderHook(() => useAuth(baseOptions()))
    await act(async () => {
      await result.current.completePasswordRecovery('StrongPass1!', 'StrongPass1!')
    })
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'StrongPass1!' })
  })

  it('clears passwordRecoveryActive and flips isAuthenticated on success', async () => {
    mocks.initialHash = '#access_token=abc&type=recovery'
    const onSignedIn = vi.fn()
    const { result } = renderHook(() =>
      useAuth({ ...baseOptions(), onSignedIn }),
    )
    await waitFor(() => {
      expect(result.current.passwordRecoveryActive).toBe(true)
    })
    await act(async () => {
      await result.current.completePasswordRecovery('StrongPass1!', 'StrongPass1!')
    })
    await waitFor(() => {
      expect(result.current.passwordRecoveryActive).toBe(false)
      expect(result.current.isAuthenticated).toBe(true)
    })
    expect(onSignedIn).toHaveBeenCalledWith('test@example.com')
  })

  it('returns false and sets an error when supabase.auth.updateUser rejects', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { message: 'bad' } })
    const { result } = renderHook(() => useAuth(baseOptions()))
    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.completePasswordRecovery('StrongPass1!', 'StrongPass1!')
    })
    expect(returned).toBe(false)
    expect(result.current.passwordRecoveryError).toBeTruthy()
  })

  // 2026-06-01 — the recovery card shows on a URL string-match alone, so the
  // session may not be live when the user taps "Update password". These cover
  // the explicit session-from-token recovery + diagnosable error surfacing.
  it('establishes the session from the recovery link tokens when the client has none', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })
    mocks.initialHash = '#access_token=AT123&refresh_token=RT456&type=recovery'
    const { result } = renderHook(() => useAuth(baseOptions()))
    await act(async () => {
      await result.current.completePasswordRecovery('StrongPass1!', 'StrongPass1!')
    })
    expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: 'AT123',
      refresh_token: 'RT456',
    })
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'StrongPass1!' })
  })

  it('shows the expired-link error (and skips updateUser) when there is no session and no usable token', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })
    mocks.initialHash = '#error=access_denied&error_code=otp_expired'
    const { result } = renderHook(() => useAuth(baseOptions()))
    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.completePasswordRecovery('StrongPass1!', 'StrongPass1!')
    })
    expect(returned).toBe(false)
    expect(mocks.setSession).not.toHaveBeenCalled()
    expect(mocks.updateUser).not.toHaveBeenCalled()
    expect(result.current.passwordRecoveryError).toMatch(/expired|already used/i)
  })

  it('surfaces the backend real reason when updateUser fails', async () => {
    mocks.updateUser.mockResolvedValueOnce({
      error: { message: 'New password should be different from the old password.' },
    })
    const { result } = renderHook(() => useAuth(baseOptions()))
    await act(async () => {
      await result.current.completePasswordRecovery('StrongPass1!', 'StrongPass1!')
    })
    expect(result.current.passwordRecoveryError).toMatch(/different from the old password/i)
  })
})

describe('useAuth — sendForgotPasswordEmail (auto-send via resetPasswordForEmail, 2026-06-01)', () => {
  it('calls supabase.auth.resetPasswordForEmail with the trimmed email + Privé redirect (NOT the notify-admin-recovery relay)', async () => {
    const { result } = renderHook(() => useAuth(baseOptions()))
    await act(async () => {
      await result.current.sendForgotPasswordEmail('  me@example.com  ')
    })
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('me@example.com', {
      redirectTo: 'https://prive-app.club/',
    })
    expect(mocks.invokeFunction).not.toHaveBeenCalled()
  })

  it('sets forgotPasswordStatus to "sent" on success', async () => {
    const { result } = renderHook(() => useAuth(baseOptions()))
    await act(async () => {
      await result.current.sendForgotPasswordEmail('me@example.com')
    })
    expect(result.current.forgotPasswordStatus).toBe('sent')
  })

  it('sets forgotPasswordStatus to "error" when resetPasswordForEmail returns an error', async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ data: null, error: { message: 'bad' } })
    const { result } = renderHook(() => useAuth(baseOptions()))
    await act(async () => {
      await result.current.sendForgotPasswordEmail('me@example.com')
    })
    expect(result.current.forgotPasswordStatus).toBe('error')
  })

  it('rejects empty / whitespace-only emails (no reset email sent)', async () => {
    const { result } = renderHook(() => useAuth(baseOptions()))
    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.sendForgotPasswordEmail('   ')
    })
    expect(returned).toBe(false)
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled()
    expect(result.current.forgotPasswordStatus).toBe('error')
  })
})
