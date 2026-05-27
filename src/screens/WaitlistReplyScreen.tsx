import React from 'react'
import './LoginScreen.css'
import { Logo } from '../components/Logo'
import { UI_TEXT } from '../constants'
import {
  backendGetWaitlistQuestion,
  backendSubmitWaitlistReply,
} from '../services/backendApi'
import type { AppLanguage } from '../domain'

// Magic-link follow-up reply page (waitlist v2, 2026-05-27).
//
// Reached via prive-app.club/#/waitlist-reply/<token> — a link Master
// sends a borderline applicant after marking their request "needs
// info" in InviteAdmin. Token-only: no auth, no email check. We fetch
// the question (first name + question text only — never other PII),
// the applicant answers once, and the token is burned server-side.

export type WaitlistReplyScreenProps = {
  token: string
  appLanguage: AppLanguage
  setAppLanguage: (lang: AppLanguage) => void
  /** Returns the visitor to the landing hero once they're done. */
  onExit: () => void
}

export const WaitlistReplyScreen: React.FC<WaitlistReplyScreenProps> = ({
  token,
  appLanguage,
  onExit,
}) => {
  const w = UI_TEXT[appLanguage].waitlist
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'invalid'>('loading')
  const [firstName, setFirstName] = React.useState('')
  const [question, setQuestion] = React.useState('')
  const [reply, setReply] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await backendGetWaitlistQuestion(token)
      if (cancelled) return
      if (!result || !result.question) {
        setLoadState('invalid')
        return
      }
      setFirstName(result.firstName)
      setQuestion(result.question)
      setLoadState('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reply.trim()) {
      setError(w.replyEmpty)
      setStatus('error')
      return
    }
    setError(null)
    setStatus('submitting')
    try {
      await backendSubmitWaitlistReply(token, reply.trim())
      setStatus('success')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(/invalid or expired/i.test(message) ? w.replyInvalid : w.replyFailed)
      setStatus('error')
    }
  }

  const greeting = firstName ? w.replyGreeting.replace('{name}', firstName) : null

  return (
    <main className="login-shell">
      <div className="grain" aria-hidden="true" />
      <article className="login-card">
        <div className="login-card-brand">
          <img
            className="login-card-crest"
            src="./crests/crest-3.png?v=2"
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
          />
          <Logo variant="hero" size="lg" showSlogan className="login-hero-logo" />
        </div>

        {loadState === 'loading' ? (
          <p className="soft">…</p>
        ) : loadState === 'invalid' ? (
          <>
            <h1>{w.replyTitle}</h1>
            <p className="soft">{w.replyInvalid}</p>
            <div className="login-actions">
              <button type="button" className="ghost" onClick={onExit}>
                {w.successDone}
              </button>
            </div>
          </>
        ) : status === 'success' ? (
          <>
            <h1>{w.replySuccessTitle}</h1>
            <p className="soft">{w.replySuccessBody}</p>
            <div className="login-actions">
              <button type="button" className="ghost" onClick={onExit}>
                {w.successDone}
              </button>
            </div>
          </>
        ) : (
          <form className="login-waitlist-form" onSubmit={submit}>
            <h1>{w.replyTitle}</h1>
            {greeting ? <p className="soft">{greeting}</p> : null}
            <p className="soft">{w.replyIntro}</p>
            <p className="login-reply-question">{question}</p>
            <label>
              <textarea
                rows={4}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder={w.replyPlaceholder}
                maxLength={2000}
                autoFocus
                required
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <div className="login-actions">
              <button type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? w.replySubmitting : w.replySubmit}
              </button>
            </div>
          </form>
        )}
      </article>
    </main>
  )
}
