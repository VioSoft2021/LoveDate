import React from 'react'
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
// retake flow from Profile. The carousel owns its own intro card + chrome;
// this wrapper just provides Cancel (top-left) and a Save action that
// appears only once the user reaches the result step.

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
  const ro = appLanguage === 'ro'

  const [snapshot, setSnapshot] = React.useState<LovePersonalityQuizSnapshot>({
    answers: (selfProfile.personalityAnswers ?? Array(14).fill(undefined)) as Array<LikertAnswer | undefined>,
    completed: Boolean(selfProfile.personalityAnswers && selfProfile.personalityAnswers.length === 14),
    lovePersonality: selfProfile.lovePersonality ?? null,
    reveal: selfProfile.lovePersonality?.reveal ?? null,
    position: 'intro',
  })

  const handleSave = () => {
    if (!snapshot.completed || !snapshot.lovePersonality) return
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

  // Show Save only on the result card. Anywhere else, the carousel owns
  // the moment and shouldn't compete with a chunky footer button.
  const showSave = snapshot.position === 'result'

  return (
    <main className="love-personality-shell">
      <header className="love-personality-head">
        <button type="button" className="ghost love-personality-back" onClick={onCancel}>
          {'×'} {ro ? 'Anulează' : 'Cancel'}
        </button>
        <Logo variant="compact" size="sm" />
      </header>

      <section className="love-personality-quiz-section">
        <LovePersonalityQuiz
          appLanguage={appLanguage}
          selfName={selfProfile.name}
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
