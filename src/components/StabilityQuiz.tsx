import React from 'react'
import { UI_TEXT } from '../constants'
import type { LikertAnswer } from '../services/compatibility'
import {
  STABILITY_QUESTION_COUNT,
  getStabilityQuestions,
  stabilityProfileFromAnswers,
  type StabilityProfile,
  type ChildrenStance,
  type FinanceStance,
  type PaceStance,
} from '../services/stability'
import type { AppLanguage } from '../domain'
// Reuses the Love Personality quiz styling — the carousel layout is identical.
import './LovePersonalityQuiz.css'

// Cinematic one-question-at-a-time Stability Assessment — the optional SECOND
// test. 14 cards: intro + 12 Likert items + result. Mirrors LovePersonalityQuiz
// (auto-advance, back arrow, progress bar, skip link) and reuses its CSS. The
// self result is computed locally (trait bars + value stances) — no Claude
// call here; the AI-written reveal is per-MATCH (M5), not per-self.

export type StabilityQuizSnapshot = {
  answers: Array<LikertAnswer | undefined>
  completed: boolean
  stabilityProfile: StabilityProfile | null
  position: 'intro' | 'question' | 'result'
}

export type StabilityQuizProps = {
  appLanguage: AppLanguage
  initialAnswers?: Array<LikertAnswer | undefined>
  onChange?: (snapshot: StabilityQuizSnapshot) => void
  onSkip?: () => void
}

// Card layout (14 steps): 0 intro, 1..12 questions, 13 result.
const TOTAL_STEPS = 14
const FIRST_QUESTION_STEP = 1
const LAST_QUESTION_STEP = 12
const RESULT_STEP = 13
const AUTO_ADVANCE_MS = 360

const stepToQuestionIndex = (step: number): number | null =>
  step >= FIRST_QUESTION_STEP && step <= LAST_QUESTION_STEP ? step - FIRST_QUESTION_STEP : null

const stepPosition = (step: number): StabilityQuizSnapshot['position'] => {
  if (step === 0) return 'intro'
  if (step === RESULT_STEP) return 'result'
  return 'question'
}

const emptyAnswers = (): Array<LikertAnswer | undefined> =>
  Array(STABILITY_QUESTION_COUNT).fill(undefined) as Array<LikertAnswer | undefined>

const buildSnapshot = (
  answers: Array<LikertAnswer | undefined>,
  step: number,
): StabilityQuizSnapshot => {
  const completed = answers.every((v): v is LikertAnswer => v !== undefined)
  const stabilityProfile = completed
    ? stabilityProfileFromAnswers(answers as LikertAnswer[])
    : null
  return { answers, completed, stabilityProfile, position: stepPosition(step) }
}

export const StabilityQuiz: React.FC<StabilityQuizProps> = ({
  appLanguage,
  initialAnswers,
  onChange,
  onSkip,
}) => {
  const copy = UI_TEXT[appLanguage].onboarding
  const ro = appLanguage === 'ro'

  const [answers, setAnswers] = React.useState<Array<LikertAnswer | undefined>>(() => {
    if (!initialAnswers) return emptyAnswers()
    const seed = emptyAnswers()
    for (let i = 0; i < STABILITY_QUESTION_COUNT && i < initialAnswers.length; i += 1) {
      const v = initialAnswers[i]
      if (v === 1 || v === 2 || v === 3 || v === 4 || v === 5) seed[i] = v
    }
    return seed
  })
  const [step, setStep] = React.useState(0)

  const completeAnswers: LikertAnswer[] | null = answers.every(
    (v): v is LikertAnswer => v !== undefined,
  )
    ? (answers as LikertAnswer[])
    : null
  const previewProfile = completeAnswers ? stabilityProfileFromAnswers(completeAnswers) : null

  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  React.useEffect(() => {
    onChangeRef.current?.(buildSnapshot(answers, step))
  }, [answers, step])

  const questionIndex = stepToQuestionIndex(step)
  const quizQuestions = getStabilityQuestions(appLanguage)
  const currentQuestion = questionIndex !== null ? quizQuestions[questionIndex] : null

  const goToStep = (next: number) => setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, next)))
  const advance = () => goToStep(step + 1)
  const back = () => goToStep(step - 1)

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

  const answeredCount = answers.filter((v) => v !== undefined).length
  const progressPercent =
    step === 0
      ? 0
      : step === RESULT_STEP
        ? 100
        : Math.round((answeredCount / STABILITY_QUESTION_COUNT) * 100)

  const isQuestionStep = questionIndex !== null
  const isFirstQuestion = step === FIRST_QUESTION_STEP

  const childrenLabels: Record<ChildrenStance, string> = {
    yes: copy.stabilityChildrenYes,
    unsure: copy.stabilityChildrenUnsure,
    no: copy.stabilityChildrenNo,
  }
  const financeLabels: Record<FinanceStance, string> = {
    saver: copy.stabilityFinancesSaver,
    balanced: copy.stabilityFinancesBalanced,
    spender: copy.stabilityFinancesSpender,
  }
  const paceLabels: Record<PaceStance, string> = {
    fast: copy.stabilityPaceFast,
    balanced: copy.stabilityPaceBalanced,
    slow: copy.stabilityPaceSlow,
  }

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
            <p className="lp-quiz-eyebrow">{copy.stabilitySubtitle}</p>
            <h1 className="lp-quiz-title">{copy.stabilityTitle}</h1>
            <p className="lp-quiz-body">{copy.stabilityBody}</p>
            <p className="lp-quiz-body">{copy.stabilityBodyTwo}</p>
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
            <div className="lp-quiz-pills" role="radiogroup" aria-label={currentQuestion.prompt}>
              {([1, 2, 3, 4, 5] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={answers[questionIndex] === value}
                  className={
                    answers[questionIndex] === value ? 'lp-quiz-pill is-active' : 'lp-quiz-pill'
                  }
                  onClick={() => handleAnswer(value)}
                >
                  <span className="lp-quiz-pill-value">{value}</span>
                  <span className="lp-quiz-pill-label">{copy.quizLikertLabels[value - 1]}</span>
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

        {step === RESULT_STEP && previewProfile && (
          <div className="lp-quiz-card lp-quiz-card-result" key="result">
            <p className="lp-quiz-eyebrow">{copy.stabilityResultTitle}</p>
            <p className="lp-quiz-body">{copy.stabilityResultSummary}</p>
            <ul className="lp-quiz-bigfive">
              {(
                [
                  ['conflictRepair', copy.stabilityDimConflict, previewProfile.conflictRepair],
                  ['commitment', copy.stabilityDimCommitment, previewProfile.commitment],
                  ['communication', copy.stabilityDimCommunication, previewProfile.communication],
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
              <strong>{copy.stabilityValuesTitle}:</strong>{' '}
              {copy.stabilityChildrenLabel} — {childrenLabels[previewProfile.values.children]}
              {' · '}
              {copy.stabilityFinancesLabel} — {financeLabels[previewProfile.values.finances]}
              {' · '}
              {copy.stabilityPaceLabel} — {paceLabels[previewProfile.values.pace]}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
