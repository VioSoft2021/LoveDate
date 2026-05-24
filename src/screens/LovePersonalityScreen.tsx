import React from 'react'
import { UI_TEXT } from '../constants'
import type { AppLanguage } from '../domain'
import type { LovePersonality, AttachmentStyle } from '../services/compatibility'
import './LovePersonalityScreen.css'

// Destination screen for the user's own Love Personality reveal.
// Promoted from the inline ProfileScreen snippet so the cinematic Claude
// reveal has a permanent home users can return to anytime.

export type LovePersonalityScreenProps = {
  appLanguage: AppLanguage
  selfLovePersonality: LovePersonality | null
  onRetake: () => void
  onSeeScience: () => void
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
  onRetake,
  onSeeScience,
  onBackToProfile,
}) => {
  const copy = UI_TEXT[appLanguage]
  const ro = appLanguage === 'ro'
  const onboardingCopy = UI_TEXT[appLanguage].onboarding

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
          <button type="button" className="ghost love-personality-ghost-btn" onClick={onSeeScience}>
            {ro ? 'Vezi știința din spate' : 'See the science'}
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
            <p className="love-personality-pending">
              {copy.profile.lovePersonalityAwaitingReveal}
            </p>
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

      <footer className="love-personality-footer">
        <button type="button" className="love-personality-primary-btn" onClick={onRetake}>
          {ro ? 'Reia evaluarea' : 'Retake the assessment'}
        </button>
        <button type="button" className="ghost love-personality-ghost-btn" onClick={onSeeScience}>
          {ro ? 'Vezi știința din spate' : 'See the science'}
        </button>
      </footer>
    </main>
  )
}
