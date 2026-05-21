import React from 'react'
import {
  PERSONALITY_COGNITIVE_FUNCTIONS,
  PERSONALITY_DIMENSIONS,
  PERSONALITY_TYPE_GUIDE,
  UI_TEXT,
} from '../constants'
import type { AppLanguage } from '../domain'

export type PersonalityGuideScreenProps = {
  appLanguage: AppLanguage
  selfPersonalityCode: string
  onBackToProfile: () => void
}

export const PersonalityGuideScreen: React.FC<PersonalityGuideScreenProps> = ({
  appLanguage,
  selfPersonalityCode,
  onBackToProfile,
}) => {
  const copy = UI_TEXT[appLanguage]
  return (
    <section className="settings-screen personality-guide-screen" aria-label={copy.profile.personalityGuide}>
      <article className="profile-settings personality-guide-intro">
        <p className="pill">{copy.profile.personalityGuide}</p>
        <h2>{copy.profile.personalityGuideSubtitle}</h2>
        <p>{copy.profile.personalityCodeExample}</p>
        <p>
          {copy.profile.personalityCode}: <strong>{selfPersonalityCode}</strong>
        </p>
        <button type="button" className="ghost" onClick={onBackToProfile}>
          {'←'} {copy.profile.backToProfile}
        </button>
      </article>

      <article className="profile-settings personality-dimensions">
        <h2>{copy.profile.letterMeanings}</h2>
        <div className="personality-dimension-grid">
          {PERSONALITY_DIMENSIONS.map((item) => (
            <div key={item.letter} className="personality-dimension-card">
              <p className="compatibility-score">{item.letter}</p>
              <h3>{item.title}</h3>
              <p>{item.meaning}</p>
              <p className="soft">
                {copy.profile.opposite}: {item.opposite}
              </p>
            </div>
          ))}
        </div>
      </article>

      <article className="profile-settings personality-types">
        <h2>{copy.profile.allPersonalityTypes}</h2>
        <div className="personality-types-grid">
          {PERSONALITY_TYPE_GUIDE.map((type) => (
            <div
              key={type.code}
              className={`personality-type-card ${type.code === selfPersonalityCode ? 'is-user-type' : ''}`}
            >
              <p className="compatibility-score">{type.code}</p>
              <h3>{type.label}</h3>
              <p>{type.summary}</p>
              {PERSONALITY_COGNITIVE_FUNCTIONS[type.code] ? (
                <ul className="profile-cognitive-list">
                  <li>
                    <strong>{copy.profile.primary}:</strong>{' '}
                    {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].primary}
                  </li>
                  <li>
                    <strong>{copy.profile.support}:</strong>{' '}
                    {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].support}
                  </li>
                  <li>
                    <strong>{copy.profile.tertiary}:</strong>{' '}
                    {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].tertiary}
                  </li>
                  <li>
                    <strong>{copy.profile.shadow}:</strong>{' '}
                    {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].shadow}
                  </li>
                </ul>
              ) : null}
              {type.code === selfPersonalityCode ? (
                <p className="soft">{copy.profile.thisIsYourType}</p>
              ) : null}
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
