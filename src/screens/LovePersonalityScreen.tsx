import React from 'react'
import { UI_TEXT } from '../constants'
import type { AppLanguage, SelfProfile } from '../domain'
import type { LovePersonality, AttachmentStyle } from '../services/compatibility'
import { backendInvokeLovePersonalityReveal } from '../services/ai/lovePersonalityReveal'
import './LovePersonalityScreen.css'

// Destination screen for the user's own Love Personality reveal.
// Promoted from the inline ProfileScreen snippet so the cinematic Claude
// reveal has a permanent home users can return to anytime.
//
// If the user lands here with bigFive + attachment but no cached reveal
// (e.g. the original Claude call failed during the quiz), this screen
// auto-fires a fresh reveal call. A failure surfaces an honest "couldn't
// generate, tap to retry" message instead of a lying "will arrive later"
// placeholder.

export type LovePersonalityScreenProps = {
  appLanguage: AppLanguage
  selfLovePersonality: LovePersonality | null
  selfName?: string
  setSelfProfile: React.Dispatch<React.SetStateAction<SelfProfile>>
  onRetake: () => void
  onBackToProfile: () => void
}

const ATTACHMENT_DESCRIPTIONS_EN: Record<AttachmentStyle, string> = {
  secure: 'Comfortable with both closeness and independence. Tends to stabilise a partner; the best dyadic outcomes in the research.',
  anxious: 'Wants deep closeness and reassurance. Functions best with a steady, consistent partner who is generous with warmth.',
  avoidant: 'Independence is core. Deep intimacy can feel suffocating; functions best with a partner who respects space and pace.',
  disorganized: 'Wants closeness but trust takes time. Functions best with a patient partner who builds safety slowly.',
}

const ATTACHMENT_DESCRIPTIONS_RO: Record<AttachmentStyle, string> = {
  secure: 'Confortabil cu apropierea și cu independența. Tinde să-și stabilizeze partenerul; cele mai bune rezultate de cuplu în cercetare.',
  anxious: 'Își dorește apropiere profundă și siguranță. Funcționează cel mai bine cu un partener constant și generos cu căldura.',
  avoidant: 'Independența este esențială. Intimitatea profundă poate părea sufocantă; funcționează cel mai bine cu un partener care respectă spațiul și ritmul.',
  disorganized: 'Își dorește apropiere dar încrederea ia timp. Funcționează cel mai bine cu un partener răbdător care construiește siguranța lent.',
}

export const LovePersonalityScreen: React.FC<LovePersonalityScreenProps> = ({
  appLanguage,
  selfLovePersonality,
  selfName,
  setSelfProfile,
  onRetake,
  onBackToProfile,
}) => {
  const copy = UI_TEXT[appLanguage]
  const ro = appLanguage === 'ro'
  const onboardingCopy = UI_TEXT[appLanguage].onboarding

  const [revealLoading, setRevealLoading] = React.useState(false)
  const [revealFailed, setRevealFailed] = React.useState(false)

  // Auto-fire the Claude reveal if the user has scores but no reveal cached
  // (e.g. the original call during the quiz failed). Stops trying after one
  // attempt so we don't pound the Edge Function in a loop; the user can hit
  // the retry button if they want another go.
  const needsReveal = Boolean(
    selfLovePersonality && !selfLovePersonality.reveal,
  )
  const attemptReveal = React.useCallback(async () => {
    if (!selfLovePersonality) return
    setRevealLoading(true)
    setRevealFailed(false)
    const reveal = await backendInvokeLovePersonalityReveal({
      bigFive: selfLovePersonality.bigFive,
      attachment: selfLovePersonality.attachment,
      attachmentRatings: selfLovePersonality.attachmentRatings,
      language: appLanguage,
      selfName: selfName?.trim() || undefined,
    })
    setRevealLoading(false)
    if (!reveal) {
      setRevealFailed(true)
      return
    }
    setSelfProfile((current) => ({
      ...current,
      lovePersonality: current.lovePersonality
        ? { ...current.lovePersonality, reveal }
        : current.lovePersonality,
    }))
  }, [selfLovePersonality, appLanguage, selfName, setSelfProfile])

  React.useEffect(() => {
    if (needsReveal && !revealLoading && !revealFailed) {
      void attemptReveal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one auto-attempt; retry is manual
  }, [needsReveal])

  if (!selfLovePersonality) {
    // User hasn't taken the assessment yet — show CTA hero.
    return (
      <main className="love-personality-shell">
        <button
          type="button"
          className="love-personality-close"
          onClick={onBackToProfile}
          aria-label={copy.profile.backToProfile}
          title={copy.profile.backToProfile}
        >
          ×
        </button>
        <section className="love-personality-empty">
          <h1>{onboardingCopy.quizTitle}</h1>
          <p className="love-personality-empty-subtitle">{onboardingCopy.quizSubtitle}</p>
          <p>{onboardingCopy.quizBody}</p>
          <button type="button" className="love-personality-primary-btn" onClick={onRetake}>
            {ro ? 'Începe evaluarea' : 'Take the assessment'}
          </button>
        </section>
      </main>
    )
  }

  const { bigFive, attachment, reveal } = selfLovePersonality
  const attachmentDescription = ro
    ? ATTACHMENT_DESCRIPTIONS_RO[attachment]
    : ATTACHMENT_DESCRIPTIONS_EN[attachment]

  return (
    <main className="love-personality-shell">
      <button
        type="button"
        className="love-personality-close"
        onClick={onBackToProfile}
        aria-label={copy.profile.backToProfile}
        title={copy.profile.backToProfile}
      >
        ×
      </button>

      <section className="love-personality-hero">
        {reveal ? (
          <>
            <p className="love-personality-eyebrow">{copy.profile.lovePersonalityTitle}</p>
            <h1 className="love-personality-archetype">{reveal.archetypeName}</h1>
            <p className="love-personality-headline">{reveal.headline}</p>
            <div className="love-personality-paragraphs">
              {reveal.description.split(/\n\n+/).map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
            {reveal.strengths.length > 0 && (
              <div className="love-personality-chips-block">
                <span className="love-personality-chips-label">{onboardingCopy.quizStrengthsLabel}</span>
                <div className="love-personality-chips-row">
                  {reveal.strengths.map((s, idx) => (
                    <span key={idx} className="love-personality-chip">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {reveal.growthEdges.length > 0 && (
              <div className="love-personality-chips-block">
                <span className="love-personality-chips-label">{onboardingCopy.quizGrowthEdgesLabel}</span>
                <div className="love-personality-chips-row">
                  {reveal.growthEdges.map((s, idx) => (
                    <span key={idx} className="love-personality-chip is-soft">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="love-personality-eyebrow">{copy.profile.lovePersonalityTitle}</p>
            {revealLoading ? (
              <p className="love-personality-pending">
                {ro ? 'Privé îți scrie dezvăluirea…' : 'Privé is writing your reveal…'}
              </p>
            ) : revealFailed ? (
              <>
                <p className="love-personality-pending">
                  {ro
                    ? "Nu am putut genera dezvăluirea ta acum. Conexiunea cu Privé a eșuat — încearcă din nou."
                    : "We couldn't generate your reveal right now. The connection to Privé failed — give it another try."}
                </p>
                <button
                  type="button"
                  className="love-personality-primary-btn"
                  onClick={() => void attemptReveal()}
                  style={{ marginTop: '1rem', alignSelf: 'center' }}
                >
                  {ro ? 'Încearcă din nou' : 'Try again'}
                </button>
              </>
            ) : (
              <p className="love-personality-pending">
                {ro ? 'Privé îți scrie dezvăluirea…' : 'Privé is writing your reveal…'}
              </p>
            )}
          </>
        )}
      </section>

      <section className="love-personality-science">
        <h2>{onboardingCopy.quizResultTitle}</h2>
        <ul className="love-personality-bigfive">
          {(
            [
              ['openness', onboardingCopy.quizDimensionOpenness, bigFive.openness],
              ['conscientiousness', onboardingCopy.quizDimensionConscientiousness, bigFive.conscientiousness],
              ['extraversion', onboardingCopy.quizDimensionExtraversion, bigFive.extraversion],
              ['agreeableness', onboardingCopy.quizDimensionAgreeableness, bigFive.agreeableness],
              ['emotionalStability', onboardingCopy.quizDimensionEmotionalStability, 100 - bigFive.neuroticism],
            ] as const
          ).map(([key, label, value]) => (
            <li key={key} className="love-personality-bigfive-row">
              <span className="love-personality-bigfive-label">{label}</span>
              <span className="love-personality-bigfive-bar" aria-hidden="true">
                <span
                  className="love-personality-bigfive-fill"
                  style={{ width: `${Math.round(value)}%` }}
                />
              </span>
              <span className="love-personality-bigfive-value">{Math.round(value)}%</span>
            </li>
          ))}
        </ul>
        <div className="love-personality-attachment">
          <p className="love-personality-attachment-line">
            <strong>{onboardingCopy.quizAttachmentResultLabel}:</strong>{' '}
            <span className="love-personality-attachment-chip">
              {onboardingCopy.quizAttachmentLabels[attachment]}
            </span>
          </p>
          <p className="love-personality-attachment-desc">{attachmentDescription}</p>
        </div>
      </section>

      <p className="love-personality-closing">
        {ro
          ? 'Aceasta este personalitatea ta în iubire — ceea ce Privé citește ca să-ți găsească oamenii care chiar se potrivesc cu tine.'
          : 'This is your Love Personality — what Privé reads to find the people who actually fit you.'}
      </p>

      <footer className="love-personality-footer">
        <button type="button" className="love-personality-primary-btn" onClick={onRetake}>
          {ro ? 'Reia evaluarea' : 'Retake the assessment'}
        </button>
      </footer>
    </main>
  )
}
