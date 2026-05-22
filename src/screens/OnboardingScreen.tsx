import React from 'react'
import {
  GENDER_OPTIONS,
  RELATIONSHIP_INTENT_OPTIONS,
  UI_TEXT,
  getPersonalityTypeGuide,
  translateLifestyleOption,
  translateRelationshipIntent,
} from '../constants'
import {
  getPersonalityQuestions,
  personalityCodeFromAnswers,
  type PersonalityAnswer,
} from '../services/compatibility'
import { detectMyLocation, isLocationError } from '../services/geolocation'
import { backendUploadProfilePhoto } from '../services/backendApi'
import { backendInvokeProfileWriter } from '../services/ai/profileWriter'
import { Logo } from '../components/Logo'
import type { AppLanguage, SelfProfile } from '../domain'
import './OnboardingScreen.css'

// Onboarding wizard — 6 sequential steps that take a freshly-registered
// user from blank slate to live profile in 2-3 minutes. Picked over the
// previous "drop them in Discover and hope they find the profile editor"
// flow because (a) an empty profile sets is_active=false, making them
// invisible — which feels like the app is broken — and (b) we have AI
// Photo Coach + AI Bio Writer + the personality quiz already shipped
// but new users never discover them. The wizard surfaces all three at
// the right moments and frames the personality quiz as a reveal moment
// (Step 5 reveals "Your Love Personality is DMFR — Architect Heart").

export type OnboardingScreenProps = {
  appLanguage: AppLanguage
  selfProfile: SelfProfile
  setSelfProfile: React.Dispatch<React.SetStateAction<SelfProfile>>
  pushToast: (message: string, tone: 'info' | 'success' | 'error') => void
  /** Called when the user finishes or skips the wizard. Parent routes
   *  back to Discover and persists the onboarded flag. */
  onComplete: () => void
}

type Step =
  | 'welcome'
  | 'photos'
  | 'basics'
  | 'city'
  | 'quiz'
  | 'bio'
  | 'ready'

const STEP_ORDER: Step[] = ['welcome', 'photos', 'basics', 'city', 'quiz', 'bio', 'ready']

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  appLanguage,
  selfProfile,
  setSelfProfile,
  pushToast,
  onComplete,
}) => {
  const copy = UI_TEXT[appLanguage].onboarding
  const t = (template: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      template,
    )

  const [step, setStep] = React.useState<Step>('welcome')
  const stepIndex = STEP_ORDER.indexOf(step)

  // Local draft state — we don't touch setSelfProfile until the user
  // finishes the wizard, so abandoning mid-flow doesn't leak a partial
  // profile to the cloud sync effect.
  const [name, setName] = React.useState(selfProfile.name)
  const [age, setAge] = React.useState<string>(
    selfProfile.age > 0 ? String(selfProfile.age) : '',
  )
  const [gender, setGender] = React.useState<string>(selfProfile.gender)
  const [lookingFor, setLookingFor] = React.useState<string>(
    selfProfile.lookingFor || 'Long-term',
  )
  const [city, setCity] = React.useState(selfProfile.city)
  const [hometown, setHometown] = React.useState(selfProfile.hometown)
  const [photos, setPhotos] = React.useState<string[]>(selfProfile.photos ?? [])
  const [quizAnswers, setQuizAnswers] = React.useState<PersonalityAnswer[]>(
    selfProfile.personalityAnswers ?? Array(8).fill('A'),
  )
  const [bio, setBio] = React.useState(selfProfile.bio)

  // ── Photo upload ─────────────────────────────────────────────────
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [photoUploading, setPhotoUploading] = React.useState(false)
  const handlePhotoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setPhotoUploading(true)
    try {
      const reader = new FileReader()
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const uploaded = await backendUploadProfilePhoto(dataUrl)
      const finalPhoto = uploaded ?? dataUrl
      setPhotos((current) => [finalPhoto, ...current].slice(0, 9))
    } catch {
      pushToast(
        appLanguage === 'ro'
          ? 'Încărcarea pozei a eșuat.'
          : 'Photo upload failed.',
        'error',
      )
    } finally {
      setPhotoUploading(false)
    }
  }

  // ── City detect ──────────────────────────────────────────────────
  const [cityDetecting, setCityDetecting] = React.useState(false)
  const detectCity = async () => {
    setCityDetecting(true)
    const result = await detectMyLocation()
    setCityDetecting(false)
    if (isLocationError(result)) {
      pushToast(
        appLanguage === 'ro'
          ? 'Nu am putut detecta orașul. Te rugăm scrie-l manual.'
          : 'Could not detect your city. Please type it manually.',
        'error',
      )
      return
    }
    setCity(result.city)
  }

  // ── AI bio suggestion ────────────────────────────────────────────
  const [bioLoading, setBioLoading] = React.useState(false)
  const requestAiBio = async () => {
    setBioLoading(true)
    try {
      const result = await backendInvokeProfileWriter({
        currentBio: bio,
        interests: selfProfile.interests,
        vibe: selfProfile.vibe,
        age: Number.parseInt(age, 10) || undefined,
        city,
        relationshipGoal: lookingFor,
        language: appLanguage,
      })
      if (result?.rewrites?.[0]) {
        setBio(result.rewrites[0])
      } else {
        pushToast(
          appLanguage === 'ro'
            ? 'Nu am putut genera un bio acum. Mai încearcă.'
            : "Couldn't generate a bio right now. Try again.",
          'info',
        )
      }
    } finally {
      setBioLoading(false)
    }
  }

  // ── Validation per step ──────────────────────────────────────────
  const canAdvance = (): { ok: boolean; error?: string } => {
    if (step === 'photos' && photos.length === 0) {
      return { ok: false, error: copy.errorNeedPhoto }
    }
    if (step === 'basics') {
      if (!name.trim()) return { ok: false, error: copy.errorNeedName }
      const a = Number.parseInt(age, 10)
      if (!Number.isFinite(a) || a < 18 || a > 99) {
        return { ok: false, error: copy.errorNeedAge }
      }
    }
    if (step === 'city' && !city.trim()) {
      return { ok: false, error: copy.errorNeedCity }
    }
    return { ok: true }
  }

  const advance = () => {
    const v = canAdvance()
    if (!v.ok) {
      if (v.error) pushToast(v.error, 'error')
      return
    }
    const nextIndex = Math.min(STEP_ORDER.length - 1, stepIndex + 1)
    setStep(STEP_ORDER[nextIndex])
  }
  const back = () => {
    const prevIndex = Math.max(0, stepIndex - 1)
    setStep(STEP_ORDER[prevIndex])
  }

  // Commit the wizard's draft into the real selfProfile state. The
  // App's existing sync effect picks this up and saves to the cloud.
  const finish = () => {
    setSelfProfile((current) => ({
      ...current,
      name: name.trim(),
      age: Number.parseInt(age, 10) || current.age,
      gender,
      lookingFor,
      city: city.trim(),
      hometown: hometown.trim(),
      photos,
      personalityAnswers: quizAnswers,
      bio: bio.trim(),
    }))
    onComplete()
  }

  // Personality questions for current language
  const quizQuestions = getPersonalityQuestions(appLanguage)
  const computedPersonalityCode = personalityCodeFromAnswers(quizAnswers)
  const personalityType = getPersonalityTypeGuide(appLanguage).find(
    (entry) => entry.code === computedPersonalityCode,
  )

  // ── Render ──────────────────────────────────────────────────────
  return (
    <main className="onboarding-shell">
      <header className="onboarding-head">
        <Logo variant="compact" size="sm" />
        <div className="onboarding-progress" aria-label={t(copy.stepOf, { n: stepIndex + 1, total: STEP_ORDER.length })}>
          {STEP_ORDER.map((s, i) => (
            <span
              key={s}
              className={
                i < stepIndex
                  ? 'onboarding-dot is-done'
                  : i === stepIndex
                    ? 'onboarding-dot is-active'
                    : 'onboarding-dot'
              }
              aria-hidden="true"
            />
          ))}
        </div>
        <button
          type="button"
          className="ghost onboarding-skip"
          onClick={onComplete}
        >
          {copy.skip}
        </button>
      </header>

      <section className="onboarding-step">
        {step === 'welcome' && (
          <>
            <h1>{copy.welcomeTitle}</h1>
            <p>{copy.welcomeBody}</p>
            <button type="button" className="onboarding-primary-btn" onClick={advance}>
              {copy.welcomeBegin}
            </button>
          </>
        )}

        {step === 'photos' && (
          <>
            <h1>{copy.photosTitle}</h1>
            <p>{copy.photosBody}</p>
            <div className="onboarding-photo-grid">
              {photos.map((photo, idx) => (
                <div key={`${idx}-${photo.slice(-8)}`} className="onboarding-photo-tile">
                  <img src={photo} alt="" loading="lazy" />
                </div>
              ))}
              {photos.length < 9 && (
                <button
                  type="button"
                  className="onboarding-photo-add"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  aria-label={copy.photosUploadBtn}
                >
                  {photoUploading ? '…' : '+'}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handlePhotoFile(file)
                event.target.value = ''
              }}
            />
            <p className="onboarding-hint">
              {t(copy.photosCounter, { n: photos.length })}
            </p>
          </>
        )}

        {step === 'basics' && (
          <>
            <h1>{copy.basicsTitle}</h1>
            <p>{copy.basicsBody}</p>
            <label className="onboarding-field">
              <span>{copy.labelName}</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="given-name"
              />
            </label>
            <label className="onboarding-field">
              <span>{copy.labelAge}</span>
              <input
                type="number"
                min={18}
                max={99}
                value={age}
                onChange={(event) => setAge(event.target.value)}
              />
            </label>
            <fieldset className="onboarding-field">
              <legend>{copy.labelGender}</legend>
              <div className="onboarding-segments" role="radiogroup">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={gender === opt}
                    className={
                      gender === opt ? 'onboarding-segment is-active' : 'onboarding-segment'
                    }
                    onClick={() => setGender(opt)}
                  >
                    {translateLifestyleOption(opt, appLanguage)}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="onboarding-field">
              <legend>{copy.labelLookingFor}</legend>
              <div className="onboarding-segments" role="radiogroup">
                {RELATIONSHIP_INTENT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={lookingFor === opt}
                    className={
                      lookingFor === opt
                        ? 'onboarding-segment is-active'
                        : 'onboarding-segment'
                    }
                    onClick={() => setLookingFor(opt)}
                  >
                    {translateRelationshipIntent(opt, appLanguage)}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 'city' && (
          <>
            <h1>{copy.cityTitle}</h1>
            <p>{copy.cityBody}</p>
            <label className="onboarding-field">
              <span>{copy.labelCity}</span>
              <div className="onboarding-city-row">
                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  autoComplete="address-level2"
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={() => void detectCity()}
                  disabled={cityDetecting}
                >
                  {cityDetecting ? '…' : UI_TEXT[appLanguage].a11y.detect}
                </button>
              </div>
            </label>
            <label className="onboarding-field">
              <span>{copy.labelHometown}</span>
              <input
                type="text"
                value={hometown}
                onChange={(event) => setHometown(event.target.value)}
              />
            </label>
          </>
        )}

        {step === 'quiz' && (
          <>
            <h1>{copy.quizTitle}</h1>
            <p className="onboarding-quiz-subtitle">{copy.quizSubtitle}</p>
            <p>{copy.quizBody}</p>
            <ol className="onboarding-quiz-list">
              {quizQuestions.map((q, idx) => (
                <li key={q.id} className="onboarding-quiz-item">
                  <p className="onboarding-quiz-prompt">{q.prompt}</p>
                  <div className="onboarding-segments" role="radiogroup">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={quizAnswers[idx] === 'A'}
                      className={
                        quizAnswers[idx] === 'A'
                          ? 'onboarding-segment is-active'
                          : 'onboarding-segment'
                      }
                      onClick={() =>
                        setQuizAnswers((current) => {
                          const next = [...current]
                          next[idx] = 'A'
                          return next
                        })
                      }
                    >
                      A) {q.optionA}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={quizAnswers[idx] === 'B'}
                      className={
                        quizAnswers[idx] === 'B'
                          ? 'onboarding-segment is-active'
                          : 'onboarding-segment'
                      }
                      onClick={() =>
                        setQuizAnswers((current) => {
                          const next = [...current]
                          next[idx] = 'B'
                          return next
                        })
                      }
                    >
                      B) {q.optionB}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <div className="onboarding-quiz-result">
              <p className="onboarding-quiz-result-label">{copy.quizResultTitle}</p>
              <p className="onboarding-quiz-result-code">{computedPersonalityCode}</p>
              {personalityType ? (
                <>
                  <p className="onboarding-quiz-result-label-name">{personalityType.label}</p>
                  <p className="onboarding-quiz-result-summary">{personalityType.summary}</p>
                </>
              ) : null}
            </div>
          </>
        )}

        {step === 'bio' && (
          <>
            <h1>{copy.bioTitle}</h1>
            <p>{copy.bioBody}</p>
            <label className="onboarding-field">
              <span>{copy.labelBio}</span>
              <textarea
                rows={5}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={500}
              />
            </label>
            <button
              type="button"
              className="ghost onboarding-ai-btn"
              onClick={() => void requestAiBio()}
              disabled={bioLoading}
            >
              {bioLoading ? copy.bioAiLoading : copy.bioAiButton}
            </button>
          </>
        )}

        {step === 'ready' && (
          <>
            <h1>{copy.readyTitle}</h1>
            <p>{copy.readyBody}</p>
            <button type="button" className="onboarding-primary-btn" onClick={finish}>
              {copy.readyEnter}
            </button>
          </>
        )}
      </section>

      {step !== 'welcome' && step !== 'ready' && (
        <footer className="onboarding-footer">
          <button type="button" className="ghost" onClick={back}>
            {copy.back}
          </button>
          <button type="button" className="onboarding-primary-btn" onClick={advance}>
            {step === 'bio' ? copy.finish : copy.continue}
          </button>
        </footer>
      )}
    </main>
  )
}
