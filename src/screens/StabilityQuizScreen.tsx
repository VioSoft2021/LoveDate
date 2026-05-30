import React from 'react'
import type { AppLanguage, SelfProfile } from '../domain'
import type { LikertAnswer } from '../services/compatibility'
import { STABILITY_QUESTION_COUNT } from '../services/stability'
import { StabilityQuiz, type StabilityQuizSnapshot } from '../components/StabilityQuiz'
// Reuses the Love Personality screen shell — identical chrome.
import './LovePersonalityScreen.css'

// Standalone host for the StabilityQuiz — the take/retake flow reached from
// the Profile card. The carousel owns its intro + chrome; this wrapper just
// provides Cancel (top-left) and a Save action that appears on the result step.

export type StabilityQuizScreenProps = {
  appLanguage: AppLanguage
  selfProfile: SelfProfile
  setSelfProfile: React.Dispatch<React.SetStateAction<SelfProfile>>
  onSaved: () => void
  onCancel: () => void
}

export const StabilityQuizScreen: React.FC<StabilityQuizScreenProps> = ({
  appLanguage,
  selfProfile,
  setSelfProfile,
  onSaved,
  onCancel,
}) => {
  const ro = appLanguage === 'ro'

  const [snapshot, setSnapshot] = React.useState<StabilityQuizSnapshot>({
    answers: (selfProfile.stabilityAnswers ??
      Array(STABILITY_QUESTION_COUNT).fill(undefined)) as Array<LikertAnswer | undefined>,
    completed: Boolean(
      selfProfile.stabilityAnswers &&
        selfProfile.stabilityAnswers.length === STABILITY_QUESTION_COUNT,
    ),
    stabilityProfile: selfProfile.stabilityProfile ?? null,
    position: 'intro',
  })

  const handleSave = () => {
    if (!snapshot.completed || !snapshot.stabilityProfile) return
    setSelfProfile((current) => ({
      ...current,
      stabilityAnswers: snapshot.answers as LikertAnswer[],
      stabilityProfile: snapshot.stabilityProfile ?? undefined,
    }))
    onSaved()
  }

  const showSave = snapshot.position === 'result'

  return (
    <main className="love-personality-shell">
      <button
        type="button"
        className="love-personality-close"
        onClick={onCancel}
        aria-label={ro ? 'Anulează' : 'Cancel'}
        title={ro ? 'Anulează' : 'Cancel'}
      >
        ×
      </button>

      <section className="love-personality-quiz-section">
        <StabilityQuiz
          appLanguage={appLanguage}
          initialAnswers={snapshot.answers}
          onChange={setSnapshot}
        />
      </section>

      {showSave && (
        <footer className="love-personality-footer love-personality-quiz-footer">
          <button
            type="button"
            className="love-personality-primary-btn"
            onClick={handleSave}
            disabled={!snapshot.completed}
          >
            {ro ? 'Salvează și înapoi la profil' : 'Save & return to profile'}
          </button>
          <button type="button" className="ghost love-personality-ghost-btn" onClick={onCancel}>
            {ro ? 'Anulează' : 'Cancel'}
          </button>
        </footer>
      )}
    </main>
  )
}
