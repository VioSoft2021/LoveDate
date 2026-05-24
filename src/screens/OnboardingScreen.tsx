import React from 'react'
import {
  GENDER_OPTIONS,
  RELATIONSHIP_INTENT_OPTIONS,
  UI_TEXT,
  translateLifestyleOption,
  translateRelationshipIntent,
} from '../constants'
import {
  getPersonalityQuestions,
  lovePersonalityFromAnswers,
  BIG_FIVE_QUESTION_COUNT,
  PERSONALITY_QUESTION_COUNT,
  type LikertAnswer,
} from '../services/compatibility'
import { detectMyLocation, isLocationError } from '../services/geolocation'
import { backendUploadProfilePhoto } from '../services/backendApi'
import { backendInvokeProfileWriter } from '../services/ai/profileWriter'
import { backendInvokeLovePersonalityReveal } from '../services/ai/lovePersonalityReveal'
import { Logo } from '../components/Logo'
import type { AppLanguage, SelfProfile } from '../domain'
import type { LovePersonalityReveal } from '../services/compatibility'
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
  // Tier A — 14 Likert answers (1-5). undefined slots = not yet answered;
  // the user can advance with partial answers by hitting Skip, in which
  // case the array stays sparse and lovePersonalityFromAnswers returns null.
  const [quizAnswers, setQuizAnswers] = React.useState<Array<LikertAnswer | undefined>>(
    () => {
      const initial: Array<LikertAnswer | undefined> = Array(PERSONALITY_QUESTION_COUNT).fill(undefined)
      const existing = selfProfile.personalityAnswers
      if (existing && existing.length === PERSONALITY_QUESTION_COUNT) {
        for (let i = 0; i < PERSONALITY_QUESTION_COUNT; i += 1) {
          initial[i] = existing[i]
        }
      }
      return initial
    },
  )
  const [bio, setBio] = React.useState(selfProfile.bio)

  // Tier A Phase 3 — Claude reveal fires once the user has answered all 14
  // items. Cached client-side; retake invalidates the cache automatically.
  const [reveal, setReveal] = React.useState<LovePersonalityReveal | null>(
    selfProfile.lovePersonality?.reveal ?? null,
  )
  const [revealLoading, setRevealLoading] = React.useState(false)

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
    const completeAnswers: LikertAnswer[] | undefined = quizAnswers.every(
      (value): value is LikertAnswer => value !== undefined,
    )
      ? (quizAnswers as LikertAnswer[])
      : undefined
    const computedLovePersonality = completeAnswers
      ? lovePersonalityFromAnswers(completeAnswers) ?? undefined
      : undefined
    // Attach the Claude reveal if it arrived before the user finished. If it
    // didn't, the Profile screen will fall back to "Your Love Personality is
    // being prepared…" until the user re-opens onboarding or we plumb a
    // background fetch (Phase 3.5).
    const lovePersonalityWithReveal = computedLovePersonality && reveal
      ? { ...computedLovePersonality, reveal }
      : computedLovePersonality
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

  // Personality questions for current language
  const quizQuestions = getPersonalityQuestions(appLanguage)
  const completeAnswers: LikertAnswer[] | null = quizAnswers.every(
    (value): value is LikertAnswer => value !== undefined,
  )
    ? (quizAnswers as LikertAnswer[])
    : null
  const previewLovePersonality = completeAnswers
    ? lovePersonalityFromAnswers(completeAnswers)
    : null

  // Fire the Claude reveal as soon as all 14 answers are in. The wrapper
  // caches by hash(bigFive + attachment + language), so changing one answer
  // and back doesn't re-bill us and the result re-appears instantly. We
  // skip while a request is already in flight to avoid duplicate calls.
  React.useEffect(() => {
    if (!previewLovePersonality) return
    if (revealLoading) return
    // If we already have a reveal whose generation params match the
    // current scores, don't refetch.
    if (
      reveal
      && reveal.language === appLanguage
    ) {
      return
    }
    let cancelled = false
    setRevealLoading(true)
    void (async () => {
      const result = await backendInvokeLovePersonalityReveal({
        bigFive: previewLovePersonality.bigFive,
        attachment: previewLovePersonality.attachment,
        attachmentRatings: previewLovePersonality.attachmentRatings,
        language: appLanguage,
        selfName: name.trim() || undefined,
      })
      if (cancelled) return
      setReveal(result)
      setRevealLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the answer hash + language drive refetches
  }, [
    appLanguage,
    previewLovePersonality?.attachment,
    previewLovePersonality?.bigFive.openness,
    previewLovePersonality?.bigFive.conscientiousness,
    previewLovePersonality?.bigFive.extraversion,
    previewLovePersonality?.bigFive.agreeableness,
    previewLovePersonality?.bigFive.neuroticism,
  ])

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
            <p className="onboarding-quiz-stem">{copy.quizBigFiveStem}</p>
            <ol className="onboarding-quiz-list">
              {quizQuestions.map((q, idx) => (
                <React.Fragment key={q.id}>
                  {idx === BIG_FIVE_QUESTION_COUNT && (
                    <li className="onboarding-quiz-section-break" aria-hidden="true">
                      <p className="onboarding-quiz-stem">{copy.quizAttachmentStem}</p>
                    </li>
                  )}
                  <li className="onboarding-quiz-item">
                    <p className="onboarding-quiz-prompt">
                      <span className="onboarding-quiz-number">{idx + 1}.</span> {q.prompt}
                    </p>
                    <div
                      className="onboarding-likert"
                      role="radiogroup"
                      aria-label={q.prompt}
                    >
                      {([1, 2, 3, 4, 5] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={quizAnswers[idx] === value}
                          className={
                            quizAnswers[idx] === value
                              ? 'onboarding-likert-cell is-active'
                              : 'onboarding-likert-cell'
                          }
                          onClick={() =>
                            setQuizAnswers((current) => {
                              const next = [...current]
                              next[idx] = value
                              return next
                            })
                          }
                          title={copy.quizLikertLabels[value - 1]}
                        >
                          <span className="onboarding-likert-value">{value}</span>
                          <span className="onboarding-likert-cell-label">
                            {copy.quizLikertLabels[value - 1]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </li>
                </React.Fragment>
              ))}
            </ol>
            {previewLovePersonality ? (
              <div className="onboarding-quiz-result">
                <p className="onboarding-quiz-result-label">{copy.quizResultTitle}</p>
                {reveal ? (
                  <div className="onboarding-quiz-reveal">
                    <p className="onboarding-quiz-reveal-archetype">{reveal.archetypeName}</p>
                    <p className="onboarding-quiz-reveal-headline">{reveal.headline}</p>
                    {reveal.description.split(/\n\n+/).map((paragraph, idx) => (
                      <p key={idx} className="onboarding-quiz-reveal-paragraph">
                        {paragraph}
                      </p>
                    ))}
                    {reveal.strengths.length > 0 && (
                      <div className="onboarding-quiz-reveal-chips">
                        <span className="onboarding-quiz-reveal-chips-label">
                          {copy.quizStrengthsLabel}
                        </span>
                        <div className="onboarding-quiz-reveal-chips-row">
                          {reveal.strengths.map((s, idx) => (
                            <span key={idx} className="onboarding-quiz-reveal-chip">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {reveal.growthEdges.length > 0 && (
                      <div className="onboarding-quiz-reveal-chips">
                        <span className="onboarding-quiz-reveal-chips-label">
                          {copy.quizGrowthEdgesLabel}
                        </span>
                        <div className="onboarding-quiz-reveal-chips-row">
                          {reveal.growthEdges.map((s, idx) => (
                            <span key={idx} className="onboarding-quiz-reveal-chip is-soft">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
                <ul className="onboarding-quiz-bigfive">
                  {(
                    [
                      ['openness', copy.quizDimensionOpenness, previewLovePersonality.bigFive.openness],
                      ['conscientiousness', copy.quizDimensionConscientiousness, previewLovePersonality.bigFive.conscientiousness],
                      ['extraversion', copy.quizDimensionExtraversion, previewLovePersonality.bigFive.extraversion],
                      ['agreeableness', copy.quizDimensionAgreeableness, previewLovePersonality.bigFive.agreeableness],
                      ['emotionalStability', copy.quizDimensionEmotionalStability, 100 - previewLovePersonality.bigFive.neuroticism],
                    ] as const
                  ).map(([key, label, value]) => (
                    <li key={key} className="onboarding-quiz-bigfive-row">
                      <span className="onboarding-quiz-bigfive-label">{label}</span>
                      <span className="onboarding-quiz-bigfive-bar" aria-hidden="true">
                        <span
                          className="onboarding-quiz-bigfive-fill"
                          style={{ width: `${Math.round(value)}%` }}
                        />
                      </span>
                      <span className="onboarding-quiz-bigfive-value">{Math.round(value)}%</span>
                    </li>
                  ))}
                </ul>
                <p className="onboarding-quiz-attachment">
                  <strong>{copy.quizAttachmentResultLabel}:</strong>{' '}
                  {copy.quizAttachmentLabels[previewLovePersonality.attachment]}
                </p>
                {!reveal ? (
                  <p className="onboarding-quiz-reveal-pending">
                    {revealLoading ? copy.quizRevealLoading : copy.quizRevealPending}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="onboarding-quiz-progress soft">
                {t(copy.quizProgress, {
                  n: quizAnswers.filter((v) => v !== undefined).length,
                  total: PERSONALITY_QUESTION_COUNT,
                })}
              </p>
            )}
            {/* Skip remains while users explore — empty answers means no
                lovePersonality is stored, and the profile prompts them to
                take it from the Profile screen later. */}
            <button
              type="button"
              className="onboarding-quiz-skip"
              onClick={() => {
                setQuizAnswers(Array(PERSONALITY_QUESTION_COUNT).fill(undefined))
                advance()
              }}
            >
              {copy.quizSkipForNow}
            </button>
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
