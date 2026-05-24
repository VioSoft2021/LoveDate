import React from 'react'
import { UI_TEXT } from '../constants'
import {
  BIG_FIVE_QUESTION_COUNT,
  PERSONALITY_QUESTION_COUNT,
  getPersonalityQuestions,
  lovePersonalityFromAnswers,
  type LikertAnswer,
  type LovePersonality,
  type LovePersonalityReveal,
} from '../services/compatibility'
import { backendInvokeLovePersonalityReveal } from '../services/ai/lovePersonalityReveal'
import type { AppLanguage } from '../domain'

// Reusable Love Personality quiz block. Owns the 14 Likert answers,
// the live preview, the Claude reveal fetch + cache. Shared by:
//   - OnboardingScreen (wraps in wizard chrome with Continue/Back)
//   - LovePersonalityQuizScreen (wraps in standalone Save/Cancel chrome)
//
// CSS reused from src/screens/OnboardingScreen.css (the onboarding-quiz-*
// + onboarding-likert-* + onboarding-quiz-reveal-* class families). The
// OnboardingScreen.css import lives in the parent screen files; this
// component doesn't import CSS itself so it's invariant to host context.

export type LovePersonalityQuizSnapshot = {
  /** Sparse array of length 14. undefined slots mean unanswered. */
  answers: Array<LikertAnswer | undefined>
  /** True when every slot is a valid 1..5 Likert. */
  completed: boolean
  /** Derived bigFive + attachment when completed, else null. */
  lovePersonality: LovePersonality | null
  /** Claude-generated reveal when both answers complete + fetch returned. */
  reveal: LovePersonalityReveal | null
}

export type LovePersonalityQuizProps = {
  appLanguage: AppLanguage
  /** Used by the reveal so Claude can address the user warmly. Optional. */
  selfName?: string
  /** Pre-populate with existing answers (e.g. for a retake). */
  initialAnswers?: Array<LikertAnswer | undefined>
  /** Notified after every answer change AND when the reveal arrives. */
  onChange?: (snapshot: LovePersonalityQuizSnapshot) => void
  /** Hide the H1 / subtitle / body block — standalone hosts use their own header. */
  hideTitle?: boolean
  /** When provided, renders a "Skip for now" button below the result panel. */
  onSkip?: () => void
}

const emptyAnswers = (): Array<LikertAnswer | undefined> =>
  Array(PERSONALITY_QUESTION_COUNT).fill(undefined) as Array<LikertAnswer | undefined>

const buildSnapshot = (
  answers: Array<LikertAnswer | undefined>,
  reveal: LovePersonalityReveal | null,
): LovePersonalityQuizSnapshot => {
  const completed = answers.every((value): value is LikertAnswer => value !== undefined)
  const lovePersonality = completed
    ? lovePersonalityFromAnswers(answers as LikertAnswer[])
    : null
  return { answers, completed, lovePersonality, reveal }
}

export const LovePersonalityQuiz: React.FC<LovePersonalityQuizProps> = ({
  appLanguage,
  selfName,
  initialAnswers,
  onChange,
  hideTitle,
  onSkip,
}) => {
  const copy = UI_TEXT[appLanguage].onboarding
  const t = (template: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      template,
    )

  const [answers, setAnswers] = React.useState<Array<LikertAnswer | undefined>>(
    () => {
      if (!initialAnswers) return emptyAnswers()
      const seed = emptyAnswers()
      for (let i = 0; i < PERSONALITY_QUESTION_COUNT && i < initialAnswers.length; i += 1) {
        const v = initialAnswers[i]
        if (v === 1 || v === 2 || v === 3 || v === 4 || v === 5) {
          seed[i] = v
        }
      }
      return seed
    },
  )
  const [reveal, setReveal] = React.useState<LovePersonalityReveal | null>(null)
  const [revealLoading, setRevealLoading] = React.useState(false)

  const completeAnswers: LikertAnswer[] | null = answers.every(
    (value): value is LikertAnswer => value !== undefined,
  )
    ? (answers as LikertAnswer[])
    : null
  const previewLovePersonality = completeAnswers
    ? lovePersonalityFromAnswers(completeAnswers)
    : null

  // Notify parent whenever the snapshot changes. Done via effect so we don't
  // call onChange during render (would trigger setState-during-render warnings).
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  React.useEffect(() => {
    onChangeRef.current?.(buildSnapshot(answers, reveal))
  }, [answers, reveal])

  // Fire the Claude reveal as soon as all 14 answers are in. Cached by
  // hash(bigFive + attachment + language) for 30 days — changing one
  // answer and back is free.
  React.useEffect(() => {
    if (!previewLovePersonality) return
    if (revealLoading) return
    if (reveal && reveal.language === appLanguage) return
    let cancelled = false
    setRevealLoading(true)
    void (async () => {
      const result = await backendInvokeLovePersonalityReveal({
        bigFive: previewLovePersonality.bigFive,
        attachment: previewLovePersonality.attachment,
        attachmentRatings: previewLovePersonality.attachmentRatings,
        language: appLanguage,
        selfName: selfName?.trim() || undefined,
      })
      if (cancelled) return
      setReveal(result)
      setRevealLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the answer hash + language drive refetches
  }, [
    appLanguage,
    previewLovePersonality?.attachment,
    previewLovePersonality?.bigFive.openness,
    previewLovePersonality?.bigFive.conscientiousness,
    previewLovePersonality?.bigFive.extraversion,
    previewLovePersonality?.bigFive.agreeableness,
    previewLovePersonality?.bigFive.neuroticism,
  ])

  const quizQuestions = getPersonalityQuestions(appLanguage)

  return (
    <>
      {!hideTitle && (
        <>
          <h1>{copy.quizTitle}</h1>
          <p className="onboarding-quiz-subtitle">{copy.quizSubtitle}</p>
          <p>{copy.quizBody}</p>
        </>
      )}
      <p className="onboarding-quiz-stem">{copy.quizBigFiveStem}</p>
      <ol className="onboarding-quiz-list">
        {quizQuestions.map((q, idx) => (
          <React.Fragment key={q.id}>
            {idx === BIG_FIVE_QUESTION_COUNT && (
              <li className="onboarding-quiz-section-break" aria-hidden="true">
                <p className="onboarding-quiz-stem">{copy.quizAttachmentStem}</p>
              </li>
            )}
            <li className="onboarding-quiz-item">
              <p className="onboarding-quiz-prompt">
                <span className="onboarding-quiz-number">{idx + 1}.</span> {q.prompt}
              </p>
              <div className="onboarding-likert" role="radiogroup" aria-label={q.prompt}>
                {([1, 2, 3, 4, 5] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={answers[idx] === value}
                    className={
                      answers[idx] === value
                        ? 'onboarding-likert-cell is-active'
                        : 'onboarding-likert-cell'
                    }
                    onClick={() =>
                      setAnswers((current) => {
                        const next = [...current]
                        next[idx] = value
                        return next
                      })
                    }
                    title={copy.quizLikertLabels[value - 1]}
                  >
                    <span className="onboarding-likert-value">{value}</span>
                    <span className="onboarding-likert-cell-label">
                      {copy.quizLikertLabels[value - 1]}
                    </span>
                  </button>
                ))}
              </div>
            </li>
          </React.Fragment>
        ))}
      </ol>
      {previewLovePersonality ? (
        <div className="onboarding-quiz-result">
          <p className="onboarding-quiz-result-label">{copy.quizResultTitle}</p>
          {reveal ? (
            <div className="onboarding-quiz-reveal">
              <p className="onboarding-quiz-reveal-archetype">{reveal.archetypeName}</p>
              <p className="onboarding-quiz-reveal-headline">{reveal.headline}</p>
              {reveal.description.split(/\n\n+/).map((paragraph, idx) => (
                <p key={idx} className="onboarding-quiz-reveal-paragraph">
                  {paragraph}
                </p>
              ))}
              {reveal.strengths.length > 0 && (
                <div className="onboarding-quiz-reveal-chips">
                  <span className="onboarding-quiz-reveal-chips-label">
                    {copy.quizStrengthsLabel}
                  </span>
                  <div className="onboarding-quiz-reveal-chips-row">
                    {reveal.strengths.map((s, idx) => (
                      <span key={idx} className="onboarding-quiz-reveal-chip">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {reveal.growthEdges.length > 0 && (
                <div className="onboarding-quiz-reveal-chips">
                  <span className="onboarding-quiz-reveal-chips-label">
                    {copy.quizGrowthEdgesLabel}
                  </span>
                  <div className="onboarding-quiz-reveal-chips-row">
                    {reveal.growthEdges.map((s, idx) => (
                      <span key={idx} className="onboarding-quiz-reveal-chip is-soft">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <ul className="onboarding-quiz-bigfive">
            {(
              [
                ['openness', copy.quizDimensionOpenness, previewLovePersonality.bigFive.openness],
                ['conscientiousness', copy.quizDimensionConscientiousness, previewLovePersonality.bigFive.conscientiousness],
                ['extraversion', copy.quizDimensionExtraversion, previewLovePersonality.bigFive.extraversion],
                ['agreeableness', copy.quizDimensionAgreeableness, previewLovePersonality.bigFive.agreeableness],
                ['emotionalStability', copy.quizDimensionEmotionalStability, 100 - previewLovePersonality.bigFive.neuroticism],
              ] as const
            ).map(([key, label, value]) => (
              <li key={key} className="onboarding-quiz-bigfive-row">
                <span className="onboarding-quiz-bigfive-label">{label}</span>
                <span className="onboarding-quiz-bigfive-bar" aria-hidden="true">
                  <span
                    className="onboarding-quiz-bigfive-fill"
                    style={{ width: `${Math.round(value)}%` }}
                  />
                </span>
                <span className="onboarding-quiz-bigfive-value">{Math.round(value)}%</span>
              </li>
            ))}
          </ul>
          <p className="onboarding-quiz-attachment">
            <strong>{copy.quizAttachmentResultLabel}:</strong>{' '}
            {copy.quizAttachmentLabels[previewLovePersonality.attachment]}
          </p>
          {!reveal ? (
            <p className="onboarding-quiz-reveal-pending">
              {revealLoading ? copy.quizRevealLoading : copy.quizRevealPending}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="onboarding-quiz-progress soft">
          {t(copy.quizProgress, {
            n: answers.filter((v) => v !== undefined).length,
            total: PERSONALITY_QUESTION_COUNT,
          })}
        </p>
      )}
      {onSkip ? (
        <button
          type="button"
          className="onboarding-quiz-skip"
          onClick={() => {
            setAnswers(emptyAnswers())
            setReveal(null)
            onSkip()
          }}
        >
          {copy.quizSkipForNow}
        </button>
      ) : null}
    </>
  )
}
