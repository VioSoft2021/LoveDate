import React from 'react'
import './LoginScreen.css'
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

  // Phase A (2026-05-24) — landing view state. Fresh visitors arriving
  // from the welcome video CTA see a "hero" first, not the auth form.
  // They pick a path (request access / have invite / already signed up)
  // and the relevant form slides into view inside the same card.
  // Requiring an invite code is what triggers the hero: if the build
  // doesn't require codes, we skip straight to the legacy sign-in form
  // because the hero promises "invite-only" — would be a lie otherwise.
  const heroEnabled = runtimeConfig.auth.requireInviteCode
  const [viewMode, setViewMode] = React.useState<'hero' | 'card'>(
    heroEnabled ? 'hero' : 'card',
  )

  const goToWaitlist = () => {
    setShowWaitlist(true)
    setViewMode('card')
  }
  const goToAuth = (mode: 'login' | 'register') => {
    setShowWaitlist(false)
    setAuthMode(mode)
    setLoginError(null)
    setLoginNotice(null)
    setViewMode('card')
  }
  const backToHero = () => {
    if (!heroEnabled) return
    setShowWaitlist(false)
    setWaitlistEmail('')
    setWaitlistNote('')
    setWaitlistStatus('idle')
    setWaitlistError(null)
    setLoginError(null)
    setLoginNotice(null)
    setViewMode('hero')
  }

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

  // ── Hero state ─────────────────────────────────────────────────────
  // V4 (2026-05-24) — "Editorial Silence". Stripped to what real luxury
  // houses do: vast negative space, small precise type, almost no
  // decoration, one ambient thread of light. No pills, no heart visual,
  // no drifting particles. The composition IS the typography.
  if (viewMode === 'hero') {
    return (
      <main className="login-shell login-shell--hero">
        <div className="grain" aria-hidden="true" />

        {/* The brand mark column — crest above, handwritten manifesto
            opening beneath. Lives on the right side of the hero, centred
            vertically. Reads as: the house seal + a personal note. */}
        <div className="login-hero-mark" aria-hidden="true">
          <img
            className="login-hero-crest"
            src="./crests/crest-3.png"
            alt=""
            loading="eager"
            decoding="async"
          />
          <svg
            className="login-hero-calligraphy"
            viewBox="0 0 1200 200"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="calliGold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#cfad61" />
                <stop offset="50%" stopColor="#f4dca8" />
                <stop offset="100%" stopColor="#cfad61" />
              </linearGradient>
            </defs>
            {/* Filled text (bottom layer) — fades in once the outline is
                drawn so the letters "settle with ink" at the end. */}
            <text
              x="600"
              y="120"
              textAnchor="middle"
              className="calli-text calli-text-fill"
              fill="url(#calliGold)"
            >
              {copy.auth.heroCalligraphy}
            </text>
            {/* Outlined text (top layer) — stroke draws via dashoffset to
                create the "writing" effect; remains visible over the fill
                as a fine pen outline, fades together with the fill at end. */}
            <text
              x="600"
              y="120"
              textAnchor="middle"
              className="calli-text calli-text-stroke"
              fill="none"
              stroke="url(#calliGold)"
              strokeWidth="0.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {copy.auth.heroCalligraphy}
            </text>
          </svg>
        </div>

        {/* Editorial mark in the top-right corner — issue number style.
            Anchors the upper-right negative space. */}
        <p className="login-hero-edition" aria-hidden="true">
          <span>Édition</span>
          <span>2026</span>
        </p>

        {/* Spread the content across the viewport in editorial rhythm:
              top-left  → masthead (PRIVÉ + slogan)
              middle    → the brand promise as a pull-quote
              bottom    → the three doors + (offscreen footer) language */}
        <section className="login-hero">
          <header className="login-hero-masthead">
            <h1 className="login-hero-wordmark" aria-label="Privé">PRIVÉ</h1>
            <p className="login-hero-slogan">Members only &middot; By design</p>
          </header>

          <div className="login-hero-body">
            <p className="login-hero-tagline">{copy.auth.heroTagline}</p>
            <p className="login-hero-manifesto">{copy.auth.heroManifesto}</p>
          </div>

          <nav className="login-hero-doors" aria-label="Access">
            <button
              type="button"
              className="login-hero-door"
              onClick={goToWaitlist}
            >
              {copy.auth.heroRequestAccess}
            </button>
            <button
              type="button"
              className="login-hero-door"
              onClick={() => goToAuth('register')}
            >
              {copy.auth.heroHaveInvite}
            </button>
            <button
              type="button"
              className="login-hero-door"
              onClick={() => goToAuth('login')}
            >
              {copy.auth.heroSignIn}
            </button>
          </nav>
        </section>

        <footer className="login-hero-footer">
          <label className="login-hero-language">
            <span>{copy.auth.language}</span>
            <select
              value={appLanguage}
              onChange={(event) => setAppLanguage(event.target.value as AppLanguage)}
            >
              <option value="en">{copy.auth.english}</option>
              <option value="ro">{copy.auth.romanian}</option>
            </select>
          </label>
        </footer>
      </main>
    )
  }

  // ── Card state (auth + waitlist forms) ─────────────────────────────
  return (
    <main className="login-shell">
      <div className="grain" aria-hidden="true" />
      <article className="login-card">
        {heroEnabled && (
          <button
            type="button"
            className="login-back-to-hero"
            onClick={backToHero}
            aria-label={copy.auth.heroBack}
          >
            {copy.auth.heroBack}
          </button>
        )}
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
        {!showWaitlist && (
          <>
            <h1>{authMode === 'register' ? copy.auth.createTitle : copy.auth.signInTitle}</h1>
            <form className="login-form" onSubmit={onSubmit}>
              {/* Invite code is a one-time signup gate. Returning users don't
                  re-prove they were invited every time they sign in, so we
                  only show this field in register mode. */}
              {runtimeConfig.auth.requireInviteCode && authMode === 'register' ? (
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
                {/* The authMode toggle ("Create account" / "I already have an
                    account") is redundant when the hero owns path selection.
                    Visitors who pick the wrong path use ← Back to return to
                    the hero and choose the other CTA. Kept under !heroEnabled
                    for dev/test mode where there's no hero entry. */}
                {!heroEnabled ? (
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
                ) : null}
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
          </>
        )}

        {/* Public waitlist — shown when invite codes are required so
            strangers without a code have a clear path. When the hero is
            enabled the visitor reached this card through a deliberate
            "I have an invite code" / "Sign in" choice, so the inline
            "Request access" toggle would be redundant; they can use the
            ← Back link to return to the hero and pick that CTA there.
            Without the hero (test/dev mode) we keep the legacy toggle. */}
        {runtimeConfig.auth.requireInviteCode ? (
          <div className="login-waitlist">
            {!showWaitlist ? (
              !heroEnabled ? (
                <button
                  type="button"
                  className="ghost login-waitlist-toggle"
                  onClick={() => setShowWaitlist(true)}
                >
                  {copy.waitlist.requestAccessLink}
                </button>
              ) : null
            ) : waitlistStatus === 'success' ? (
              <div className="login-waitlist-success">
                <h2>{copy.waitlist.successTitle}</h2>
                <p className="soft">{copy.waitlist.successBody}</p>
                {/* Phase A round 2 — three-line expectation-setting panel
                    so the prospect knows what to wait for and how long.
                    Sits between the success body and the Done button. */}
                <ol className="login-waitlist-next">
                  <li className="login-waitlist-next-title">{copy.waitlist.nextStepsTitle}</li>
                  <li>{copy.waitlist.nextStepsLine1}</li>
                  <li>{copy.waitlist.nextStepsLine2}</li>
                  <li>{copy.waitlist.nextStepsLine3}</li>
                </ol>
                {/* "Done" — closes the success message and returns to the
                    hero/landing if it's enabled, or to the (now-visible)
                    sign-in form otherwise. The previous "Sign In" wording
                    was misleading because the user just confirmed they
                    don't have credentials yet — they're waiting for the
                    invite email. */}
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    if (heroEnabled) {
                      backToHero()
                    } else {
                      setShowWaitlist(false)
                      setWaitlistEmail('')
                      setWaitlistNote('')
                      setWaitlistStatus('idle')
                      setWaitlistError(null)
                    }
                  }}
                >
                  {copy.waitlist.successDone}
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
                  {/* Inline "Back" is redundant when the hero is enabled — the
                      ← Back link at the top of the card already returns to
                      the hero, and it goes to the RIGHT destination (hero,
                      where the visitor came from). The inline button used to
                      drop them into the sign-in form, which was the wrong
                      place. Kept under !heroEnabled for dev/test mode. */}
                  {!heroEnabled ? (
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setShowWaitlist(false)}
                      disabled={waitlistStatus === 'submitting'}
                    >
                      {copy.onboarding.back}
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </div>
        ) : null}
      </article>
    </main>
  )
}
