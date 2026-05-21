import React from 'react'
import {
  PERSONALITY_COGNITIVE_FUNCTIONS,
  PERSONALITY_TYPE_GUIDE,
  UI_TEXT,
  ZODIAC_DEEP_DIVE,
  ZODIAC_DESCRIPTIONS,
  ZODIAC_EMOJI,
} from '../constants'
import { getProfilePhotos, getProfilePrompts } from '../utils'
import {
  compatibilityFromAnswers,
  personalityCodeFromAnswers,
} from '../services/compatibility'
import { distanceBetweenCities, formatDistance } from '../services/cityDistance'
import type {
  AppLanguage,
  ChemistryInsights,
  MatchAnalysis,
  SelfProfile,
} from '../domain'
import type { Profile } from '../services/loveDateApi'

export type ProfileDetailScreenProps = {
  appLanguage: AppLanguage
  selectedDetailProfile: Profile | null
  selfProfile: SelfProfile
  selfPersonalityCode: string
  selectedDetailMatchAnalysis: MatchAnalysis | null
  selectedDetailChemistry: ChemistryInsights | null
  getCompatibilityScore: (profile: Profile) => number
  reportProfile: (profile: Profile) => void
  blockProfile: (profile: Profile) => void
  openLightbox: (photo: string) => void
  closeProfileDetail: () => void
  onBackToDiscover: () => void
}

export const ProfileDetailScreen: React.FC<ProfileDetailScreenProps> = ({
  appLanguage,
  selectedDetailProfile,
  selfProfile,
  selfPersonalityCode,
  selectedDetailMatchAnalysis,
  selectedDetailChemistry,
  getCompatibilityScore,
  reportProfile,
  blockProfile,
  openLightbox,
  closeProfileDetail,
  onBackToDiscover,
}) => {
  const copy = UI_TEXT[appLanguage]
  const ro = appLanguage === 'ro'

  if (!selectedDetailProfile) {
    return (
      <section className="profile-detail">
        <article className="state-box">
          <p className="pill">{ro ? 'Indisponibil' : 'Unavailable'}</p>
          <h1>{ro ? 'Profilul nu a fost găsit' : 'Profile was not found'}</h1>
          <button type="button" onClick={onBackToDiscover}>
            {copy.common.backToDiscover}
          </button>
        </article>
      </section>
    )
  }

  const selectedDetailPersonalityCode = personalityCodeFromAnswers(
    selectedDetailProfile.personalityAnswers,
  )
  const selectedDetailTypeGuide = PERSONALITY_TYPE_GUIDE.find(
    (item) => item.code === selectedDetailPersonalityCode,
  )
  const selectedDetailCognitiveFunctions =
    PERSONALITY_COGNITIVE_FUNCTIONS[selectedDetailPersonalityCode]

  return (
    <section className="profile-detail">
      <article className="profile-summary">
        <button type="button" className="ghost" onClick={closeProfileDetail}>
          {'←'} {ro ? 'Înapoi' : 'Back'}
        </button>
        <h2>
          {selectedDetailProfile.name}, {selectedDetailProfile.age}
        </h2>
        <p>
          {ro ? 'Scor compatibilitate' : 'Compatibility score'}:{' '}
          {selectedDetailMatchAnalysis?.score ?? getCompatibilityScore(selectedDetailProfile)}%
        </p>
        <p>
          {ro ? 'Potrivire de personalitate' : 'Personality fit'}:{' '}
          {selectedDetailMatchAnalysis?.personalityScore ??
            compatibilityFromAnswers(
              selfProfile.personalityAnswers,
              selectedDetailProfile.personalityAnswers,
            )}
          %{' • '}
          {ro ? 'Pereche' : 'Pair'}:{' '}
          {selectedDetailMatchAnalysis?.pairCode ??
            `${selfPersonalityCode} x ${selectedDetailPersonalityCode}`}
        </p>
        <p>{selectedDetailProfile.vibe}</p>
        <p>{selectedDetailProfile.bio}</p>
        <p>
          {selectedDetailProfile.gender} {'•'} {selectedDetailProfile.city} {'•'}{' '}
          {(() => {
            const real = distanceBetweenCities(selfProfile.city, selectedDetailProfile.city)
            return real !== null
              ? formatDistance(real, { sameCityLabel: ro ? 'Același oraș' : 'Same city' })
              : `${selectedDetailProfile.distanceKm} km`
          })()}
        </p>
        <p>
          {copy.profile.zodiac}: {selectedDetailProfile.zodiac}{' '}
          {ZODIAC_EMOJI[selectedDetailProfile.zodiac] ?? ''}
        </p>
        <p className="soft">
          {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac]?.overview ??
            copy.profile.uniqueCosmicSignature}
        </p>
        {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac] ? (
          <section className="match-insights zodiac-reading">
            <h3>{ro ? 'Profil zodiacal' : 'Zodiac Profile'}</h3>
            <p>
              <strong>
                {selectedDetailProfile.zodiac} {ro ? 'pe scurt' : 'overview'}:
              </strong>{' '}
              {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].overview}
            </p>
            <ul>
              <li>
                <strong>Love style:</strong>{' '}
                {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].loveStyle}
              </li>
              <li>
                <strong>Communication:</strong>{' '}
                {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].communication}
              </li>
              <li>
                <strong>Green flags:</strong>{' '}
                {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].greenFlags}
              </li>
              <li>
                <strong>Growth edge:</strong>{' '}
                {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].growthEdge}
              </li>
              <li>
                <strong>Emotional needs:</strong>{' '}
                {ZODIAC_DEEP_DIVE[selectedDetailProfile.zodiac]?.emotionalNeeds ??
                  'Connection, honesty, and safety.'}
              </li>
              <li>
                <strong>Intimacy style:</strong>{' '}
                {ZODIAC_DEEP_DIVE[selectedDetailProfile.zodiac]?.intimacyStyle ??
                  'Expressive and relational.'}
              </li>
              <li>
                <strong>Conflict style:</strong>{' '}
                {ZODIAC_DEEP_DIVE[selectedDetailProfile.zodiac]?.conflictStyle ??
                  'Seeks resolution with care.'}
              </li>
              <li>
                <strong>Ideal date energy:</strong>{' '}
                {ZODIAC_DEEP_DIVE[selectedDetailProfile.zodiac]?.idealDateEnergy ??
                  'Balanced and authentic.'}
              </li>
              <li>
                <strong>Best matches:</strong>{' '}
                {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].bestMatches}
              </li>
            </ul>
            <p className="soft">
              {ro
                ? 'Lectură completă: acest semn tinde să se simtă cel mai împlinit atunci când ritmul relației, limbajul emoțional și comportamentul de zi cu zi se aliniază cu aceste trăsături, nu doar atracția.'
                : 'Complete reading: This sign tends to feel most fulfilled when relationship pacing, emotional language, and daily behavior align with these traits, not just attraction.'}
            </p>
          </section>
        ) : null}
        {selectedDetailChemistry ? (
          <section className="match-insights">
            <h3>{ro ? 'Chimia compatibilității' : 'Compatibility Chemistry'}</h3>
            <ul>
              <li>
                <strong>Total chemistry:</strong> {selectedDetailChemistry.chemistryScore}%
              </li>
              <li>
                <strong>Cognitive overlap:</strong>{' '}
                {selectedDetailChemistry.cognitiveOverlapScore}%
              </li>
              <li>
                <strong>Zodiac:</strong>{' '}
                {selectedDetailChemistry.zodiacAligned ? 'Aligned' : 'Neutral'}
              </li>
            </ul>
            <p className="soft">{selectedDetailChemistry.summary}</p>
          </section>
        ) : null}
        {selectedDetailTypeGuide ? (
          <p>
            <strong>{copy.chats.type}:</strong> {selectedDetailPersonalityCode} -{' '}
            {selectedDetailTypeGuide.label}
          </p>
        ) : null}
        {selectedDetailCognitiveFunctions ? (
          <section className="match-insights">
            <h3>{ro ? 'Funcții cognitive' : 'Cognitive Functions'}</h3>
            <ul>
              <li>
                <strong>Primary:</strong> {selectedDetailCognitiveFunctions.primary}
              </li>
              <li>
                <strong>Support:</strong> {selectedDetailCognitiveFunctions.support}
              </li>
              <li>
                <strong>Tertiary:</strong> {selectedDetailCognitiveFunctions.tertiary}
              </li>
              <li>
                <strong>Shadow:</strong> {selectedDetailCognitiveFunctions.shadow}
              </li>
            </ul>
          </section>
        ) : null}
        {selectedDetailMatchAnalysis ? (
          <section className="match-insights">
            <h3>{ro ? 'De ce vă potriviți' : 'Why you match'}</h3>
            <ul>
              {selectedDetailMatchAnalysis.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            {selectedDetailMatchAnalysis.caution ? (
              <p className="soft">{selectedDetailMatchAnalysis.caution}</p>
            ) : null}
          </section>
        ) : null}
        <div className="summary-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => reportProfile(selectedDetailProfile)}
          >
            {ro ? 'Raportează profilul' : 'Report profile'}
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => blockProfile(selectedDetailProfile)}
          >
            {ro ? 'Blochează profilul' : 'Block profile'}
          </button>
        </div>
        <ul>
          {getProfilePrompts(selectedDetailProfile).map((prompt, indexPrompt) => (
            <li key={`prompt-${indexPrompt}`}>{prompt}</li>
          ))}
        </ul>
      </article>
      <article className="detail-photos">
        {getProfilePhotos(selectedDetailProfile).map((photo, idx) => (
          <div key={`${photo}-${idx}`} className="photo-card">
            <button type="button" className="photo-button" onClick={() => openLightbox(photo)}>
              <img
                src={photo}
                alt={`${selectedDetailProfile.name} photo ${idx + 1}`}
                loading="lazy"
                decoding="async"
              />
            </button>
          </div>
        ))}
      </article>
    </section>
  )
}
