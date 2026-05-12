import React from 'react'
import {
  PERSONALITY_COGNITIVE_FUNCTIONS,
  PERSONALITY_DIMENSIONS,
  PERSONALITY_TYPE_GUIDE,
} from '../constants'

export type PersonalityGuideScreenProps = {
  selfPersonalityCode: string
  onBackToProfile: () => void
}

export const PersonalityGuideScreen: React.FC<PersonalityGuideScreenProps> = ({
  selfPersonalityCode,
  onBackToProfile,
}) => (
  <section className="settings-screen personality-guide-screen" aria-label="Personality guide">
    <article className="profile-settings personality-guide-intro">
      <p className="pill">Personality Guide</p>
      <h2>Understanding LoveDate Personality Codes</h2>
      <p>
        Your code has 4 letters. Example: <strong>DMFR</strong>. Each letter describes one core axis
        of your dating style. This helps people quickly understand compatibility and communication
        rhythm.
      </p>
      <p>
        Your current code: <strong>{selfPersonalityCode}</strong>
      </p>
      <button type="button" className="ghost" onClick={onBackToProfile}>
        {'←'} Back to Profile
      </button>
    </article>

    <article className="profile-settings personality-dimensions">
      <h2>Letter Meanings</h2>
      <div className="personality-dimension-grid">
        {PERSONALITY_DIMENSIONS.map((item) => (
          <div key={item.letter} className="personality-dimension-card">
            <p className="compatibility-score">{item.letter}</p>
            <h3>{item.title}</h3>
            <p>{item.meaning}</p>
            <p className="soft">Opposite: {item.opposite}</p>
          </div>
        ))}
      </div>
    </article>

    <article className="profile-settings personality-types">
      <h2>All 16 Personality Types</h2>
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
                  <strong>Primary:</strong> {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].primary}
                </li>
                <li>
                  <strong>Support:</strong> {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].support}
                </li>
                <li>
                  <strong>Tertiary:</strong> {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].tertiary}
                </li>
                <li>
                  <strong>Shadow:</strong> {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].shadow}
                </li>
              </ul>
            ) : null}
            {type.code === selfPersonalityCode ? (
              <p className="soft">This is your current type.</p>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  </section>
)
