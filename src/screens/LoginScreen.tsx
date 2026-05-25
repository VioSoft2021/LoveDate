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

        {/* Layout (2026-05-25 final pass v2 — after Master's "horrible"
            feedback on v1):
            - Desktop ≥900px: 2 columns anchored to viewport edges (not
              centered). Left column FLUSH LEFT, right column FLUSH RIGHT.
              The middle of the page is empty space (like a magazine
              spread). Each column's content centered horizontally inside
              its own column so the crest sits CENTERED OVER the wordmark.
            - Left column: crest + wordmark + slogan + doors (like the
              pre-crest layout had it — content centered, anchored left).
            - Right column: single-line tagline revealed horizontally by a
              pen whose tip TRACKS the leading edge of the reveal.
            - Mobile: vertical centered column (everything stacks).
            - Édition mark deleted; language picker label deleted, dropdown stays. */}
        <section className="login-hero">
          {/* LEFT column — seal, masthead, doors. All centered within
              the column so the crest naturally aligns over the wordmark. */}
          <div className="login-hero-left">
            <div className="login-hero-seal">
              <img
                className="login-hero-crest"
                src="./crests/crest-3.png?v=2"
                alt=""
                loading="eager"
                decoding="async"
              />
            </div>
            <header className="login-hero-masthead">
              <h1 className="login-hero-wordmark" aria-label="Privé">PRIVÉ</h1>
              <p className="login-hero-slogan">Members only &middot; By design</p>
            </header>
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
          </div>

          {/* RIGHT column — the brand promise written by a pen. Single
              horizontal line; the pen's tip is at the viewBox left edge
              (x=0) so positioning the pen at left:N% puts the tip exactly
              at N% of the writing container. */}
          <div className="login-hero-right">
            <div className="login-hero-writing">
              <svg
                className="login-hero-pen"
                viewBox="-4 -2 54 44"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="penBody" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f4dca8" />
                    <stop offset="40%" stopColor="#cfad61" />
                    <stop offset="100%" stopColor="#8b6b2c" />
                  </linearGradient>
                  <linearGradient id="penCap" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#cfad61" />
                    <stop offset="50%" stopColor="#8b6b2c" />
                    <stop offset="100%" stopColor="#3a2810" />
                  </linearGradient>
                </defs>
                {/* Proper fountain pen — drawn vertical with tip at origin,
                    then rotated 55° clockwise + translated so the tip
                    lands at viewBox (0, 40). Composed of distinct
                    fountain-pen anatomy parts: nib (with slit + breathing
                    hole), section, body barrel, trim ring, cap, finial,
                    pocket clip. */}
                <g transform="translate(0 40) rotate(55)">
                  {/* Nib — pointed gold triangle, darker than body */}
                  <path
                    d="M -2 -8 L 0 0 L 2 -8 L 2.2 -10 L -2.2 -10 Z"
                    fill="#5a4520"
                    stroke="#2a1a08"
                    strokeWidth="0.2"
                  />
                  {/* Nib slit — the defining feature of a fountain pen */}
                  <line
                    x1="0" y1="-1" x2="0" y2="-8"
                    stroke="#0a0500" strokeWidth="0.5"
                    strokeLinecap="round"
                  />
                  {/* Breathing hole — small round dot at top of slit */}
                  <circle cx="0" cy="-8.5" r="0.9" fill="#0a0500" />
                  {/* Section — short taper between nib and body */}
                  <path
                    d="M -2.2 -10 L 2.2 -10 L 2.6 -14 L -2.6 -14 Z"
                    fill="url(#penBody)"
                  />
                  {/* Trim ring — thin band where section meets body */}
                  <rect
                    x="-2.7" y="-14.5" width="5.4" height="0.7"
                    fill="#3a2810"
                  />
                  {/* Body barrel — main uniform-width section */}
                  <rect
                    x="-2.6" y="-32" width="5.2" height="17.5"
                    fill="url(#penBody)"
                    stroke="#3a2810" strokeWidth="0.15"
                  />
                  {/* Cap trim ring */}
                  <rect
                    x="-2.9" y="-33.5" width="5.8" height="1.5"
                    fill="#3a2810"
                  />
                  {/* Cap — slightly wider than body */}
                  <rect
                    x="-3.2" y="-46" width="6.4" height="12.5"
                    rx="0.4"
                    fill="url(#penCap)"
                    stroke="#3a2810" strokeWidth="0.15"
                  />
                  {/* Cap top finial — small darker dome */}
                  <ellipse
                    cx="0" cy="-46" rx="3.4" ry="0.9"
                    fill="#3a2810"
                  />
                  {/* Pocket clip — the gold arm hooked over the cap */}
                  <path
                    d="M 3.2 -44.5 L 3.5 -36 L 2.6 -33.5"
                    stroke="url(#penCap)" strokeWidth="1.4"
                    fill="none" strokeLinecap="round"
                  />
                  {/* Subtle highlight stripe down the cap for sheen */}
                  <line
                    x1="-1.2" y1="-45" x2="-1.2" y2="-34"
                    stroke="rgba(255,248,231,0.4)" strokeWidth="0.6"
                  />
                  {/* Subtle highlight on the body */}
                  <line
                    x1="-1.4" y1="-31" x2="-1.4" y2="-15"
                    stroke="rgba(255,248,231,0.32)" strokeWidth="0.5"
                  />
                </g>
              </svg>
              <p className="login-hero-tagline">
                <span className="tagline-text">{copy.auth.heroTagline}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Language picker — label deleted per Master's instruction
            (2026-05-25), just the <select> remains. Stays in the
            top-right corner. */}
        <footer className="login-hero-footer">
          <select
            className="login-hero-language-select"
            value={appLanguage}
            onChange={(event) => setAppLanguage(event.target.value as AppLanguage)}
            aria-label={copy.auth.language}
          >
            <option value="en">{copy.auth.english}</option>
            <option value="ro">{copy.auth.romanian}</option>
          </select>
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
