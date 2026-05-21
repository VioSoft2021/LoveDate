import React from 'react'
import { Logo } from '../components/Logo'
import { runtimeConfig } from '../services/runtimeConfig'
import { UI_TEXT } from '../constants'
import { backendSubmitWaitlist } from '../services/backendApi'
import type { AppLanguage } from '../domain'

export type LoginScreenProps = {
  appLanguage: AppLanguage
  setAppLanguage: (lang: AppLanguage) => void
  authMode: 'login' | 'register'
  setAuthMode: React.Dispatch<React.SetStateAction<'login' | 'register'>>
  inviteCode: string
  setInviteCode: (value: string) => void
  loginEmail: string
  setLoginEmail: (value: string) => void
  loginPassword: string
  setLoginPassword: (value: string) => void
  registerPasswordConfirm: string
  setRegisterPasswordConfirm: (value: string) => void
  loginError: string | null
  setLoginError: (value: string | null) => void
  loginNotice: string | null
  setLoginNotice: (value: string | null) => void
  loggingIn: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onGuestLogin: () => void
  onUseDevAccount: () => void
  onResetDevAccount: () => void
}

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    {open ? (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </>
    ) : (
      <>
        <path d="M2 12s3.5-7 10-7c2.4 0 4.4.95 6 2.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 12s-3.5 7-10 7c-2.4 0-4.4-.95-6-2.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    )}
  </svg>
)

export const LoginScreen: React.FC<LoginScreenProps> = ({
  appLanguage,
  setAppLanguage,
  authMode,
  setAuthMode,
  inviteCode,
  setInviteCode,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  registerPasswordConfirm,
  setRegisterPasswordConfirm,
  loginError,
  setLoginError,
  loginNotice,
  setLoginNotice,
  loggingIn,
  onSubmit,
  onGuestLogin,
  onUseDevAccount,
  onResetDevAccount,
}) => {
  const copy = UI_TEXT[appLanguage]
  const [showPassword, setShowPassword] = React.useState(false)

  // Waitlist (public access request) state — hidden by default, shown
  // when the user taps "Request access". Stays inline in the login card
  // so we don't need a modal/route. On successful submit we swap to a
  // confirmation message.
  const [showWaitlist, setShowWaitlist] = React.useState(false)
  const [waitlistEmail, setWaitlistEmail] = React.useState('')
  const [waitlistNote, setWaitlistNote] = React.useState('')
  const [waitlistStatus, setWaitlistStatus] = React.useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')
  const [waitlistError, setWaitlistError] = React.useState<string | null>(null)
  const submitWaitlist = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const w = copy.waitlist
    const email = waitlistEmail.trim()
    // Cheap client-side check; server re-validates via the SECURITY DEFINER RPC.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistError(w.invalidEmail)
      setWaitlistStatus('error')
      return
    }
    setWaitlistError(null)
    setWaitlistStatus('submitting')
    try {
      await backendSubmitWaitlist(email, waitlistNote.trim() || undefined)
      setWaitlistStatus('success')
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setWaitlistError(
        /too many requests/i.test(message) ? w.rateLimited : w.submitFailed,
      )
      setWaitlistStatus('error')
    }
  }

  return (
    <main className="login-shell">
      <div className="grain" aria-hidden="true" />
      <article className="login-card">
        <Logo variant="hero" size="lg" showSlogan className="login-hero-logo" />
        <div className="login-language-row">
          <label>
            {copy.auth.language}
            <select
              value={appLanguage}
              onChange={(event) => setAppLanguage(event.target.value as AppLanguage)}
            >
              <option value="en">{copy.auth.english}</option>
              <option value="ro">{copy.auth.romanian}</option>
            </select>
          </label>
        </div>
        <h1>{authMode === 'register' ? copy.auth.createTitle : copy.auth.signInTitle}</h1>
        <form className="login-form" onSubmit={onSubmit}>
          {runtimeConfig.auth.requireInviteCode ? (
            <label>
              {copy.auth.inviteCode}
              <input
                type="text"
                autoComplete="one-time-code"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                placeholder={copy.auth.invitePlaceholder}
                required
              />
            </label>
          ) : null}
          <label>
            {copy.auth.email}
            <input
              type="email"
              autoComplete="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              required
            />
          </label>
          <label>
            {copy.auth.password}
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {authMode === 'register' ? <small className="soft">{copy.auth.passwordHint}</small> : null}
          </label>
          {authMode === 'register' ? (
            <label>
              {copy.auth.confirmPassword}
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={registerPasswordConfirm}
                  onChange={(event) => setRegisterPasswordConfirm(event.target.value)}
                  required
                />
              </div>
            </label>
          ) : null}
          {loginError ? <p className="error-text">{loginError}</p> : null}
          {loginNotice ? <p className="info-text">{loginNotice}</p> : null}
          <div className="login-actions">
            <button type="submit" disabled={loggingIn}>
              {loggingIn
                ? copy.auth.pleaseWait
                : authMode === 'register'
                ? copy.auth.createAccount
                : copy.auth.signIn}
            </button>
            {runtimeConfig.auth.allowGuestLogin && authMode === 'login' ? (
              <button type="button" className="ghost" onClick={onGuestLogin} disabled={loggingIn}>
                {copy.auth.continueGuest}
              </button>
            ) : null}
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setLoginError(null)
                setLoginNotice(null)
                setRegisterPasswordConfirm('')
                setAuthMode((current) => (current === 'login' ? 'register' : 'login'))
              }}
              disabled={loggingIn}
            >
              {authMode === 'login' ? copy.auth.switchToCreate : copy.auth.switchToLogin}
            </button>
          </div>
          {import.meta.env.DEV ? (
            <div className="dev-auth-row">
              <button type="button" className="ghost" onClick={onUseDevAccount} disabled={loggingIn}>
                Use Dev Account
              </button>
              <button type="button" className="ghost" onClick={onResetDevAccount} disabled={loggingIn}>
                Reset Dev Account
              </button>
            </div>
          ) : null}
        </form>

        {/* Public waitlist — shown when invite codes are required so
            strangers without a code have a clear path. Toggles between
            a "Request access" link and an inline form. */}
        {runtimeConfig.auth.requireInviteCode ? (
          <div className="login-waitlist">
            {!showWaitlist ? (
              <button
                type="button"
                className="ghost login-waitlist-toggle"
                onClick={() => setShowWaitlist(true)}
              >
                {copy.waitlist.requestAccessLink}
              </button>
            ) : waitlistStatus === 'success' ? (
              <div className="login-waitlist-success">
                <h2>{copy.waitlist.successTitle}</h2>
                <p className="soft">{copy.waitlist.successBody}</p>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setShowWaitlist(false)
                    setWaitlistEmail('')
                    setWaitlistNote('')
                    setWaitlistStatus('idle')
                    setWaitlistError(null)
                  }}
                >
                  {copy.auth.signIn}
                </button>
              </div>
            ) : (
              <form className="login-waitlist-form" onSubmit={submitWaitlist}>
                <h2>{copy.waitlist.title}</h2>
                <p className="soft">{copy.waitlist.subtitle}</p>
                <label>
                  {copy.waitlist.emailLabel}
                  <input
                    type="email"
                    autoComplete="email"
                    value={waitlistEmail}
                    onChange={(event) => setWaitlistEmail(event.target.value)}
                    required
                  />
                </label>
                <label>
                  {copy.waitlist.noteLabel}
                  <textarea
                    rows={2}
                    value={waitlistNote}
                    onChange={(event) => setWaitlistNote(event.target.value)}
                    maxLength={400}
                  />
                </label>
                {waitlistError ? <p className="error-text">{waitlistError}</p> : null}
                <div className="login-actions">
                  <button type="submit" disabled={waitlistStatus === 'submitting'}>
                    {waitlistStatus === 'submitting'
                      ? copy.waitlist.submitting
                      : copy.waitlist.submit}
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setShowWaitlist(false)}
                    disabled={waitlistStatus === 'submitting'}
                  >
                    {copy.onboarding.back}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </article>
    </main>
  )
}
