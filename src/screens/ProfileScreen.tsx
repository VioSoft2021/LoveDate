import React from 'react'
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
  translateRelationshipIntent,
} from '../constants'
import {
  getPersonalityQuestions,
  type PersonalityAnswer,
} from '../services/compatibility'
import { toProfileDraft } from '../persistence'
import { formatUiText } from '../utils'
import {
  backendInvokePhotoCoach,
  type AiPhotoCoachResult,
} from '../services/ai/photoCoach'
import {
  backendInvokeProfileWriter,
  type AiProfileWriterResult,
} from '../services/ai/profileWriter'
import { detectMyLocation, isLocationError } from '../services/geolocation'
import { ROMANIAN_CITIES } from '../data/romanianCities'
import type {
  AppLanguage,
  PhotoStudioAnalysis,
  PhotoStudioControls,
  SelfProfile,
} from '../domain'

type TypeGuide = { code: string; label: string; summary: string } | null | undefined
type CognitiveFunctions =
  | { primary: string; support: string; tertiary: string; shadow: string }
  | null
  | undefined

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
  handlePersonalityAnswerChange: (index: number, value: PersonalityAnswer) => void
  saveMyProfile: (event: React.FormEvent<HTMLFormElement>) => void
  profileSaveErrors: string[]
  selfPersonalityCode: string
  selfTypeGuide: TypeGuide
  selfCognitiveFunctions: CognitiveFunctions
  draftPersonalityCode: string
  socialConnectedCount: number
  // photo studio
  photoUrlInput: string
  setPhotoUrlInput: (value: string) => void
  addPhotoFromUrl: () => void
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  setPrimaryDraftPhoto: (index: number) => void
  removeDraftPhoto: (photo: string) => void
  photoStudioSource: string | null
  photoStudioAnalysis: PhotoStudioAnalysis | null
  photoStudioControls: PhotoStudioControls
  setPhotoStudioControls: React.Dispatch<React.SetStateAction<PhotoStudioControls>>
  photoStudioBusy: boolean
  isDraggingCrop: boolean
  isRedrawCropMode: boolean
  setIsRedrawCropMode: React.Dispatch<React.SetStateAction<boolean>>
  applyPhotoStudio: () => void
  resetPhotoStudioControls: () => void
  closePhotoStudio: () => void
  studioFrameRef: React.RefObject<HTMLDivElement | null>
  handleStudioPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handleStudioPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  handleStudioPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  onOpenPersonalityGuide: () => void
  onOpenSettings: () => void
}

const ProfileScreenInner: React.FC<ProfileScreenProps> = ({
  appLanguage,
  selfProfile,
  profileDraft,
  setProfileDraft,
  handleProfileDraftChange,
  handleProfileDraftToggle,
  handlePersonalityAnswerChange,
  saveMyProfile,
  profileSaveErrors,
  selfPersonalityCode,
  selfTypeGuide,
  selfCognitiveFunctions,
  draftPersonalityCode,
  socialConnectedCount,
  photoUrlInput,
  setPhotoUrlInput,
  addPhotoFromUrl,
  handlePhotoUpload,
  setPrimaryDraftPhoto,
  removeDraftPhoto,
  photoStudioSource,
  photoStudioAnalysis,
  photoStudioControls,
  setPhotoStudioControls,
  photoStudioBusy,
  isDraggingCrop,
  isRedrawCropMode,
  setIsRedrawCropMode,
  applyPhotoStudio,
  resetPhotoStudioControls,
  closePhotoStudio,
  studioFrameRef,
  handleStudioPointerDown,
  handleStudioPointerMove,
  handleStudioPointerUp,
  onOpenPersonalityGuide,
  onOpenSettings,
}) => {
  const copy = UI_TEXT[appLanguage]

  // AI Photo Coach — local to this screen since no other surface needs it.
  const [photoCoachResult, setPhotoCoachResult] =
    React.useState<AiPhotoCoachResult | null>(null)
  const [photoCoachLoading, setPhotoCoachLoading] = React.useState(false)
  const [photoCoachError, setPhotoCoachError] = React.useState<string | null>(null)

  // AI Profile Writer — same pattern, scoped to the bio field.
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

  const runPhotoCoach = React.useCallback(async () => {
    if (!profileDraft.photos.length) {
      setPhotoCoachError(copy.profile.photoCoachNoPhotos)
      return
    }
    setPhotoCoachError(null)
    setPhotoCoachLoading(true)
    try {
      const result = await backendInvokePhotoCoach({
        photos: profileDraft.photos,
        selfProfile: {
          name: selfProfile.name,
          age: selfProfile.age,
          vibe: selfProfile.vibe,
        },
        language: appLanguage,
      })
      if (!result) {
        setPhotoCoachError(copy.profile.photoCoachError)
        setPhotoCoachResult(null)
      } else {
        setPhotoCoachResult(result)
      }
    } catch {
      setPhotoCoachError(copy.profile.photoCoachError)
      setPhotoCoachResult(null)
    } finally {
      setPhotoCoachLoading(false)
    }
  }, [
    profileDraft.photos,
    selfProfile.name,
    selfProfile.age,
    selfProfile.vibe,
    appLanguage,
    copy.profile.photoCoachNoPhotos,
    copy.profile.photoCoachError,
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
                </h3>
                <p>
                  {selfProfile.city} {'•'} {selfProfile.vibe}
                </p>
              </div>
            </div>
          )}
        </article>

        <article className="profile-summary profile-about-card">
          <h3>{copy.profile.aboutMe}</h3>
          <p>{selfProfile.bio}</p>
          <p className="profile-about-meta">
            {selfProfile.jobTitle} {copy.profile.jobAtCompany} {selfProfile.company} {'•'}{' '}
            {translateRelationshipIntent(selfProfile.lookingFor, appLanguage)}
          </p>
          <p className="compatibility-score">
            {copy.profile.personalityCode}: {selfPersonalityCode}
          </p>
          {selfTypeGuide ? (
            <p className="soft">
              {selfTypeGuide.label}: {selfTypeGuide.summary}
            </p>
          ) : null}
          {selfCognitiveFunctions ? (
            <ul className="profile-cognitive-list">
              <li>
                <strong>{copy.profile.primary}:</strong> {selfCognitiveFunctions.primary}
              </li>
              <li>
                <strong>{copy.profile.support}:</strong> {selfCognitiveFunctions.support}
              </li>
            </ul>
          ) : null}
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
                  <option value="">Select...</option>
                  {PRONOUNS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  <option value="">Select...</option>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  <option value="">Select...</option>
                  {ORIENTATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                    aria-label="Detect my location"
                    title="Detect my location"
                  >
                    {locDetectLoading ? '…' : (
                      <>
                        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <span>Detect</span>
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
                  <option value="">Select...</option>
                  {LOOKING_FOR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  <option value="">Select...</option>
                  {RELATIONSHIP_INTENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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

          <details className="profile-editor-section">
            <summary>{copy.profile.personalityQuiz}</summary>
            <div className="profile-editor-grid">
              <p className="soft full-width">
                {copy.profile.compatibilityCode}: <strong>{draftPersonalityCode}</strong>.{' '}
                {copy.profile.pickOption}
              </p>
              <button
                type="button"
                className="ghost full-width personality-guide-open"
                onClick={onOpenPersonalityGuide}
              >
                {copy.profile.openGuide}
              </button>
              {getPersonalityQuestions(appLanguage).map((question, index) => (
                <label key={question.id} className="full-width">
                  {question.prompt}
                  <select
                    value={profileDraft.personalityAnswers[index] ?? 'A'}
                    onChange={(event) =>
                      handlePersonalityAnswerChange(
                        index,
                        event.target.value === 'B' ? 'B' : 'A',
                      )
                    }
                  >
                    <option value="A">A) {question.optionA}</option>
                    <option value="B">B) {question.optionB}</option>
                  </select>
                </label>
              ))}
            </div>
          </details>

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
                  <option value="">Select...</option>
                  {DRINKING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  <option value="">Select...</option>
                  {SMOKING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  <option value="">Select...</option>
                  {WORKOUT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  <option value="">Select...</option>
                  {PETS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  <option value="">Select...</option>
                  {CHILDREN_PLAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  <option value="">Select...</option>
                  {RELIGION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  <option value="">Select...</option>
                  {POLITICS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  <option value="">Select...</option>
                  {ZODIAC_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
            <div className="photo-input-row">
              <input
                type="url"
                placeholder={copy.profile.pastePhotoUrl}
                value={photoUrlInput}
                onChange={(event) => setPhotoUrlInput(event.target.value)}
              />
              <button type="button" className="ghost" onClick={addPhotoFromUrl}>
                {copy.profile.addUrl}
              </button>
            </div>
            <label className="upload-field">
              {copy.profile.uploadPhoto}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} />
            </label>

            <div className="photo-coach-block">
              <div className="photo-coach-actions">
                <button
                  type="button"
                  className="ghost photo-coach-cta"
                  onClick={() => void runPhotoCoach()}
                  disabled={photoCoachLoading || profileDraft.photos.length === 0}
                >
                  {photoCoachLoading
                    ? copy.profile.photoCoachLoading
                    : copy.profile.photoCoachCta}
                </button>
                {photoCoachError ? (
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => void runPhotoCoach()}
                  >
                    {copy.profile.photoCoachRetry}
                  </button>
                ) : null}
              </div>
              {photoCoachError ? (
                <p className="photo-coach-error soft">{photoCoachError}</p>
              ) : null}
              {photoCoachResult ? (
                <div className="photo-coach-result">
                  <p className="photo-coach-overall">
                    <strong>{copy.profile.photoCoachOverall}:</strong>{' '}
                    {photoCoachResult.overall}
                  </p>
                  <p className="photo-coach-primary soft">
                    <strong>{copy.profile.photoCoachPrimaryPick}:</strong>{' '}
                    {formatUiText(copy.profile.photoCoachPhotoLabel, {
                      index: photoCoachResult.primaryPick + 1,
                    })}
                  </p>
                  <ul className="photo-coach-photo-list">
                    {photoCoachResult.perPhoto.map((entry) => {
                      const photoSrc = profileDraft.photos[entry.index]
                      return (
                        <li
                          key={`coach-${entry.index}`}
                          className={`photo-coach-photo-card ${
                            entry.index === photoCoachResult.primaryPick
                              ? 'is-primary-pick'
                              : ''
                          }`}
                        >
                          <div className="photo-coach-photo-thumb">
                            {photoSrc ? (
                              <img
                                src={photoSrc}
                                alt={formatUiText(copy.profile.photoCoachPhotoLabel, {
                                  index: entry.index + 1,
                                })}
                                loading="lazy"
                                decoding="async"
                              />
                            ) : null}
                          </div>
                          <div className="photo-coach-photo-body">
                            <p className="photo-coach-photo-head">
                              <strong>
                                {formatUiText(copy.profile.photoCoachPhotoLabel, {
                                  index: entry.index + 1,
                                })}
                              </strong>{' '}
                              <span className="photo-coach-score">
                                {copy.profile.photoCoachScore}: {entry.score}/10
                              </span>
                            </p>
                            {entry.strengths.length ? (
                              <div className="photo-coach-bullets">
                                <em>{copy.profile.photoCoachStrengths}:</em>
                                <ul>
                                  {entry.strengths.map((s, i) => (
                                    <li key={`s-${entry.index}-${i}`}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {entry.improvements.length ? (
                              <div className="photo-coach-bullets">
                                <em>{copy.profile.photoCoachImprovements}:</em>
                                <ul>
                                  {entry.improvements.map((s, i) => (
                                    <li key={`i-${entry.index}-${i}`}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="draft-photo-grid">
              {profileDraft.photos.map((photo, index) => (
                <div key={`${photo}-${index}`} className="draft-photo-item">
                  <img
                    src={photo}
                    alt={`Draft profile ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="draft-photo-actions">
                    {index === 0 ? (
                      <span className="draft-photo-primary-badge">
                        {copy.profile.primaryPhoto}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="mini-btn ghost"
                        onClick={() => setPrimaryDraftPhoto(index)}
                      >
                        {copy.profile.setAsPrimary}
                      </button>
                    )}
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => removeDraftPhoto(photo)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {photoStudioSource && (
              <aside className="photo-studio-inline" aria-label="Photo studio">
                <h4>Photo Studio</h4>
                <div
                  ref={studioFrameRef}
                  className={
                    photoStudioControls.cropAspect === 'free'
                      ? `studio-preview-frame free-crop-active ${isDraggingCrop ? 'dragging' : ''}`
                      : 'studio-preview-frame'
                  }
                  onPointerDown={handleStudioPointerDown}
                  onPointerMove={handleStudioPointerMove}
                  onPointerUp={handleStudioPointerUp}
                  onPointerCancel={handleStudioPointerUp}
                  style={{
                    aspectRatio:
                      photoStudioControls.cropAspect === 'square'
                        ? '1 / 1'
                        : photoStudioControls.cropAspect === 'classic'
                          ? '3 / 4'
                          : photoStudioControls.cropAspect === 'portrait'
                            ? '4 / 5'
                            : photoStudioAnalysis
                              ? `${photoStudioAnalysis.width} / ${photoStudioAnalysis.height}`
                              : '4 / 5',
                  }}
                >
                  <img
                    src={photoStudioSource}
                    alt="Photo studio preview"
                    decoding="async"
                    style={{
                      transform:
                        photoStudioControls.cropAspect === 'free'
                          ? 'none'
                          : `translate(${photoStudioControls.offsetX}px, ${photoStudioControls.offsetY}px) scale(${photoStudioControls.zoom}) rotate(${photoStudioControls.rotate}deg)`,
                      objectFit: photoStudioControls.cropAspect === 'free' ? 'fill' : 'cover',
                      filter: `brightness(${photoStudioControls.brightness}%) contrast(${photoStudioControls.contrast}%) saturate(${photoStudioControls.saturate}%)`,
                    }}
                  />
                  {photoStudioControls.cropAspect === 'free' && (
                    <>
                      <div
                        className="crop-mask"
                        style={{
                          left: `${photoStudioControls.freeCropX}%`,
                          top: `${photoStudioControls.freeCropY}%`,
                          width: `${photoStudioControls.freeCropWidth}%`,
                          height: `${photoStudioControls.freeCropHeight}%`,
                        }}
                      />
                      <div
                        className="crop-visual"
                        data-crop-box="true"
                        style={{
                          left: `${photoStudioControls.freeCropX}%`,
                          top: `${photoStudioControls.freeCropY}%`,
                          width: `${photoStudioControls.freeCropWidth}%`,
                          height: `${photoStudioControls.freeCropHeight}%`,
                        }}
                      >
                        <span className="crop-handle nw" data-crop-handle="nw" />
                        <span className="crop-handle ne" data-crop-handle="ne" />
                        <span className="crop-handle sw" data-crop-handle="sw" />
                        <span className="crop-handle se" data-crop-handle="se" />
                      </div>
                    </>
                  )}
                </div>

                {photoStudioAnalysis && (
                  <div className="studio-analysis">
                    <p>
                      Resolution: {photoStudioAnalysis.width} x {photoStudioAnalysis.height}
                    </p>
                    <p>Aspect: {photoStudioAnalysis.aspectRatio}</p>
                    <p>Size: {photoStudioAnalysis.sizeKb} KB</p>
                    <p>Brightness: {photoStudioAnalysis.averageBrightness}%</p>
                    {photoStudioControls.cropAspect === 'free' && (
                      <>
                        <p>
                          Tip: drag inside box to move, drag corners to resize, use Redraw
                          Selection to create a new box.
                        </p>
                        <p>
                          Crop start: {photoStudioControls.freeCropX}% /{' '}
                          {photoStudioControls.freeCropY}%
                        </p>
                        <p>
                          Crop size: {photoStudioControls.freeCropWidth}% x{' '}
                          {photoStudioControls.freeCropHeight}%
                        </p>
                        <p>Redraw mode: {isRedrawCropMode ? 'ON' : 'OFF'}</p>
                      </>
                    )}
                  </div>
                )}

                <div className="studio-sliders">
                  <label>
                    Crop
                    <select
                      value={photoStudioControls.cropAspect}
                      onChange={(event) =>
                        setPhotoStudioControls((current) => ({
                          ...current,
                          cropAspect: event.target.value as PhotoStudioControls['cropAspect'],
                        }))
                      }
                    >
                      <option value="free">Free Crop</option>
                      <option value="portrait">Portrait 4:5</option>
                      <option value="classic">Classic 3:4</option>
                      <option value="square">Square 1:1</option>
                    </select>
                  </label>
                  {photoStudioControls.cropAspect === 'free' && (
                    <>
                      <label>
                        Crop X
                        <input
                          type="range"
                          min={0}
                          max={95}
                          step={1}
                          value={photoStudioControls.freeCropX}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => {
                              const nextX = Number(event.target.value)
                              const maxWidth = 100 - nextX
                              return {
                                ...current,
                                freeCropX: nextX,
                                freeCropWidth: Math.min(current.freeCropWidth, maxWidth),
                              }
                            })
                          }
                        />
                      </label>
                      <label>
                        Crop Y
                        <input
                          type="range"
                          min={0}
                          max={95}
                          step={1}
                          value={photoStudioControls.freeCropY}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => {
                              const nextY = Number(event.target.value)
                              const maxHeight = 100 - nextY
                              return {
                                ...current,
                                freeCropY: nextY,
                                freeCropHeight: Math.min(current.freeCropHeight, maxHeight),
                              }
                            })
                          }
                        />
                      </label>
                      <label>
                        Crop Width
                        <input
                          type="range"
                          min={5}
                          max={100 - photoStudioControls.freeCropX}
                          step={1}
                          value={photoStudioControls.freeCropWidth}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => ({
                              ...current,
                              freeCropWidth: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label>
                        Crop Height
                        <input
                          type="range"
                          min={5}
                          max={100 - photoStudioControls.freeCropY}
                          step={1}
                          value={photoStudioControls.freeCropHeight}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => ({
                              ...current,
                              freeCropHeight: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                    </>
                  )}
                  <label>
                    Zoom
                    <input
                      type="range"
                      min={1}
                      max={2.5}
                      step={0.05}
                      value={photoStudioControls.zoom}
                      disabled={photoStudioControls.cropAspect === 'free'}
                      onChange={(event) =>
                        setPhotoStudioControls((current) => ({
                          ...current,
                          zoom: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Rotate
                    <input
                      type="range"
                      min={-20}
                      max={20}
                      step={1}
                      value={photoStudioControls.rotate}
                      disabled={photoStudioControls.cropAspect === 'free'}
                      onChange={(event) =>
                        setPhotoStudioControls((current) => ({
                          ...current,
                          rotate: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Brightness
                    <input
                      type="range"
                      min={70}
                      max={140}
                      step={1}
                      value={photoStudioControls.brightness}
                      onChange={(event) =>
                        setPhotoStudioControls((current) => ({
                          ...current,
                          brightness: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Contrast
                    <input
                      type="range"
                      min={70}
                      max={150}
                      step={1}
                      value={photoStudioControls.contrast}
                      onChange={(event) =>
                        setPhotoStudioControls((current) => ({
                          ...current,
                          contrast: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Saturation
                    <input
                      type="range"
                      min={70}
                      max={150}
                      step={1}
                      value={photoStudioControls.saturate}
                      onChange={(event) =>
                        setPhotoStudioControls((current) => ({
                          ...current,
                          saturate: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Horizontal Position
                    <input
                      type="range"
                      min={-220}
                      max={220}
                      step={1}
                      value={photoStudioControls.offsetX}
                      disabled={photoStudioControls.cropAspect === 'free'}
                      onChange={(event) =>
                        setPhotoStudioControls((current) => ({
                          ...current,
                          offsetX: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Vertical Position
                    <input
                      type="range"
                      min={-220}
                      max={220}
                      step={1}
                      value={photoStudioControls.offsetY}
                      disabled={photoStudioControls.cropAspect === 'free'}
                      onChange={(event) =>
                        setPhotoStudioControls((current) => ({
                          ...current,
                          offsetY: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="profile-editor-actions">
                  {photoStudioControls.cropAspect === 'free' && (
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setIsRedrawCropMode((current) => !current)}
                    >
                      {isRedrawCropMode ? 'Cancel Redraw' : 'Redraw Selection'}
                    </button>
                  )}
                  <button type="button" onClick={applyPhotoStudio} disabled={photoStudioBusy}>
                    {photoStudioBusy ? 'Processing...' : 'Add Edited Photo'}
                  </button>
                  <button type="button" className="ghost" onClick={resetPhotoStudioControls}>
                    Reset Edits
                  </button>
                  <button type="button" className="ghost" onClick={closePhotoStudio}>
                    Cancel
                  </button>
                </div>
              </aside>
            )}
          </details>

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
    </section>
  )
}

export const ProfileScreen = React.memo(ProfileScreenInner)
