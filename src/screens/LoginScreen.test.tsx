import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Phase A (2026-05-24) — when invite codes are required, LoginScreen
// shows a hero/landing state before the auth form. These tests focus on
// the auth-form behaviour, so the default mock bypasses the hero (same
// code path users hit when VITE_REQUIRE_INVITE_CODE=false). Individual
// tests that need the hero or guest-login button can flip the flags.
const mockRuntime = vi.hoisted(() => ({
  auth: {
    requireInviteCode: false,
    allowGuestLogin: false,
    allowedEmailDomains: [] as string[],
  },
}))

vi.mock('../services/runtimeConfig', () => ({
  runtimeConfig: mockRuntime,
  isAllowedEmailDomain: () => true,
}))

afterEach(() => {
  mockRuntime.auth.requireInviteCode = false
  mockRuntime.auth.allowGuestLogin = false
})

import { LoginScreen } from './LoginScreen'
import type { LoginScreenProps } from './LoginScreen'

const baseProps: LoginScreenProps = {
  appLanguage: 'en',
  setAppLanguage: vi.fn(),
  authMode: 'login',
  setAuthMode: vi.fn(),
  inviteCode: '',
  setInviteCode: vi.fn(),
  loginEmail: '',
  setLoginEmail: vi.fn(),
  loginPassword: '',
  setLoginPassword: vi.fn(),
  registerPasswordConfirm: '',
  setRegisterPasswordConfirm: vi.fn(),
  loginError: null,
  setLoginError: vi.fn(),
  loginNotice: null,
  setLoginNotice: vi.fn(),
  loggingIn: false,
  onSubmit: vi.fn((e) => e.preventDefault()),
  onGuestLogin: vi.fn(),
  onUseDevAccount: vi.fn(),
  onResetDevAccount: vi.fn(),
  passwordRecoveryActive: false,
  passwordRecoveryLoading: false,
  passwordRecoveryError: null,
  onCompletePasswordRecovery: vi.fn(async () => true),
  forgotPasswordSending: false,
  forgotPasswordStatus: 'idle',
  onSendForgotPasswordEmail: vi.fn(async () => true),
  onResetForgotPasswordState: vi.fn(),
}

describe('LoginScreen — auth mode toggle', () => {
  it('shows the Sign In title by default', () => {
    render(<LoginScreen {...baseProps} />)
    // h1 contains the title; the page also has a submit button with the
    // same text. Use getAllByText and assert at least one.
    expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0)
  })

  it('shows the Create Account title in register mode', () => {
    render(<LoginScreen {...baseProps} authMode="register" />)
    expect(screen.getAllByText(/create/i).length).toBeGreaterThan(0)
  })

  it('Switch button toggles auth mode and clears errors + confirm password', () => {
    const setAuthMode = vi.fn()
    const setLoginError = vi.fn()
    const setLoginNotice = vi.fn()
    const setRegisterPasswordConfirm = vi.fn()
    render(
      <LoginScreen
        {...baseProps}
        setAuthMode={setAuthMode}
        setLoginError={setLoginError}
        setLoginNotice={setLoginNotice}
        setRegisterPasswordConfirm={setRegisterPasswordConfirm}
      />,
    )
    // The switch button label is the "switch to create" copy in EN
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(setLoginError).toHaveBeenCalledWith(null)
    expect(setLoginNotice).toHaveBeenCalledWith(null)
    expect(setRegisterPasswordConfirm).toHaveBeenCalledWith('')
    expect(setAuthMode).toHaveBeenCalled()
  })
})

describe('LoginScreen — controlled fields', () => {
  it('typing in email calls setLoginEmail', () => {
    const setLoginEmail = vi.fn()
    render(<LoginScreen {...baseProps} setLoginEmail={setLoginEmail} />)
    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'me@example.com' } })
    expect(setLoginEmail).toHaveBeenCalledWith('me@example.com')
  })

  it('typing in password calls setLoginPassword', () => {
    const setLoginPassword = vi.fn()
    const { container } = render(<LoginScreen {...baseProps} setLoginPassword={setLoginPassword} />)
    // Multiple "password" labels (visible label, hint text, show/hide aria-label)
    // make getByLabelText ambiguous. Target by autocomplete attr instead —
    // unique per input role.
    const passwordInput = container.querySelector(
      'input[autocomplete="current-password"]',
    ) as HTMLInputElement
    expect(passwordInput).not.toBeNull()
    fireEvent.change(passwordInput, { target: { value: 'secret' } })
    expect(setLoginPassword).toHaveBeenCalledWith('secret')
  })

  it('typing in invite code uppercases the value before setting', () => {
    // Invite code field is gated on (requireInviteCode AND authMode === 'register')
    // since Phase A round 2 — returning users on the Sign-in card no longer
    // re-type their one-time signup code. Render directly in register mode
    // to expose the field (parent normally sets this via the hero CTA).
    mockRuntime.auth.requireInviteCode = true
    const setInviteCode = vi.fn()
    render(
      <LoginScreen
        {...baseProps}
        authMode="register"
        setInviteCode={setInviteCode}
      />,
    )
    // Skip the hero by clicking "Redeem your invite" to enter the card view.
    fireEvent.click(screen.getByRole('button', { name: /redeem your invite/i }))
    const inviteInput = screen.getByLabelText(/invite/i)
    fireEvent.change(inviteInput, { target: { value: 'abc123' } })
    expect(setInviteCode).toHaveBeenCalledWith('ABC123')
  })

  it('register mode shows confirm-password field', () => {
    render(<LoginScreen {...baseProps} authMode="register" />)
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('login mode does NOT show confirm-password field', () => {
    render(<LoginScreen {...baseProps} authMode="login" />)
    expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument()
  })
})

describe('LoginScreen — show/hide password', () => {
  it('toggle button flips the input type between password and text', () => {
    const { container } = render(<LoginScreen {...baseProps} />)
    const passwordInputs = container.querySelectorAll('input[type="password"]')
    expect(passwordInputs.length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /show password/i }))
    const textInputs = container.querySelectorAll('input[type="text"]')
    // After toggle, at least one text-mode input exists (the password field).
    expect(textInputs.length).toBeGreaterThan(0)
  })
})

describe('LoginScreen — error + notice display', () => {
  it('shows loginError when provided', () => {
    render(<LoginScreen {...baseProps} loginError="Bad credentials" />)
    expect(screen.getByText('Bad credentials')).toBeInTheDocument()
  })

  it('shows loginNotice when provided', () => {
    render(<LoginScreen {...baseProps} loginNotice="Please check your email" />)
    expect(screen.getByText('Please check your email')).toBeInTheDocument()
  })
})

describe('LoginScreen — handlers', () => {
  it('submit fires onSubmit', () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault())
    const { container } = render(<LoginScreen {...baseProps} onSubmit={onSubmit} />)
    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form!)
    expect(onSubmit).toHaveBeenCalled()
  })

  it('Continue as Guest fires onGuestLogin', () => {
    // Guest login button is gated by the runtime flag.
    mockRuntime.auth.allowGuestLogin = true
    const onGuestLogin = vi.fn()
    render(<LoginScreen {...baseProps} onGuestLogin={onGuestLogin} />)
    const guestBtn = screen.getByRole('button', { name: /guest/i })
    fireEvent.click(guestBtn)
    expect(onGuestLogin).toHaveBeenCalled()
  })
})

describe('LoginScreen — loggingIn disables actions', () => {
  it('disables the submit button while loggingIn', () => {
    render(<LoginScreen {...baseProps} loggingIn={true} />)
    // The submit button shows "Please wait..." copy while loggingIn.
    const submitBtn = screen.getByRole('button', { name: /please wait/i })
    expect(submitBtn).toBeDisabled()
  })
})

// Password-recovery flow tests (2026-05-26).
//
// These exercise the recovery card that renders when the user lands
// on the app via a "Reset Your Password" email link. The recovery
// card MUST take precedence over the hero / sign-in / register views
// — earlier versions had the hero return ahead of the recovery check,
// which left the recovery card unreachable in production. The first
// test below is the regression guard for that bug.
describe('LoginScreen — password recovery card', () => {
  it('renders the recovery card when passwordRecoveryActive is true, even with the hero enabled (regression: hero used to swallow the recovery branch)', () => {
    mockRuntime.auth.requireInviteCode = true // hero would normally render
    render(<LoginScreen {...baseProps} passwordRecoveryActive={true} />)
    // "Set a new password" is the recovery card's heading.
    expect(screen.getByRole('heading', { name: /set a new password/i })).toBeInTheDocument()
    // The hero's "Take a tour" door should NOT render — the recovery
    // card has the full surface.
    expect(screen.queryByRole('button', { name: /take a tour/i })).not.toBeInTheDocument()
  })

  it('renders BOTH password fields and a submit button with the recovery copy', () => {
    render(<LoginScreen {...baseProps} passwordRecoveryActive={true} />)
    expect(screen.getByLabelText(/new password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
  })

  it('submit fires onCompletePasswordRecovery with the two field values', async () => {
    const onCompletePasswordRecovery = vi.fn(async () => true)
    const { container } = render(
      <LoginScreen
        {...baseProps}
        passwordRecoveryActive={true}
        onCompletePasswordRecovery={onCompletePasswordRecovery}
      />,
    )
    // Both fields have the same autocomplete=new-password; query by index.
    const inputs = container.querySelectorAll('input[autocomplete="new-password"]')
    expect(inputs.length).toBe(2)
    fireEvent.change(inputs[0] as HTMLInputElement, { target: { value: 'SuperSecret1!' } })
    fireEvent.change(inputs[1] as HTMLInputElement, { target: { value: 'SuperSecret1!' } })
    const form = container.querySelector('form')!
    fireEvent.submit(form)
    expect(onCompletePasswordRecovery).toHaveBeenCalledWith('SuperSecret1!', 'SuperSecret1!')
  })

  it('shows the recovery error message when passwordRecoveryError is set', () => {
    render(
      <LoginScreen
        {...baseProps}
        passwordRecoveryActive={true}
        passwordRecoveryError="The two passwords don't match."
      />,
    )
    expect(screen.getByText(/two passwords don't match/i)).toBeInTheDocument()
  })

  it('disables the submit button while passwordRecoveryLoading is true', () => {
    render(
      <LoginScreen
        {...baseProps}
        passwordRecoveryActive={true}
        passwordRecoveryLoading={true}
      />,
    )
    // The button copy switches to "Saving…" while loading.
    const btn = screen.getByRole('button', { name: /saving/i })
    expect(btn).toBeDisabled()
  })
})

describe('LoginScreen — forgot password link + inline form', () => {
  it('shows the Forgot-password link in Sign-In mode', () => {
    render(<LoginScreen {...baseProps} authMode="login" />)
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument()
  })

  it('hides the Forgot-password link in Register mode (regression guard — link is signin-only)', () => {
    render(<LoginScreen {...baseProps} authMode="register" />)
    expect(screen.queryByRole('button', { name: /forgot password/i })).not.toBeInTheDocument()
  })

  it('clicking Forgot-password reveals the inline send-recovery-email form', () => {
    render(<LoginScreen {...baseProps} authMode="login" />)
    expect(screen.queryByRole('heading', { name: /send a recovery email/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(screen.getByRole('heading', { name: /send a recovery email/i })).toBeInTheDocument()
  })

  it('submitting the inline form calls onSendForgotPasswordEmail with the typed email', async () => {
    const onSendForgotPasswordEmail = vi.fn(async () => true)
    render(
      <LoginScreen
        {...baseProps}
        authMode="login"
        loginEmail="me@example.com"
        onSendForgotPasswordEmail={onSendForgotPasswordEmail}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    // The inline form pre-fills with loginEmail (me@example.com).
    fireEvent.click(screen.getByRole('button', { name: /send recovery email/i }))
    expect(onSendForgotPasswordEmail).toHaveBeenCalledWith('me@example.com')
  })

  it('shows the "sent" notice after forgotPasswordStatus flips to sent', () => {
    render(
      <LoginScreen
        {...baseProps}
        authMode="login"
        forgotPasswordStatus="sent"
      />,
    )
    // Open the inline form so the notice has somewhere to render.
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(screen.getByText(/recovery link is on its way/i)).toBeInTheDocument()
  })
})
