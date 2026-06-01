import React from 'react'
import './ProfileDetailScreen.css'
import {
  UI_TEXT,
  getZodiacDeepDive,
  getZodiacDescription,
  ZODIAC_EMOJI,
} from '../constants'
import { getProfilePhotos, getProfilePrompts } from '../utils'
import {
  compatibilityFromBigFiveAttachment,
  type AttachmentStyle,
  type BigFiveScores,
  type LovePersonality,
} from '../services/compatibility'
import { distanceBetweenCities, formatDistance } from '../services/cityDistance'
import {
  backendInvokePairDynamicReveal,
  type PairDynamicReveal,
} from '../services/ai/pairDynamicReveal'
import { backendInvokeStabilityReveal } from '../services/ai/stabilityReveal'
import { stabilityFromProfiles, type StabilityReveal } from '../services/stability'
import type {
  AppLanguage,
  ChemistryInsights,
  MatchAnalysis,
  SelfProfile,
} from '../domain'
import type { Profile } from '../services/priveApi'

const ATTACHMENT_LABELS_EN: Record<AttachmentStyle, string> = {
  secure: 'Secure',
  anxious: 'Anxious',
  avoidant: 'Avoidant',
  disorganized: 'Disorganized',
}
const ATTACHMENT_LABELS_RO: Record<AttachmentStyle, string> = {
  secure: 'Sigur',
  anxious: 'Anxios',
  avoidant: 'Evitant',
  disorganized: 'Dezorganizat',
}

export type ProfileDetailScreenProps = {
  appLanguage: AppLanguage
  selectedDetailProfile: Profile | null
  selfProfile: SelfProfile
  selfLovePersonality: LovePersonality | null
  selectedDetailBigFive: BigFiveScores | null
  selectedDetailAttachment: AttachmentStyle | null
  selectedDetailMatchAnalysis: MatchAnalysis | null
  selectedDetailChemistry: ChemistryInsights | null
  getCompatibilityScore: (profile: Profile) => number
  reportProfile: (profile: Profile) => void
  blockProfile: (profile: Profile) => void
  openLightbox: (photo: string) => void
  closeProfileDetail: () => void
  onBackToDiscover: () => void
  // D5 admin moderation: when true, an extra "Deactivate / Reactivate"
  // button appears next to Report + Block. Hides the profile from
  // every user's Discover deck server-side. Only rendered when the
  // signed-in user is a moderation admin.
  isModerationAdmin: boolean
  onToggleProfileActive: (profile: Profile) => void
  // Tier B (2026-05-26) — true when the signed-in user has matched with
  // the profile they're viewing. Gates the AI Pair Dynamic reveal: that
  // section only renders for actual matches, never for cold candidates
  // in the Discover deck.
  isMatched: boolean
  // Stable identifier for the signed-in user, used to key the pair
  // dynamic reveal's localStorage cache. Email is fine — it's already
  // unique per account on this device.
  selfId: string
}

export const ProfileDetailScreen: React.FC<ProfileDetailScreenProps> = ({
  appLanguage,
  selectedDetailProfile,
  selfProfile,
  selfLovePersonality,
  selectedDetailBigFive,
  selectedDetailAttachment,
  selectedDetailMatchAnalysis,
  selectedDetailChemistry,
  getCompatibilityScore,
  reportProfile,
  blockProfile,
  openLightbox,
  closeProfileDetail,
  onBackToDiscover,
  isModerationAdmin,
  onToggleProfileActive,
  isMatched,
  selfId,
}) => {
  const copy = UI_TEXT[appLanguage]
  const ro = appLanguage === 'ro'

  // Tier B (2026-05-26) — Pair Dynamic reveal state. Stays local to
  // ProfileDetail because each match is its own conversation; the
  // localStorage cache in the wrapper handles cross-session persistence
  // (30-day TTL, busted automatically when either side retakes the
  // Love Personality quiz).
  const [pairReveal, setPairReveal] = React.useState<PairDynamicReveal | null>(null)
  const [pairLoading, setPairLoading] = React.useState(false)
  const [pairFailed, setPairFailed] = React.useState(false)

  // Reset reveal state when the user navigates from one match's profile
  // to another — otherwise we'd briefly show Match A's reveal while
  // viewing Match B before the cache lookup completes.
  React.useEffect(() => {
    setPairReveal(null)
    setPairLoading(false)
    setPairFailed(false)
  }, [selectedDetailProfile?.id])

  const pairDataReady = Boolean(
    isMatched
    && selectedDetailProfile
    && selectedDetailBigFive
    && selectedDetailAttachment
    && selfLovePersonality?.bigFive
    && selfLovePersonality?.attachment,
  )
  // Teaser path: section still renders for any match (even when one or
  // both sides haven't completed Tier A yet) so the surface is visible
  // and users understand the unlock condition. We just swap content.
  const pairSectionVisible = Boolean(isMatched && selectedDetailProfile)

  const requestPairReveal = React.useCallback(async () => {
    if (
      !selectedDetailProfile
      || !selectedDetailBigFive
      || !selectedDetailAttachment
      || !selfLovePersonality?.bigFive
      || !selfLovePersonality?.attachment
    ) {
      return
    }
    setPairLoading(true)
    setPairFailed(false)
    const reveal = await backendInvokePairDynamicReveal({
      selfId,
      selfBigFive: selfLovePersonality.bigFive,
      selfAttachment: selfLovePersonality.attachment,
      selfName: selfProfile.name?.trim() || undefined,
      otherId: String(selectedDetailProfile.id),
      otherBigFive: selectedDetailBigFive,
      otherAttachment: selectedDetailAttachment,
      otherName: selectedDetailProfile.name?.trim() || undefined,
      language: appLanguage,
    })
    setPairLoading(false)
    if (!reveal) {
      setPairFailed(true)
      return
    }
    setPairReveal(reveal)
  }, [
    selectedDetailProfile,
    selectedDetailBigFive,
    selectedDetailAttachment,
    selfLovePersonality,
    selfProfile.name,
    selfId,
    appLanguage,
  ])

  // Stability reveal state (2026-05-30) — per-match durability reading from
  // the optional Stability Assessment. Mirrors the pair-dynamic flow; resets
  // when navigating between matches.
  const [stabReveal, setStabReveal] = React.useState<StabilityReveal | null>(null)
  const [stabLoading, setStabLoading] = React.useState(false)
  const [stabFailed, setStabFailed] = React.useState(false)
  React.useEffect(() => {
    setStabReveal(null)
    setStabLoading(false)
    setStabFailed(false)
  }, [selectedDetailProfile?.id])

  const selfStability = selfProfile.stabilityProfile ?? null
  const otherStability = selectedDetailProfile?.stabilityProfile ?? null
  const stabDataReady = Boolean(isMatched && selfStability && otherStability)
  const stabVerdict =
    selfStability && otherStability
      ? stabilityFromProfiles(selfStability, otherStability)
      : null

  const requestStabReveal = React.useCallback(async () => {
    if (!selectedDetailProfile || !selfStability || !otherStability) return
    setStabLoading(true)
    setStabFailed(false)
    const reveal = await backendInvokeStabilityReveal({
      selfId,
      selfStability,
      selfName: selfProfile.name?.trim() || undefined,
      otherId: String(selectedDetailProfile.id),
      otherStability,
      otherName: selectedDetailProfile.name?.trim() || undefined,
      band: stabilityFromProfiles(selfStability, otherStability).band,
      language: appLanguage,
    })
    setStabLoading(false)
    if (!reveal) {
      setStabFailed(true)
      return
    }
    setStabReveal(reveal)
  }, [selectedDetailProfile, selfStability, otherStability, selfProfile.name, selfId, appLanguage])

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

  const zodiacDescription = getZodiacDescription(selectedDetailProfile.zodiac, appLanguage)
  const zodiacDeepDive = getZodiacDeepDive(selectedDetailProfile.zodiac, appLanguage)
  const attachmentLabel = selectedDetailAttachment
    ? appLanguage === 'ro'
      ? ATTACHMENT_LABELS_RO[selectedDetailAttachment]
      : ATTACHMENT_LABELS_EN[selectedDetailAttachment]
    : null

  return (
    <section className="profile-detail">
      <article className="profile-summary">
        <button type="button" className="ghost" onClick={closeProfileDetail}>
          {'←'} {ro ? 'Înapoi' : 'Back'}
        </button>
        <h2>
          {selectedDetailProfile.name}, {selectedDetailProfile.age}
          {selectedDetailProfile.verified && (
            <span
              className="profile-detail-verified-badge"
              title={ro ? 'Persoană reală — selfie verificat manual' : 'Real person — selfie verified by hand'}
              aria-label={ro ? 'Profil verificat' : 'Verified profile'}
            >
              <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
                <path
                  d="M3.5 8.2l3 3 6-6.4"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              {ro ? 'Verificat' : 'Verified'}
            </span>
          )}
        </h2>
        <p>
          {copy.profile.compatibilityScore}:{' '}
          {selectedDetailMatchAnalysis?.score ?? getCompatibilityScore(selectedDetailProfile)}%
        </p>
        <p>
          {copy.profile.personalityFit}:{' '}
          {selectedDetailMatchAnalysis?.personalityScore ??
            compatibilityFromBigFiveAttachment(
              selfLovePersonality?.bigFive ?? null,
              selfLovePersonality?.attachment ?? null,
              selectedDetailBigFive,
              selectedDetailAttachment,
            )}
          %
          {attachmentLabel ? ` • ${copy.profile.attachmentStyleLabel ?? 'Attachment'}: ${attachmentLabel}` : ''}
        </p>
        <p>{selectedDetailProfile.vibe}</p>
        <p>{selectedDetailProfile.bio}</p>
        {selectedDetailProfile.voiceNoteUrl ? (
          <div className="detail-voice-note">
            <span className="soft">{appLanguage === 'ro' ? '🎙 Mesaj vocal' : '🎙 Voice intro'}</span>
            <audio
              controls
              controlsList="nodownload noplaybackrate noremoteplayback"
              src={selectedDetailProfile.voiceNoteUrl}
              preload="none"
            />
          </div>
        ) : null}
        <p>
          {selectedDetailProfile.gender} {'•'} {selectedDetailProfile.city} {'•'}{' '}
          {(() => {
            const real = distanceBetweenCities(selfProfile.city, selectedDetailProfile.city)
            return real !== null
              ? formatDistance(real, { sameCityLabel: ro ? 'Același oraș' : 'Same city' })
              : `${selectedDetailProfile.distanceKm} km`
          })()}
        </p>
        {attachmentLabel ? (
          <p className="profile-detail-chips-row">
            <span className="profile-detail-attachment-chip" title={copy.profile.attachmentStyleLabel}>
              {attachmentLabel}
            </span>
          </p>
        ) : null}
        <p>
          {copy.profile.zodiac}: {selectedDetailProfile.zodiac}{' '}
          {ZODIAC_EMOJI[selectedDetailProfile.zodiac] ?? ''}
        </p>
        <p className="soft">
          {zodiacDescription?.overview ?? copy.profile.uniqueCosmicSignature}
        </p>
        {zodiacDescription ? (
          <section className="match-insights zodiac-reading">
            <h3>{copy.profile.zodiacProfileTitle}</h3>
            <p>
              <strong>
                {selectedDetailProfile.zodiac} {copy.profile.zodiacOverview}:
              </strong>{' '}
              {zodiacDescription.overview}
            </p>
            <ul>
              <li>
                <strong>{copy.profile.zodiacLoveStyle}:</strong> {zodiacDescription.loveStyle}
              </li>
              <li>
                <strong>{copy.profile.zodiacCommunication}:</strong>{' '}
                {zodiacDescription.communication}
              </li>
              <li>
                <strong>{copy.profile.zodiacGreenFlags}:</strong> {zodiacDescription.greenFlags}
              </li>
              <li>
                <strong>{copy.profile.zodiacGrowthEdge}:</strong> {zodiacDescription.growthEdge}
              </li>
              <li>
                <strong>{copy.profile.zodiacEmotionalNeeds}:</strong>{' '}
                {zodiacDeepDive?.emotionalNeeds ?? copy.profile.defaultEmotionalNeeds}
              </li>
              <li>
                <strong>{copy.profile.zodiacIntimacyStyle}:</strong>{' '}
                {zodiacDeepDive?.intimacyStyle ?? copy.profile.defaultIntimacyStyle}
              </li>
              <li>
                <strong>{copy.profile.zodiacConflictStyle}:</strong>{' '}
                {zodiacDeepDive?.conflictStyle ?? copy.profile.defaultConflictStyle}
              </li>
              <li>
                <strong>{copy.profile.zodiacIdealDateEnergy}:</strong>{' '}
                {zodiacDeepDive?.idealDateEnergy ?? copy.profile.defaultIdealDateEnergy}
              </li>
              <li>
                <strong>{copy.profile.zodiacBestMatches}:</strong> {zodiacDescription.bestMatches}
              </li>
            </ul>
            <p className="soft">{copy.profile.zodiacReadingFooter}</p>
          </section>
        ) : null}
        {selectedDetailChemistry ? (
          <section className="match-insights">
            <h3>{copy.profile.compatibilityChemistryTitle}</h3>
            <ul>
              <li>
                <strong>{copy.profile.totalChemistry}:</strong>{' '}
                {selectedDetailChemistry.chemistryScore}%
              </li>
              <li>
                <strong>{copy.profile.cognitiveOverlap}:</strong>{' '}
                {selectedDetailChemistry.cognitiveOverlapScore}%
              </li>
              <li>
                <strong>{copy.profile.zodiac}:</strong>{' '}
                {selectedDetailChemistry.zodiacAligned
                  ? copy.discover.aligned
                  : copy.discover.neutral}
              </li>
            </ul>
            <p className="soft">{selectedDetailChemistry.summary}</p>
          </section>
        ) : null}
        {selectedDetailBigFive ? (
          <section className="match-insights profile-detail-bigfive-card">
            <h3>{copy.profile.lovePersonalityTitle ?? 'Love Personality'}</h3>
            <ul className="profile-detail-bigfive-bars">
              {(
                [
                  ['openness', copy.profile.openness ?? 'Openness', selectedDetailBigFive.openness],
                  ['conscientiousness', copy.profile.conscientiousness ?? 'Conscientiousness', selectedDetailBigFive.conscientiousness],
                  ['extraversion', copy.profile.extraversion ?? 'Extraversion', selectedDetailBigFive.extraversion],
                  ['agreeableness', copy.profile.agreeableness ?? 'Agreeableness', selectedDetailBigFive.agreeableness],
                  ['emotionalStability', copy.profile.emotionalStability ?? 'Emotional Stability', 100 - selectedDetailBigFive.neuroticism],
                ] as const
              ).map(([key, label, value]) => (
                <li key={key} className="profile-detail-bigfive-row">
                  <span className="profile-detail-bigfive-label">{label}</span>
                  <span className="profile-detail-bigfive-bar" aria-hidden="true">
                    <span
                      className="profile-detail-bigfive-fill"
                      style={{ width: `${Math.round(value)}%` }}
                    />
                  </span>
                  <span className="profile-detail-bigfive-value">{Math.round(value)}%</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {pairSectionVisible ? (
          <section className="match-insights profile-detail-pair-dynamic">
            <p className="profile-detail-pair-dynamic-eyebrow">
              {copy.profile.pairDynamicEyebrow}
            </p>
            <h3>{copy.profile.pairDynamicTitle}</h3>
            {!pairDataReady ? (
              <p className="profile-detail-pair-dynamic-status">
                {copy.profile.pairDynamicMissingData}
              </p>
            ) : pairReveal ? (
              <>
                <p className="profile-detail-pair-dynamic-archetype">
                  {pairReveal.pairArchetype}
                </p>
                <p className="profile-detail-pair-dynamic-headline">
                  {pairReveal.headline}
                </p>
                <div className="profile-detail-pair-dynamic-paragraphs">
                  {pairReveal.description.split(/\n\n+/).map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
                {pairReveal.strengths.length > 0 && (
                  <div className="profile-detail-pair-dynamic-chips-block">
                    <span className="profile-detail-pair-dynamic-chips-label">
                      {copy.profile.pairDynamicStrengthsLabel}
                    </span>
                    <div className="profile-detail-pair-dynamic-chips-row">
                      {pairReveal.strengths.map((s, idx) => (
                        <span key={idx} className="profile-detail-pair-dynamic-chip">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {pairReveal.frictions.length > 0 && (
                  <div className="profile-detail-pair-dynamic-chips-block">
                    <span className="profile-detail-pair-dynamic-chips-label">
                      {copy.profile.pairDynamicFrictionsLabel}
                    </span>
                    <div className="profile-detail-pair-dynamic-chips-row">
                      {pairReveal.frictions.map((s, idx) => (
                        <span
                          key={idx}
                          className="profile-detail-pair-dynamic-chip is-friction"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {pairReveal.sharedGrowthEdge && (
                  <div className="profile-detail-pair-dynamic-chips-block">
                    <span className="profile-detail-pair-dynamic-chips-label">
                      {copy.profile.pairDynamicGrowthEdgeLabel}
                    </span>
                    <div className="profile-detail-pair-dynamic-chips-row">
                      <span className="profile-detail-pair-dynamic-chip is-growth">
                        {pairReveal.sharedGrowthEdge}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : pairLoading ? (
              <p className="profile-detail-pair-dynamic-status">
                {copy.profile.pairDynamicLoading}
              </p>
            ) : pairFailed ? (
              <>
                <p className="profile-detail-pair-dynamic-status">
                  {copy.profile.pairDynamicError}
                </p>
                <button
                  type="button"
                  className="profile-detail-pair-dynamic-cta"
                  onClick={() => void requestPairReveal()}
                >
                  {copy.profile.pairDynamicRetry}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="profile-detail-pair-dynamic-cta"
                onClick={() => void requestPairReveal()}
              >
                {copy.profile.pairDynamicCta} →
              </button>
            )}
          </section>
        ) : null}
        {pairSectionVisible ? (
          <section className="match-insights profile-detail-pair-dynamic">
            <p className="profile-detail-pair-dynamic-eyebrow">
              {copy.profile.stabilityRevealEyebrow}
            </p>
            <h3>{copy.profile.stabilityRevealTitle}</h3>
            {!stabDataReady || !stabVerdict ? (
              <p className="profile-detail-pair-dynamic-status">
                {copy.profile.stabilityRevealMissingData}
              </p>
            ) : (
              <>
                {/* Always-on band + reason — stands on its own even before
                    (or without) the AI reveal. */}
                <p className="profile-detail-pair-dynamic-headline">
                  {copy.discover.stabilityLensLabel}:{' '}
                  <strong>{copy.discover.stabilityBands[stabVerdict.band]}</strong>
                  {stabVerdict.drivers.length > 0 && (
                    <>
                      {' — '}
                      {stabVerdict.drivers
                        .slice(0, 2)
                        .map((d) =>
                          d.polarity === 'positive'
                            ? copy.discover.stabilityDriverPositive[d.key]
                            : copy.discover.stabilityDriverRisk[d.key],
                        )
                        .join(', ')}
                    </>
                  )}
                </p>
                {stabReveal ? (
                  <>
                    <p className="profile-detail-pair-dynamic-archetype">
                      {stabReveal.archetype}
                    </p>
                    <p className="profile-detail-pair-dynamic-headline">
                      {stabReveal.headline}
                    </p>
                    <div className="profile-detail-pair-dynamic-paragraphs">
                      {stabReveal.description.split(/\n\n+/).map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                    {stabReveal.strengths.length > 0 && (
                      <div className="profile-detail-pair-dynamic-chips-block">
                        <span className="profile-detail-pair-dynamic-chips-label">
                          {copy.profile.stabilityStrengthsLabel}
                        </span>
                        <div className="profile-detail-pair-dynamic-chips-row">
                          {stabReveal.strengths.map((s, idx) => (
                            <span key={idx} className="profile-detail-pair-dynamic-chip">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {stabReveal.watchPoints.length > 0 && (
                      <div className="profile-detail-pair-dynamic-chips-block">
                        <span className="profile-detail-pair-dynamic-chips-label">
                          {copy.profile.stabilityWatchPointsLabel}
                        </span>
                        <div className="profile-detail-pair-dynamic-chips-row">
                          {stabReveal.watchPoints.map((s, idx) => (
                            <span key={idx} className="profile-detail-pair-dynamic-chip is-friction">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {stabReveal.sharedWork && (
                      <div className="profile-detail-pair-dynamic-chips-block">
                        <span className="profile-detail-pair-dynamic-chips-label">
                          {copy.profile.stabilitySharedWorkLabel}
                        </span>
                        <div className="profile-detail-pair-dynamic-chips-row">
                          <span className="profile-detail-pair-dynamic-chip is-growth">
                            {stabReveal.sharedWork}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : stabLoading ? (
                  <p className="profile-detail-pair-dynamic-status">
                    {copy.profile.stabilityRevealLoading}
                  </p>
                ) : stabFailed ? (
                  <>
                    <p className="profile-detail-pair-dynamic-status">
                      {copy.profile.stabilityRevealError}
                    </p>
                    <button
                      type="button"
                      className="profile-detail-pair-dynamic-cta"
                      onClick={() => void requestStabReveal()}
                    >
                      {copy.profile.stabilityRevealRetry}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="profile-detail-pair-dynamic-cta"
                    onClick={() => void requestStabReveal()}
                  >
                    {copy.profile.stabilityRevealCta} →
                  </button>
                )}
              </>
            )}
          </section>
        ) : null}
        {selectedDetailMatchAnalysis ? (
          <section className="match-insights">
            <h3>{copy.profile.whyYouMatchTitle}</h3>
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
          {isModerationAdmin ? (
            <button
              type="button"
              className="ghost"
              onClick={() => onToggleProfileActive(selectedDetailProfile)}
              title={ro ? 'Acțiune de moderare' : 'Moderation action'}
            >
              {ro ? '🛠 Dezactivează (admin)' : '🛠 Deactivate (admin)'}
            </button>
          ) : null}
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
