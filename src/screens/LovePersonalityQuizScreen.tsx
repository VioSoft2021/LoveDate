import React from 'react'
import { UI_TEXT } from '../constants'
import type { AppLanguage, SelfProfile } from '../domain'
import {
  type LikertAnswer,
  type LovePersonality,
} from '../services/compatibility'
import {
  LovePersonalityQuiz,
  type LovePersonalityQuizSnapshot,
} from '../components/LovePersonalityQuiz'
import { Logo } from '../components/Logo'
import './LovePersonalityScreen.css'

// Standalone host for the LovePersonalityQuiz component — used for the
// retake flow from Profile. No onboarding chrome (no progress dots, no
// photo step, no city detector). Save commits the new lovePersonality
// into SelfProfile and returns to the destination screen.

export type LovePersonalityQuizScreenProps = {
  appLanguage: AppLanguage
  selfProfile: SelfProfile
  setSelfProfile: React.Dispatch<React.SetStateAction<SelfProfile>>
  onSaved: () => void
  onCancel: () => void
}

export const LovePersonalityQuizScreen: React.FC<LovePersonalityQuizScreenProps> = ({
  appLanguage,
  selfProfile,
  setSelfProfile,
  onSaved,
  onCancel,
}) => {
  const onboardingCopy = UI_TEXT[appLanguage].onboarding
  const ro = appLanguage === 'ro'

  const [snapshot, setSnapshot] = React.useState<LovePersonalityQuizSnapshot>({
    answers: (selfProfile.personalityAnswers ?? Array(14).fill(undefined)) as Array<LikertAnswer | undefined>,
    completed: Boolean(selfProfile.personalityAnswers && selfProfile.personalityAnswers.length === 14),
    lovePersonality: selfProfile.lovePersonality ?? null,
    reveal: selfProfile.lovePersonality?.reveal ?? null,
  })

  const handleSave = () => {
    if (!snapshot.completed || !snapshot.lovePersonality) {
      // Should be disabled via the button; defensive return.
      return
    }
    const lovePersonalityWithReveal: LovePersonality = snapshot.reveal
      ? { ...snapshot.lovePersonality, reveal: snapshot.reveal }
      : snapshot.lovePersonality
    setSelfProfile((current) => ({
      ...current,
      personalityAnswers: snapshot.answers as LikertAnswer[],
      lovePersonality: lovePersonalityWithReveal,
    }))
    onSaved()
  }

  return (
    <main className="love-personality-shell">
      <header className="love-personality-head">
        <button type="button" className="ghost love-personality-back" onClick={onCancel}>
          {'×'} {ro ? 'Anulează' : 'Cancel'}
        </button>
        <Logo variant="compact" size="sm" />
      </header>

      <section className="love-personality-quiz-section">
        <h1 className="love-personality-quiz-title">{onboardingCopy.quizTitle}</h1>
        <p className="love-personality-quiz-subtitle">{onboardingCopy.quizSubtitle}</p>
        <p className="love-personality-quiz-body">{onboardingCopy.quizBody}</p>

        <LovePersonalityQuiz
          appLanguage={appLanguage}
          selfName={selfProfile.name}
          initialAnswers={snapshot.answers}
          onChange={setSnapshot}
          hideTitle
        />
      </section>

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
    </main>
  )
}
