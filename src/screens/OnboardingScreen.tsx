import React from 'react'
import {
  GENDER_OPTIONS,
  RELATIONSHIP_INTENT_OPTIONS,
  UI_TEXT,
  translateLifestyleOption,
  translateRelationshipIntent,
} from '../constants'
import {
  PERSONALITY_QUESTION_COUNT,
  type LikertAnswer,
  type LovePersonality,
} from '../services/compatibility'
import { detectMyLocation, isLocationError } from '../services/geolocation'
import { backendUploadProfilePhoto } from '../services/backendApi'
import { backendInvokeProfileWriter } from '../services/ai/profileWriter'
import { Logo } from '../components/Logo'
import {
  LovePersonalityQuiz,
  type LovePersonalityQuizSnapshot,
} from '../components/LovePersonalityQuiz'
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
  // Quiz snapshot is owned by the embedded LovePersonalityQuiz component;
  // we just mirror its latest snapshot so finish() can commit it.
  const [quizSnapshot, setQuizSnapshot] = React.useState<LovePersonalityQuizSnapshot>({
    answers: Array(PERSONALITY_QUESTION_COUNT).fill(undefined) as Array<LikertAnswer | undefined>,
    completed: false,
    lovePersonality: null,
    reveal: selfProfile.lovePersonality?.reveal ?? null,
    position: 'intro',
  })
  const [bio, setBio] = React.useState(selfProfile.bio)

  // ── Photo upload ─────────────────────────────────────────────────
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [photoUploading, setPhotoUploading] = React.useState(false)

  // Reads one File → returns the Supabase Storage URL (preferred) or
  // the data URL fallback (when storage upload fails). Throws on a
  // non-image type or FileReader failure so the batch loop below can
  // surface a single toast for the whole upload instead of one per
  // file.
  const uploadOnePhoto = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      throw new Error('not an image')
    }
    const reader = new FileReader()
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    const uploaded = await backendUploadProfilePhoto(dataUrl)
    return uploaded ?? dataUrl
  }

  // Multi-file upload (2026-05-26): a single OS file picker round trip
  // can hand us N images. We upload them sequentially — parallel
  // uploads would race the React state updater and risk only one of
  // them landing in setPhotos — and stop early once the 9-photo cap
  // is reached. Each photo appears in the gallery as soon as it's
  // uploaded so the user sees progressive feedback.
  const handlePhotoFiles = async (files: File[]) => {
    if (files.length === 0) return
    setPhotoUploading(true)
    let failures = 0
    try {
      for (const file of files) {
        try {
          const finalPhoto = await uploadOnePhoto(file)
          let reachedCap = false
          setPhotos((current) => {
            if (current.length >= 9) {
              reachedCap = true
              return current
            }
            return [finalPhoto, ...current].slice(0, 9)
          })
          if (reachedCap) break
        } catch {
          failures += 1
        }
      }
    } finally {
      setPhotoUploading(false)
    }
    if (failures > 0) {
      pushToast(
        appLanguage === 'ro'
          ? failures === 1
            ? 'Încărcarea pozei a eșuat.'
            : `${failures} poze nu au putut fi încărcate.`
          : failures === 1
            ? 'Photo upload failed.'
            : `${failures} photos couldn't be uploaded.`,
        'error',
      )
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
      // Phase A round 2 — gender is now mandatory. The AI matching pipeline
      // (E3 scoring, semantic filter, deck gender filter) all key off it,
      // and an unset gender means the user is invisible in every deck.
      if (!gender.trim()) return { ok: false, error: copy.errorNeedGender }
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
    const completeAnswers: LikertAnswer[] | undefined = quizSnapshot.completed
      ? (quizSnapshot.answers as LikertAnswer[])
      : undefined
    const lovePersonalityWithReveal: LovePersonality | undefined =
      quizSnapshot.lovePersonality && quizSnapshot.reveal
        ? { ...quizSnapshot.lovePersonality, reveal: quizSnapshot.reveal }
        : quizSnapshot.lovePersonality ?? undefined
    setSelfProfile((current) => ({
      ...current,
      name: name.trim(),
      age: Number.parseInt(age, 10) || current.age,
      gender,
      lookingFor,
      city: city.trim(),
      hometown: hometown.trim(),
      photos,
      personalityAnswers: completeAnswers,
      lovePersonality: lovePersonalityWithReveal ?? current.lovePersonality,
      bio: bio.trim(),
    }))
    onComplete()
  }

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
              multiple
              hidden
              onChange={(event) => {
                const files = event.target.files
                  ? Array.from(event.target.files)
                  : []
                if (files.length > 0) void handlePhotoFiles(files)
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
          <LovePersonalityQuiz
            appLanguage={appLanguage}
            selfName={name}
            onChange={setQuizSnapshot}
            onSkip={advance}
          />
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

      {/* Hide the outer Back/Continue mid-quiz — the carousel owns its own
          navigation while the user moves through the 14 items. The outer
          footer reappears once they reach the result card (Continue → bio). */}
      {step !== 'welcome' &&
        step !== 'ready' &&
        !(step === 'quiz' && quizSnapshot.position !== 'intro' && quizSnapshot.position !== 'result') && (
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
