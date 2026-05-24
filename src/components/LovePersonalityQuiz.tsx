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
import './LovePersonalityQuiz.css'

// Cinematic one-question-at-a-time Love Personality assessment.
// 17 cards total: intro + 10 BFI items + interlude + 4 attachment items + result.
// Auto-advances after a brief delay on each answer tap; user can step back
// via the arrow in the card header. CSS fade animates each card in.
//
// Parents (OnboardingScreen, LovePersonalityQuizScreen) consume `position`
// from the snapshot to decide when to show their own outer chrome — they
// hide back/continue/save mid-quiz so the carousel can own the moment.

export type LovePersonalityQuizSnapshot = {
  answers: Array<LikertAnswer | undefined>
  completed: boolean
  lovePersonality: LovePersonality | null
  reveal: LovePersonalityReveal | null
  /** Carousel position — parents use this to decide their own chrome. */
  position: 'intro' | 'question' | 'interlude' | 'result'
}

export type LovePersonalityQuizProps = {
  appLanguage: AppLanguage
  selfName?: string
  initialAnswers?: Array<LikertAnswer | undefined>
  onChange?: (snapshot: LovePersonalityQuizSnapshot) => void
  /** Small italic "Skip for now" link under the intro/question cards. */
  onSkip?: () => void
}

// Card layout (17 steps total):
//   0           intro
//   1..10       Q1..Q10 (BFI-10)
//   11          interlude ("Now: how you love")
//   12..15      Q11..Q14 (Attachment)
//   16          result
const TOTAL_STEPS = 17
const FIRST_BIG_FIVE_STEP = 1
const LAST_BIG_FIVE_STEP = 10
const INTERLUDE_STEP = 11
const FIRST_ATTACHMENT_STEP = 12
const LAST_ATTACHMENT_STEP = 15
const RESULT_STEP = 16
const AUTO_ADVANCE_MS = 360

const stepToQuestionIndex = (step: number): number | null => {
  if (step >= FIRST_BIG_FIVE_STEP && step <= LAST_BIG_FIVE_STEP) {
    return step - FIRST_BIG_FIVE_STEP
  }
  if (step >= FIRST_ATTACHMENT_STEP && step <= LAST_ATTACHMENT_STEP) {
    return step - FIRST_ATTACHMENT_STEP + BIG_FIVE_QUESTION_COUNT
  }
  return null
}

const stepPosition = (step: number): LovePersonalityQuizSnapshot['position'] => {
  if (step === 0) return 'intro'
  if (step === INTERLUDE_STEP) return 'interlude'
  if (step === RESULT_STEP) return 'result'
  return 'question'
}

const emptyAnswers = (): Array<LikertAnswer | undefined> =>
  Array(PERSONALITY_QUESTION_COUNT).fill(undefined) as Array<LikertAnswer | undefined>

const buildSnapshot = (
  answers: Array<LikertAnswer | undefined>,
  reveal: LovePersonalityReveal | null,
  step: number,
): LovePersonalityQuizSnapshot => {
  const completed = answers.every((value): value is LikertAnswer => value !== undefined)
  const lovePersonality = completed
    ? lovePersonalityFromAnswers(answers as LikertAnswer[])
    : null
  return { answers, completed, lovePersonality, reveal, position: stepPosition(step) }
}

export const LovePersonalityQuiz: React.FC<LovePersonalityQuizProps> = ({
  appLanguage,
  selfName,
  initialAnswers,
  onChange,
  onSkip,
}) => {
  const copy = UI_TEXT[appLanguage].onboarding
  const ro = appLanguage === 'ro'

  const [answers, setAnswers] = React.useState<Array<LikertAnswer | undefined>>(() => {
    if (!initialAnswers) return emptyAnswers()
    const seed = emptyAnswers()
    for (let i = 0; i < PERSONALITY_QUESTION_COUNT && i < initialAnswers.length; i += 1) {
      const v = initialAnswers[i]
      if (v === 1 || v === 2 || v === 3 || v === 4 || v === 5) {
        seed[i] = v
      }
    }
    return seed
  })
  const [step, setStep] = React.useState(0)
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

  // Notify parent on every change.
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  React.useEffect(() => {
    onChangeRef.current?.(buildSnapshot(answers, reveal, step))
  }, [answers, reveal, step])

  // Fire Claude reveal when all 14 answers are in.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appLanguage,
    previewLovePersonality?.attachment,
    previewLovePersonality?.bigFive.openness,
    previewLovePersonality?.bigFive.conscientiousness,
    previewLovePersonality?.bigFive.extraversion,
    previewLovePersonality?.bigFive.agreeableness,
    previewLovePersonality?.bigFive.neuroticism,
  ])

  const questionIndex = stepToQuestionIndex(step)
  const quizQuestions = getPersonalityQuestions(appLanguage)
  const currentQuestion = questionIndex !== null ? quizQuestions[questionIndex] : null

  const goToStep = (next: number) => {
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, next)))
  }
  const advance = () => goToStep(step + 1)
  const back = () => goToStep(step - 1)

  // Auto-advance: pause briefly after the user taps so the gold-fill
  // animation lands, then fade to the next card.
  const handleAnswer = (value: LikertAnswer) => {
    if (questionIndex === null) return
    setAnswers((current) => {
      const next = [...current]
      next[questionIndex] = value
      return next
    })
    window.setTimeout(() => {
      setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))
    }, AUTO_ADVANCE_MS)
  }

  // Progress bar — based on answers recorded, so backing up doesn't shrink it.
  const answeredCount = answers.filter((v) => v !== undefined).length
  const progressPercent =
    step === 0
      ? 0
      : step === RESULT_STEP
        ? 100
        : Math.round((answeredCount / PERSONALITY_QUESTION_COUNT) * 100)

  const isQuestionStep = questionIndex !== null
  const isFirstQuestion = step === FIRST_BIG_FIVE_STEP

  return (
    <div className="lp-quiz">
      {step > 0 && (
        <div className="lp-quiz-progress" aria-hidden="true">
          <div className="lp-quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      <div className="lp-quiz-stage">
        {step === 0 && (
          <div className="lp-quiz-card lp-quiz-card-intro" key="intro">
            <p className="lp-quiz-eyebrow">{copy.quizSubtitle}</p>
            <h1 className="lp-quiz-title">{copy.quizTitle}</h1>
            <p className="lp-quiz-body">{copy.quizBody}</p>
            <button type="button" className="lp-quiz-primary-btn" onClick={advance}>
              {ro ? 'Începe' : 'Begin'}
            </button>
            {onSkip ? (
              <button type="button" className="lp-quiz-skip-link" onClick={onSkip}>
                {copy.quizSkipForNow}
              </button>
            ) : null}
          </div>
        )}

        {isQuestionStep && currentQuestion && (
          <div className="lp-quiz-card lp-quiz-card-question" key={`q-${step}`}>
            {!isFirstQuestion && (
              <button
                type="button"
                className="lp-quiz-back"
                onClick={back}
                aria-label={ro ? 'Înapoi' : 'Back'}
                title={ro ? 'Înapoi' : 'Back'}
              >
                ←
              </button>
            )}
            <p className="lp-quiz-prompt">{currentQuestion.prompt}</p>
            <div
              className="lp-quiz-pills"
              role="radiogroup"
              aria-label={currentQuestion.prompt}
            >
              {([1, 2, 3, 4, 5] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={answers[questionIndex] === value}
                  className={
                    answers[questionIndex] === value
                      ? 'lp-quiz-pill is-active'
                      : 'lp-quiz-pill'
                  }
                  onClick={() => handleAnswer(value)}
                >
                  <span className="lp-quiz-pill-value">{value}</span>
                  <span className="lp-quiz-pill-label">
                    {copy.quizLikertLabels[value - 1]}
                  </span>
                </button>
              ))}
            </div>
            {onSkip ? (
              <button type="button" className="lp-quiz-skip-link" onClick={onSkip}>
                {copy.quizSkipForNow}
              </button>
            ) : null}
          </div>
        )}

        {step === INTERLUDE_STEP && (
          <div className="lp-quiz-card lp-quiz-card-interlude" key="interlude">
            <p className="lp-quiz-eyebrow">{ro ? 'Acum' : 'Now'}</p>
            <h2 className="lp-quiz-interlude-title">
              {ro ? 'Cum iubești.' : 'How you love.'}
            </h2>
            <p className="lp-quiz-body">{copy.quizAttachmentStem}</p>
            <button type="button" className="lp-quiz-primary-btn" onClick={advance}>
              {ro ? 'Continuă' : 'Continue'}
            </button>
            <button type="button" className="lp-quiz-back-link" onClick={back}>
              ← {ro ? 'Înapoi' : 'Back'}
            </button>
          </div>
        )}

        {step === RESULT_STEP && previewLovePersonality && (
          <div className="lp-quiz-card lp-quiz-card-result" key="result">
            <p className="lp-quiz-eyebrow">{copy.quizResultTitle}</p>
            {reveal ? (
              <div className="lp-quiz-reveal">
                <p className="lp-quiz-reveal-archetype">{reveal.archetypeName}</p>
                <p className="lp-quiz-reveal-headline">{reveal.headline}</p>
                {reveal.description.split(/\n\n+/).map((paragraph, idx) => (
                  <p key={idx} className="lp-quiz-reveal-paragraph">
                    {paragraph}
                  </p>
                ))}
                {reveal.strengths.length > 0 && (
                  <div className="lp-quiz-reveal-chips">
                    <span className="lp-quiz-reveal-chips-label">
                      {copy.quizStrengthsLabel}
                    </span>
                    <div className="lp-quiz-reveal-chips-row">
                      {reveal.strengths.map((s, idx) => (
                        <span key={idx} className="lp-quiz-reveal-chip">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {reveal.growthEdges.length > 0 && (
                  <div className="lp-quiz-reveal-chips">
                    <span className="lp-quiz-reveal-chips-label">
                      {copy.quizGrowthEdgesLabel}
                    </span>
                    <div className="lp-quiz-reveal-chips-row">
                      {reveal.growthEdges.map((s, idx) => (
                        <span key={idx} className="lp-quiz-reveal-chip is-soft">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="lp-quiz-reveal-pending">
                {revealLoading ? copy.quizRevealLoading : copy.quizRevealPending}
              </p>
            )}
            <ul className="lp-quiz-bigfive">
              {(
                [
                  ['openness', copy.quizDimensionOpenness, previewLovePersonality.bigFive.openness],
                  ['conscientiousness', copy.quizDimensionConscientiousness, previewLovePersonality.bigFive.conscientiousness],
                  ['extraversion', copy.quizDimensionExtraversion, previewLovePersonality.bigFive.extraversion],
                  ['agreeableness', copy.quizDimensionAgreeableness, previewLovePersonality.bigFive.agreeableness],
                  ['emotionalStability', copy.quizDimensionEmotionalStability, 100 - previewLovePersonality.bigFive.neuroticism],
                ] as const
              ).map(([key, label, value]) => (
                <li key={key} className="lp-quiz-bigfive-row">
                  <span className="lp-quiz-bigfive-label">{label}</span>
                  <span className="lp-quiz-bigfive-bar" aria-hidden="true">
                    <span
                      className="lp-quiz-bigfive-fill"
                      style={{ width: `${Math.round(value)}%` }}
                    />
                  </span>
                  <span className="lp-quiz-bigfive-value">{Math.round(value)}%</span>
                </li>
              ))}
            </ul>
            <p className="lp-quiz-attachment-line">
              <strong>{copy.quizAttachmentResultLabel}:</strong>{' '}
              {copy.quizAttachmentLabels[previewLovePersonality.attachment]}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
