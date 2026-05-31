import React from 'react'
import './ProfileScreen.css'
import { VoiceNoteRecorder } from '../components/VoiceNoteRecorder'
import {
  CHILDREN_PLAN_OPTIONS,
  DRINKING_OPTIONS,
  GENDER_OPTIONS,
  LOOKING_FOR_OPTIONS,
  ORIENTATION_OPTIONS,
  PETS_OPTIONS,
  POLITICS_OPTIONS,
  PRONOUNS_OPTIONS,
  RELATIONSHIP_INTENT_OPTIONS,
  RELIGION_OPTIONS,
  SMOKING_OPTIONS,
  SOCIAL_PLATFORM_META,
  UI_TEXT,
  WORKOUT_OPTIONS,
  getZodiacDescription,
  ZODIAC_OPTIONS,
  translateInterest,
  translateLifestyleOption,
  translateRelationshipIntent,
} from '../constants'
import type { LikertAnswer, LovePersonality } from '../services/compatibility'
import { toProfileDraft } from '../persistence'
import {
  backendInvokeProfileWriter,
  type AiProfileWriterResult,
} from '../services/ai/profileWriter'
import { detectMyLocation, isLocationError } from '../services/geolocation'
import { backendGetMyVerificationStatus, type VerificationStatus } from '../services/backendApi'
import { SelfieVerification } from '../components/SelfieVerification'
import { ROMANIAN_CITIES } from '../data/romanianCities'
import type { AppLanguage, SelfProfile } from '../domain'

export type ProfileScreenProps = {
  appLanguage: AppLanguage
  selfProfile: SelfProfile
  profileDraft: ReturnType<typeof toProfileDraft>
  setProfileDraft: (draft: ReturnType<typeof toProfileDraft>) => void
  handleProfileDraftChange: (
    field: keyof ReturnType<typeof toProfileDraft>,
    value: string,
  ) => void
  handleProfileDraftToggle: (field: 'travelMode', value: boolean) => void
  saveMyProfile: (event: React.FormEvent<HTMLFormElement>) => void
  profileSaveErrors: string[]
  selfLovePersonality: LovePersonality | null
  socialConnectedCount: number
  onSaveVoiceNote: (url: string | null) => void
  // Photo management now lives in a dedicated full-screen PhotoStudioScreen
  // (2026-05-28). ProfileScreen just opens it + shows a read-only strip.
  onOpenPhotoStudio: () => void
  onOpenPersonalityGuide: () => void
  onOpenLovePersonality: () => void
  onOpenLovePersonalityQuiz: () => void
  onOpenStabilityQuiz: () => void
  onOpenSettings: () => void
}

const ProfileScreenInner: React.FC<ProfileScreenProps> = ({
  appLanguage,
  selfProfile,
  profileDraft,
  setProfileDraft,
  handleProfileDraftChange,
  handleProfileDraftToggle,
  saveMyProfile,
  profileSaveErrors,
  selfLovePersonality,
  socialConnectedCount,
  onSaveVoiceNote,
  onOpenPhotoStudio,
  onOpenPersonalityGuide,
  onOpenLovePersonality,
  onOpenLovePersonalityQuiz,
  onOpenStabilityQuiz,
  onOpenSettings,
}) => {
  const copy = UI_TEXT[appLanguage]

  // AI Profile Writer — scoped to the bio field.
  const [bioWriterResult, setBioWriterResult] =
    React.useState<AiProfileWriterResult | null>(null)
  const [bioWriterLoading, setBioWriterLoading] = React.useState(false)
  const [bioWriterError, setBioWriterError] = React.useState<string | null>(null)

  // Location autodetect — wraps the device Geolocation API + Nominatim
  // reverse-geocode. Tap "Detect" next to the city field → user grants
  // permission → city fills automatically. Raw lat/lng never persists.
  const [locDetectLoading, setLocDetectLoading] = React.useState(false)
  const [locDetectError, setLocDetectError] = React.useState<string | null>(null)
  const [locDetectSuccess, setLocDetectSuccess] = React.useState<string | null>(null)

  // Selfie-pose verification (anti-fake, 2026-05-27). The badge can come
  // from two places: the cached selfProfile.verificationBadge, OR the
  // live verification status we fetch on mount. The latter matters
  // because the admin approves in a DIFFERENT screen (Moderation
  // Center), so the in-memory selfProfile stays stale until a full
  // re-sync — without checking verifyStatus, an approved user would see
  // no badge + a stale "Verify you're real" button until they restart.
  const [showVerify, setShowVerify] = React.useState(false)
  const [verifyStatus, setVerifyStatus] = React.useState<VerificationStatus>('none')
  const isVerified =
    (selfProfile.verificationBadge != null && selfProfile.verificationBadge !== 'none') ||
    verifyStatus === 'approved'
  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      const status = await backendGetMyVerificationStatus()
      if (!cancelled) setVerifyStatus(status)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const runLocationDetect = React.useCallback(async () => {
    setLocDetectError(null)
    setLocDetectSuccess(null)
    setLocDetectLoading(true)
    const result = await detectMyLocation()
    setLocDetectLoading(false)
    // Localize the error message at the call site so the geolocation
    // utility stays i18n-agnostic. The DetectError.kind discriminant
    // covers every failure mode the browser API can produce.
    const ro = appLanguage === 'ro'
    if (isLocationError(result)) {
      const errorMessages: Record<string, string> = ro
        ? {
            unsupported: 'Browserul tău nu permite detectarea locației.',
            'permission-denied':
              'Permisiune de locație refuzată. Apasă pe iconița de lăcat din bara de adrese pentru a permite locația, sau scrie orașul manual.',
            unavailable: 'Nu am putut determina locația. Încearcă din nou sau scrie orașul manual.',
            timeout: 'Detectarea locației a expirat. Încearcă din nou sau scrie orașul manual.',
            'reverse-failed':
              'Nu am putut afla numele orașului din locația ta. Încearcă să-l scrii manual.',
          }
        : {
            unsupported: 'Your browser does not support location detection.',
            'permission-denied':
              'Location permission denied. Tap the lock icon in the address bar to allow location, or type your city manually.',
            unavailable: 'Could not determine your location. Try again or type your city manually.',
            timeout: 'Location lookup timed out. Try again or type your city manually.',
            'reverse-failed':
              'Could not resolve a city name from your location. Try typing it manually.',
          }
      setLocDetectError(errorMessages[result.kind] ?? result.message)
      return
    }
    handleProfileDraftChange('city', result.city)
    setLocDetectSuccess(
      result.region
        ? ro
          ? `Setat: ${result.city} (${result.region})`
          : `Set to ${result.city} (${result.region})`
        : ro
          ? `Setat: ${result.city}`
          : `Set to ${result.city}`,
    )
    // Clear the success line after 4s so it doesn't linger forever.
    window.setTimeout(() => setLocDetectSuccess(null), 4000)
  }, [appLanguage, handleProfileDraftChange])

  const runBioWriter = React.useCallback(async () => {
    setBioWriterError(null)
    setBioWriterLoading(true)
    try {
      const result = await backendInvokeProfileWriter({
        currentBio: profileDraft.bio,
        interests: profileDraft.interests
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        vibe: profileDraft.vibe,
        age: Number.parseInt(profileDraft.age, 10) || undefined,
        city: profileDraft.city,
        relationshipGoal: profileDraft.relationshipIntent,
        language: appLanguage,
      })
      if (!result) {
        setBioWriterError(copy.profile.bioWriterError)
        setBioWriterResult(null)
      } else {
        setBioWriterResult(result)
      }
    } catch {
      setBioWriterError(copy.profile.bioWriterError)
      setBioWriterResult(null)
    } finally {
      setBioWriterLoading(false)
    }
  }, [
    profileDraft.bio,
    profileDraft.interests,
    profileDraft.vibe,
    profileDraft.age,
    profileDraft.city,
    profileDraft.relationshipIntent,
    appLanguage,
    copy.profile.bioWriterError,
  ])

  return (
    <section className="profile-screen" aria-label={copy.profile.screen}>
      {/* Shared city typeahead source. Both City and Hometown inputs
          reference list="prive-city-list" so users get the same
          curated suggestions on either field. */}
      <datalist id="prive-city-list">
        {ROMANIAN_CITIES.map((city) => (
          <option
            key={`${city.name}-${city.country}`}
            value={city.name}
          >
            {city.region ? `${city.region}${city.country !== 'ro' ? ` · ${city.country.toUpperCase()}` : ''}` : city.country.toUpperCase()}
          </option>
        ))}
      </datalist>
      <aside className="profile-left-column" aria-label={copy.profile.overview}>
        <article className="profile-summary profile-summary-card">
          {selfProfile.photos.length > 0 && (
            <div className="profile-summary-hero">
              <img
                src={selfProfile.photos[0]}
                alt={`${selfProfile.name} primary profile`}
                decoding="async"
                fetchPriority="high"
              />
              <div className="profile-summary-overlay">
                <h3>
                  {selfProfile.name}, {selfProfile.age}
                  {isVerified && (
                      <span
                        className="profile-verified-badge"
                        title={
                          appLanguage === 'ro'
                            ? 'Persoană reală — selfie verificat manual'
                            : 'Real person — selfie verified by hand'
                        }
                        aria-label={
                          appLanguage === 'ro'
                            ? 'Profil verificat'
                            : 'Verified profile'
                        }
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
                        {appLanguage === 'ro' ? 'Verificat' : 'Verified'}
                      </span>
                    )}
                </h3>
                <p>
                  {selfProfile.city} {'•'} {selfProfile.vibe}
                </p>
              </div>
            </div>
          )}

          {/* Selfie-pose verification CTA (anti-fake). Hidden once the
              user is verified; shows a pending pill while under review;
              otherwise a prominent "Verify you're real" button. */}
          {isVerified ? null : verifyStatus === 'pending' ? (
            <p className="profile-verify-pending">{copy.verification.ctaPending}</p>
          ) : (
            <button
              type="button"
              className="profile-verify-cta"
              onClick={() => setShowVerify(true)}
            >
              {copy.verification.ctaVerify}
            </button>
          )}
        </article>

        <article className="profile-summary profile-about-card">
          <h3>{copy.profile.aboutMe}</h3>
          <p>{selfProfile.bio}</p>
          <p className="profile-about-meta">
            {selfProfile.jobTitle} {copy.profile.jobAtCompany} {selfProfile.company} {'•'}{' '}
            {translateRelationshipIntent(selfProfile.lookingFor, appLanguage)}
          </p>
          {selfLovePersonality?.reveal ? (
            <button
              type="button"
              className="love-personality-preview-card"
              onClick={onOpenLovePersonality}
              aria-label={copy.profile.lovePersonalityOpenAria ?? 'Open Love Personality'}
            >
              <span className="love-personality-preview-eyebrow">
                {copy.profile.lovePersonalityTitle ?? 'Love Personality'}
              </span>
              <span className="love-personality-preview-archetype">
                {selfLovePersonality.reveal.archetypeName}
              </span>
              <span className="love-personality-preview-headline">
                {selfLovePersonality.reveal.headline}
              </span>
              <span className="love-personality-preview-cta">
                {copy.profile.lovePersonalityOpenCta ?? 'Open your Love Personality →'}
              </span>
            </button>
          ) : selfLovePersonality ? (
            <button
              type="button"
              className="love-personality-preview-card is-pending"
              onClick={onOpenLovePersonality}
            >
              <span className="love-personality-preview-eyebrow">
                {copy.profile.lovePersonalityTitle ?? 'Love Personality'}
              </span>
              <span className="love-personality-preview-headline">
                {copy.profile.lovePersonalityAwaitingReveal ??
                  'Your Love Personality is being prepared…'}
              </span>
              <span className="love-personality-preview-cta">
                {copy.profile.lovePersonalityOpenCta ?? 'Open your Love Personality →'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="love-personality-preview-card is-empty"
              onClick={onOpenLovePersonalityQuiz}
            >
              <span className="love-personality-preview-eyebrow">
                {copy.profile.lovePersonalityTitle ?? 'Love Personality'}
              </span>
              <span className="love-personality-preview-headline">
                {copy.profile.lovePersonalityNotTaken ??
                  'Take the assessment to unlock smarter matching.'}
              </span>
              <span className="love-personality-preview-cta">
                {copy.profile.lovePersonalityTakeCta ?? 'Take the assessment →'}
              </span>
            </button>
          )}
          {/* Stability Assessment card — optional second test. Reuses the
              Love Personality card styling for a consistent pair. */}
          {selfProfile.stabilityProfile ? (
            <button
              type="button"
              className="love-personality-preview-card"
              onClick={onOpenStabilityQuiz}
            >
              <span className="love-personality-preview-eyebrow">
                {copy.profile.stabilityCardTitle}
              </span>
              <span className="love-personality-preview-headline">
                {copy.profile.stabilityCardTakenHeadline}
              </span>
              <span className="love-personality-preview-cta">
                {copy.profile.stabilityCardRetakeCta}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="love-personality-preview-card is-empty"
              onClick={onOpenStabilityQuiz}
            >
              <span className="love-personality-preview-eyebrow">
                {copy.profile.stabilityCardTitle}
              </span>
              <span className="love-personality-preview-headline">
                {copy.profile.stabilityCardNotTaken}
              </span>
              <span className="love-personality-preview-cta">
                {copy.profile.stabilityCardTakeCta}
              </span>
            </button>
          )}
          <p className="soft">
            {copy.profile.zodiacNote}:{' '}
            {getZodiacDescription(selfProfile.zodiac, appLanguage)?.overview ??
              copy.profile.uniqueCosmicSignature}
          </p>
          <button
            type="button"
            className="ghost personality-guide-open"
            onClick={onOpenPersonalityGuide}
          >
            {copy.profile.whatCodeMeans}
          </button>
        </article>

        <article className="profile-summary profile-interests-card">
          <h3>{copy.profile.interests}</h3>
          <div className="chips profile-interest-chips">
            {selfProfile.interests.map((interest) => (
              <span key={interest}>{translateInterest(interest, appLanguage)}</span>
            ))}
          </div>
        </article>
        <article className="profile-summary profile-interests-card">
          <h3>{copy.profile.socialTrust}</h3>
          <p className="soft">
            {copy.profile.connectedAccounts}: <strong>{socialConnectedCount}</strong> /{' '}
            {SOCIAL_PLATFORM_META.length}
          </p>
          <div className="chips profile-interest-chips">
            {SOCIAL_PLATFORM_META.filter(
              (platform) => selfProfile.socialConnections[platform.id].connected,
            ).length > 0 ? (
              SOCIAL_PLATFORM_META.filter(
                (platform) => selfProfile.socialConnections[platform.id].connected,
              ).map((platform) => <span key={platform.id}>{platform.label}</span>)
            ) : (
              <span>{copy.profile.noSocialAccounts}</span>
            )}
          </div>
        </article>
      </aside>

      <article className="profile-settings profile-editor">
        <h2>{copy.profile.editProfile}</h2>
        {(() => {
          const draftAge = Number.parseInt(profileDraft.age, 10)
          const checks = [
            { label: copy.profile.completenessName, ok: profileDraft.name.trim().length > 0 },
            {
              label: copy.profile.completenessAge,
              ok: Number.isFinite(draftAge) && draftAge >= 18 && draftAge <= 99,
            },
            { label: copy.profile.completenessCity, ok: profileDraft.city.trim().length > 0 },
            {
              label: copy.profile.completenessGender,
              ok: GENDER_OPTIONS.includes(profileDraft.gender as (typeof GENDER_OPTIONS)[number]),
            },
            {
              label: copy.profile.completenessPhoto,
              ok: profileDraft.photos.length >= 1,
            },
          ]
          const missing = checks.filter((c) => !c.ok)
          if (missing.length === 0) {
            return (
              <div className="profile-completeness profile-completeness--done">
                <strong>{copy.profile.completenessHeading}:</strong>{' '}
                {copy.profile.completenessAllDone}
              </div>
            )
          }
          return (
            <div className="profile-completeness profile-completeness--missing">
              <strong>{copy.profile.completenessHeading}</strong>
              <p className="soft">{copy.profile.completenessIntro}</p>
              <ul>
                {checks.map((c) => (
                  <li key={c.label} className={c.ok ? 'is-done' : 'is-missing'}>
                    <span aria-hidden="true">{c.ok ? '✓' : '○'}</span> {c.label}
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}
        <form onSubmit={saveMyProfile}>
          <details className="profile-editor-section" open>
            <summary>{copy.profile.identity}</summary>
            <div className="profile-editor-grid">
              <label>
                {copy.profile.name}
                <input
                  type="text"
                  value={profileDraft.name}
                  onChange={(event) => handleProfileDraftChange('name', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.age}
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={profileDraft.age}
                  onChange={(event) => handleProfileDraftChange('age', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.pronouns}
                <select
                  value={profileDraft.pronouns}
                  onChange={(event) => handleProfileDraftChange('pronouns', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {PRONOUNS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.gender}
                <select
                  value={profileDraft.gender}
                  onChange={(event) => handleProfileDraftChange('gender', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.orientation}
                <select
                  value={profileDraft.orientation}
                  onChange={(event) => handleProfileDraftChange('orientation', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {ORIENTATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.heightCm}
                <input
                  type="number"
                  min={130}
                  max={230}
                  value={profileDraft.heightCm}
                  onChange={(event) => handleProfileDraftChange('heightCm', event.target.value)}
                />
              </label>
            </div>
          </details>

          <details className="profile-editor-section">
            <summary>{copy.profile.profileDetails}</summary>
            <div className="profile-editor-grid">
              <label className="location-field">
                {copy.profile.city}
                <div className="location-input-row">
                  <input
                    type="text"
                    list="prive-city-list"
                    value={profileDraft.city}
                    onChange={(event) => handleProfileDraftChange('city', event.target.value)}
                  />
                  <button
                    type="button"
                    className="ghost location-detect-btn"
                    onClick={() => void runLocationDetect()}
                    disabled={locDetectLoading}
                    aria-label={copy.a11y.detectMyLocation}
                    title={copy.a11y.detectMyLocation}
                  >
                    {locDetectLoading ? '…' : (
                      <>
                        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <span>{copy.a11y.detect}</span>
                      </>
                    )}
                  </button>
                </div>
                {locDetectError ? (
                  <small className="location-detect-msg location-detect-msg--error">
                    {locDetectError}
                  </small>
                ) : null}
                {locDetectSuccess ? (
                  <small className="location-detect-msg location-detect-msg--success">
                    {locDetectSuccess}
                  </small>
                ) : null}
              </label>
              <label>
                {copy.profile.hometown}
                <input
                  type="text"
                  list="prive-city-list"
                  value={profileDraft.hometown}
                  onChange={(event) => handleProfileDraftChange('hometown', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.vibe}
                <input
                  type="text"
                  value={profileDraft.vibe}
                  onChange={(event) => handleProfileDraftChange('vibe', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.lookingFor}
                <select
                  value={profileDraft.lookingFor}
                  onChange={(event) => handleProfileDraftChange('lookingFor', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {LOOKING_FOR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.relationshipIntent}
                <select
                  value={profileDraft.relationshipIntent}
                  onChange={(event) =>
                    handleProfileDraftChange('relationshipIntent', event.target.value)
                  }
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {RELATIONSHIP_INTENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.interestsComma}
                <input
                  type="text"
                  value={profileDraft.interests}
                  onChange={(event) => handleProfileDraftChange('interests', event.target.value)}
                />
              </label>
              <label className="full-width">
                {copy.profile.bio}
                <textarea
                  rows={3}
                  value={profileDraft.bio}
                  onChange={(event) => handleProfileDraftChange('bio', event.target.value)}
                />
              </label>
              <div className="bio-writer-block full-width">
                <div className="bio-writer-actions">
                  <button
                    type="button"
                    className="ghost bio-writer-cta"
                    onClick={() => void runBioWriter()}
                    disabled={bioWriterLoading}
                  >
                    {bioWriterLoading
                      ? copy.profile.bioWriterLoading
                      : copy.profile.bioWriterCta}
                  </button>
                  {bioWriterResult || bioWriterError ? (
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => {
                        setBioWriterResult(null)
                        setBioWriterError(null)
                      }}
                      aria-label={copy.profile.bioWriterClose}
                    >
                      {copy.profile.bioWriterClose}
                    </button>
                  ) : null}
                  {bioWriterError ? (
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => void runBioWriter()}
                    >
                      {copy.profile.bioWriterRetry}
                    </button>
                  ) : null}
                </div>
                {bioWriterError ? (
                  <p className="bio-writer-error soft">{bioWriterError}</p>
                ) : null}
                {bioWriterResult ? (
                  <div className="bio-writer-result">
                    {bioWriterResult.critiques.length > 0 ? (
                      <div className="bio-writer-critiques">
                        <em>{copy.profile.bioWriterCritiques}</em>
                        <ul>
                          {bioWriterResult.critiques.map((c, i) => (
                            <li key={`bw-c-${i}`}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="bio-writer-rewrites">
                      <em>{copy.profile.bioWriterRewrites}</em>
                      <ul>
                        {bioWriterResult.rewrites.map((rewrite, i) => (
                          <li key={`bw-r-${i}`} className="bio-writer-rewrite-card">
                            <p>{rewrite}</p>
                            <button
                              type="button"
                              className="mini-btn"
                              onClick={() => {
                                handleProfileDraftChange('bio', rewrite)
                              }}
                            >
                              {copy.profile.bioWriterUseThis}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </details>

          {/* Personality Quiz section removed (2026-05-25) — every action it
              offered (take/retake, open reveal, open guide) is already
              available on the About card's preview block above. Keeping
              both creates redundant entry points. */}

          <details className="profile-editor-section">
            <summary>{copy.profile.careerLifestyle}</summary>
            <div className="profile-editor-grid">
              <label>
                {copy.profile.jobTitle}
                <input
                  type="text"
                  value={profileDraft.jobTitle}
                  onChange={(event) => handleProfileDraftChange('jobTitle', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.company}
                <input
                  type="text"
                  value={profileDraft.company}
                  onChange={(event) => handleProfileDraftChange('company', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.education}
                <input
                  type="text"
                  value={profileDraft.education}
                  onChange={(event) => handleProfileDraftChange('education', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.languagesComma}
                <input
                  type="text"
                  value={profileDraft.languages}
                  onChange={(event) => handleProfileDraftChange('languages', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.drinking}
                <select
                  value={profileDraft.drinking}
                  onChange={(event) => handleProfileDraftChange('drinking', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {DRINKING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.smoking}
                <select
                  value={profileDraft.smoking}
                  onChange={(event) => handleProfileDraftChange('smoking', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {SMOKING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.workout}
                <select
                  value={profileDraft.workout}
                  onChange={(event) => handleProfileDraftChange('workout', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {WORKOUT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.pets}
                <select
                  value={profileDraft.pets}
                  onChange={(event) => handleProfileDraftChange('pets', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {PETS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.childrenPlan}
                <select
                  value={profileDraft.childrenPlan}
                  onChange={(event) =>
                    handleProfileDraftChange('childrenPlan', event.target.value)
                  }
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {CHILDREN_PLAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.religion}
                <select
                  value={profileDraft.religion}
                  onChange={(event) => handleProfileDraftChange('religion', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {RELIGION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.politics}
                <select
                  value={profileDraft.politics}
                  onChange={(event) => handleProfileDraftChange('politics', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {POLITICS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.profile.zodiac}
                <select
                  value={profileDraft.zodiac}
                  onChange={(event) => handleProfileDraftChange('zodiac', event.target.value)}
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {ZODIAC_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {translateLifestyleOption(opt, appLanguage)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          <details className="profile-editor-section">
            <summary>{copy.profile.promptsSocial}</summary>
            <div className="profile-editor-grid">
              <label className="full-width">
                {copy.profile.prompt1}
                <textarea
                  rows={2}
                  value={profileDraft.promptOne}
                  onChange={(event) => handleProfileDraftChange('promptOne', event.target.value)}
                />
              </label>
              <label className="full-width">
                {copy.profile.prompt2}
                <textarea
                  rows={2}
                  value={profileDraft.promptTwo}
                  onChange={(event) => handleProfileDraftChange('promptTwo', event.target.value)}
                />
              </label>
              <label className="full-width">
                {copy.profile.prompt3}
                <textarea
                  rows={2}
                  value={profileDraft.promptThree}
                  onChange={(event) => handleProfileDraftChange('promptThree', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.dealbreakersComma}
                <input
                  type="text"
                  value={profileDraft.dealbreakers}
                  onChange={(event) => handleProfileDraftChange('dealbreakers', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.instagram}
                <input
                  type="text"
                  value={profileDraft.instagram}
                  onChange={(event) => handleProfileDraftChange('instagram', event.target.value)}
                />
              </label>
              <label>
                {copy.profile.anthem}
                <input
                  type="text"
                  value={profileDraft.anthem}
                  onChange={(event) => handleProfileDraftChange('anthem', event.target.value)}
                />
              </label>
              <label className="toggle">
                {copy.profile.travelMode}
                <input
                  type="checkbox"
                  checked={profileDraft.travelMode}
                  onChange={(event) =>
                    handleProfileDraftToggle('travelMode', event.target.checked)
                  }
                />
              </label>
            </div>
          </details>

          <details className="profile-editor-section">
            <summary>{copy.profile.photos}</summary>
            <p className="soft profile-photos-hint">{copy.profile.managePhotosHint}</p>
            {profileDraft.photos.length > 0 ? (
              <div className="profile-photos-strip">
                {profileDraft.photos.slice(0, 6).map((photo, index) => (
                  <img
                    key={`${photo}-${index}`}
                    src={photo}
                    alt={`Profile ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                ))}
                {profileDraft.photos.length > 6 ? (
                  <span className="profile-photos-more">+{profileDraft.photos.length - 6}</span>
                ) : null}
              </div>
            ) : (
              <p className="soft">{copy.profile.noPhotosYet}</p>
            )}
            <button type="button" className="profile-manage-photos-btn" onClick={onOpenPhotoStudio}>
              {copy.profile.managePhotos}
            </button>
          </details>

          <VoiceNoteRecorder
            appLanguage={appLanguage}
            value={selfProfile.voiceNoteUrl}
            onChange={onSaveVoiceNote}
          />

          {profileSaveErrors.length > 0 ? (
            <div className="profile-editor-errors" role="alert">
              <strong>Save blocked — fix the following:</strong>
              <ul>
                {profileSaveErrors.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="profile-editor-actions">
            <button type="submit">Save Profile</button>
            <button
              type="button"
              className="ghost"
              onClick={() => setProfileDraft(toProfileDraft(selfProfile))}
            >
              Reset Draft
            </button>
            <button type="button" className="ghost" onClick={onOpenSettings}>
              Open Settings
            </button>
          </div>
        </form>
      </article>

      {showVerify ? (
        <SelfieVerification
          appLanguage={appLanguage}
          onClose={() => setShowVerify(false)}
          onSubmitted={() => setVerifyStatus('pending')}
        />
      ) : null}
    </section>
  )
}

export const ProfileScreen = React.memo(ProfileScreenInner)
