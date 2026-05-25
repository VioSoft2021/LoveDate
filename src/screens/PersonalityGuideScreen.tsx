import React from 'react'
import './PersonalityGuideScreen.css'
import { UI_TEXT } from '../constants'
import type { AppLanguage } from '../domain'
import type {
  AttachmentStyle,
  BigFiveScores,
  LovePersonality,
} from '../services/compatibility'

export type PersonalityGuideScreenProps = {
  appLanguage: AppLanguage
  selfLovePersonality: LovePersonality | null
  onBackToProfile: () => void
}

// Tier A (2026-05-24) — explainer for the new Big Five + Attachment
// instrument that replaced the DMFR archetype gallery. No more 16-type
// grid; the user's own results (when present) are shown alongside a
// plain-language description of each dimension and attachment style.

type DimensionCopy = {
  key: keyof BigFiveScores | 'emotionalStability'
  label: string
  description: string
}

const buildBigFiveCopy = (lang: AppLanguage): DimensionCopy[] =>
  lang === 'ro'
    ? [
        { key: 'openness', label: 'Deschidere',
          description: 'Curiozitate pentru idei noi, artă, abstract. Scor înalt = explorator; scor scăzut = preferi familiarul și concretul.' },
        { key: 'conscientiousness', label: 'Conștiinciozitate',
          description: 'Cât de organizat, disciplinat și orientat spre obiective ești. Scor înalt = planificator; scor scăzut = spontan și flexibil.' },
        { key: 'extraversion', label: 'Extraversiune',
          description: 'De unde îți iei energia. Scor înalt = de la oameni și acțiune; scor scăzut = din intimitate și liniște.' },
        { key: 'agreeableness', label: 'Amabilitate',
          description: 'Tendința de a coopera, a avea încredere și a-i susține pe ceilalți. Scor înalt = cald; scor scăzut = direct și competitiv.' },
        { key: 'emotionalStability', label: 'Stabilitate emoțională',
          description: 'Inversul nevroticismului. Scor înalt = calm sub stres; scor scăzut = reacționezi intens la presiune.' },
      ]
    : [
        { key: 'openness', label: 'Openness',
          description: 'Curiosity for new ideas, art, the abstract. High = explorer; low = you prefer the familiar and concrete.' },
        { key: 'conscientiousness', label: 'Conscientiousness',
          description: 'How organised, disciplined, goal-oriented you are. High = planner; low = spontaneous and flexible.' },
        { key: 'extraversion', label: 'Extraversion',
          description: 'Where your energy comes from. High = people and action; low = intimacy and quiet.' },
        { key: 'agreeableness', label: 'Agreeableness',
          description: 'Your tendency to cooperate, trust, and support others. High = warm; low = direct and competitive.' },
        { key: 'emotionalStability', label: 'Emotional Stability',
          description: 'The inverse of neuroticism. High = calm under pressure; low = you feel stress intensely.' },
      ]

type AttachmentCopy = { key: AttachmentStyle; label: string; description: string }

const buildAttachmentCopy = (lang: AppLanguage): AttachmentCopy[] =>
  lang === 'ro'
    ? [
        { key: 'secure', label: 'Sigur',
          description: 'Confortabil cu apropierea și cu independența. Cele mai bune rezultate de cuplu în cercetare; un partener sigur stabilizează adesea relația.' },
        { key: 'anxious', label: 'Anxios',
          description: 'Îți dorești apropiere puternică, dar uneori te temi de respingere sau abandon. Funcționezi cel mai bine cu un partener constant și liniștitor.' },
        { key: 'avoidant', label: 'Evitant',
          description: 'Independența este foarte importantă pentru tine; intimitatea profundă poate părea sufocantă. Funcționezi cel mai bine cu un partener care respectă spațiul.' },
        { key: 'disorganized', label: 'Dezorganizat',
          description: 'Vrei apropiere, dar îți este greu să ai încredere deplină. Funcționezi cel mai bine cu un partener răbdător care construiește încrederea lent.' },
      ]
    : [
        { key: 'secure', label: 'Secure',
          description: 'Comfortable with both closeness and independence. The best couple outcomes in the research; a secure partner often stabilises the relationship.' },
        { key: 'anxious', label: 'Anxious',
          description: 'You want strong closeness but sometimes fear rejection or abandonment. You do best with a consistent, reassuring partner.' },
        { key: 'avoidant', label: 'Avoidant',
          description: 'Independence matters a lot to you; deep intimacy can feel suffocating. You do best with a partner who respects space.' },
        { key: 'disorganized', label: 'Disorganized',
          description: 'You want closeness but find it hard to fully trust. You do best with a patient partner who builds trust slowly.' },
      ]

export const PersonalityGuideScreen: React.FC<PersonalityGuideScreenProps> = ({
  appLanguage,
  selfLovePersonality,
  onBackToProfile,
}) => {
  const copy = UI_TEXT[appLanguage]
  const bigFiveCopy = buildBigFiveCopy(appLanguage)
  const attachmentCopy = buildAttachmentCopy(appLanguage)
  const ro = appLanguage === 'ro'

  const userBigFive = selfLovePersonality?.bigFive
  const userAttachment = selfLovePersonality?.attachment

  const valueFor = (key: DimensionCopy['key']): number | null => {
    if (!userBigFive) return null
    if (key === 'emotionalStability') return 100 - userBigFive.neuroticism
    return userBigFive[key]
  }

  return (
    <section className="settings-screen personality-guide-screen" aria-label={copy.profile.personalityGuide}>
      <article className="profile-settings personality-guide-intro">
        <p className="pill">{copy.profile.personalityGuide}</p>
        <h2>{copy.profile.personalityGuideSubtitle}</h2>
        <p>
          {ro
            ? 'Personalitatea în iubire Privé combină două cadre psihologice validate: modelul Big Five (cinci dimensiuni de personalitate) și teoria atașamentului (cum funcționezi în relații apropiate). Împreună prezic mai bine compatibilitatea pe termen lung decât orice cod cu litere.'
            : 'The Privé Love Personality combines two validated psychological frameworks: the Big Five model (five personality dimensions) and Attachment Theory (how you function in close relationships). Together they predict long-term compatibility far better than any letter-code typology.'}
        </p>
        <button type="button" className="ghost" onClick={onBackToProfile}>
          {'←'} {copy.profile.backToProfile}
        </button>
      </article>

      <article className="profile-settings personality-dimensions">
        <h2>{ro ? 'Cele cinci dimensiuni' : 'The five dimensions'}</h2>
        <div className="personality-dimension-grid">
          {bigFiveCopy.map((item) => {
            const value = valueFor(item.key)
            return (
              <div key={item.key} className="personality-dimension-card">
                <h3>{item.label}</h3>
                {value !== null ? (
                  <p className="compatibility-score">{Math.round(value)}%</p>
                ) : null}
                <p>{item.description}</p>
              </div>
            )
          })}
        </div>
      </article>

      <article className="profile-settings personality-types">
        <h2>{ro ? 'Stiluri de atașament' : 'Attachment styles'}</h2>
        <div className="personality-types-grid">
          {attachmentCopy.map((item) => {
            const isUser = userAttachment === item.key
            return (
              <div
                key={item.key}
                className={`personality-type-card ${isUser ? 'is-user-type' : ''}`}
              >
                <h3>{item.label}</h3>
                <p>{item.description}</p>
                {isUser ? (
                  <p className="soft">{copy.profile.thisIsYourType}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      </article>
    </section>
  )
}
