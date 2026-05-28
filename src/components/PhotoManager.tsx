import React from 'react'
import { UI_TEXT } from '../constants'
import { formatUiText } from '../utils'
import { backendInvokePhotoCoach, type AiPhotoCoachResult } from '../services/ai/photoCoach'
import type {
  AppLanguage,
  PhotoStudioAnalysis,
  PhotoStudioControls,
  SelfProfile,
} from '../domain'
import type { toProfileDraft } from '../persistence'

// PhotoManager — the photo upload + crop/adjust experience, extracted
// out of the cramped inline-in-ProfileScreen layout (2026-05-28) into a
// self-contained component rendered full-screen by PhotoStudioScreen.
//
// Two states, each owning the whole viewport (no scroll-fighting):
//   • MANAGER: the photo grid (reorder / set primary / remove) + add
//     controls (upload / URL) + the AI Photo Coach panel.
//   • EDITOR (when photoStudioSource is set): the crop preview fills the
//     stage, adjustments live in a scrollable strip, and a STICKY bottom
//     bar keeps Add / Reset / Cancel always in thumb reach.
//
// All the heavy lifting still lives in usePhotoStudio (passed in as
// props). Photo Coach state is local here since no other surface uses it.

type ProfileDraft = ReturnType<typeof toProfileDraft>

export type PhotoManagerProps = {
  appLanguage: AppLanguage
  selfProfile: SelfProfile
  profileDraft: ProfileDraft
  // photo studio (from usePhotoStudio)
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
}

export const PhotoManager: React.FC<PhotoManagerProps> = ({
  appLanguage,
  selfProfile,
  profileDraft,
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
}) => {
  const copy = UI_TEXT[appLanguage]
  const isFree = photoStudioControls.cropAspect === 'free'

  // AI Photo Coach — local state (only this surface uses it).
  const [photoCoachResult, setPhotoCoachResult] = React.useState<AiPhotoCoachResult | null>(null)
  const [photoCoachLoading, setPhotoCoachLoading] = React.useState(false)
  const [photoCoachError, setPhotoCoachError] = React.useState<string | null>(null)
  // Adjustments (brightness/contrast/etc.) tucked behind a disclosure so
  // the editor isn't a wall of sliders on a phone.
  const [showAdjust, setShowAdjust] = React.useState(false)

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
        selfProfile: { name: selfProfile.name, age: selfProfile.age, vibe: selfProfile.vibe },
        language: appLanguage,
      })
      if (!result) {
        setPhotoCoachError(copy.profile.photoCoachError)
        setPhotoCoachResult(null)
      } else {
        // Aesthetics only — does NOT award the Verified badge (that's the
        // live selfie-pose check). An AI face scores high here.
        setPhotoCoachResult(result)
      }
    } catch {
      setPhotoCoachError(copy.profile.photoCoachError)
      setPhotoCoachResult(null)
    } finally {
      setPhotoCoachLoading(false)
    }
  }, [profileDraft.photos, selfProfile.name, selfProfile.age, selfProfile.vibe, appLanguage, copy.profile])

  // ── EDITOR STATE ──────────────────────────────────────────────────
  if (photoStudioSource) {
    return (
      <div className="photo-editor">
        <div
          ref={studioFrameRef}
          className={
            isFree
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
              transform: isFree
                ? 'none'
                : `translate(${photoStudioControls.offsetX}px, ${photoStudioControls.offsetY}px) scale(${photoStudioControls.zoom}) rotate(${photoStudioControls.rotate}deg)`,
              objectFit: isFree ? 'fill' : 'cover',
              filter: `brightness(${photoStudioControls.brightness}%) contrast(${photoStudioControls.contrast}%) saturate(${photoStudioControls.saturate}%)`,
            }}
          />
          {isFree && (
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

        <div className="photo-editor-controls">
          <div className="studio-sliders">
            <label>
              {copy.profile.studioCrop}
              <select
                value={photoStudioControls.cropAspect}
                onChange={(event) =>
                  setPhotoStudioControls((current) => ({
                    ...current,
                    cropAspect: event.target.value as PhotoStudioControls['cropAspect'],
                  }))
                }
              >
                <option value="free">{copy.profile.studioCropFree}</option>
                <option value="portrait">{copy.profile.studioCropPortrait}</option>
                <option value="classic">{copy.profile.studioCropClassic}</option>
                <option value="square">{copy.profile.studioCropSquare}</option>
              </select>
            </label>

            {isFree && (
              <p className="studio-hint soft">{copy.profile.studioFreeHint}</p>
            )}

            {!isFree && (
              <>
                <label>
                  {copy.profile.studioZoom}
                  <input
                    type="range"
                    min={1}
                    max={2.5}
                    step={0.05}
                    value={photoStudioControls.zoom}
                    onChange={(event) =>
                      setPhotoStudioControls((current) => ({ ...current, zoom: Number(event.target.value) }))
                    }
                  />
                </label>
                <label>
                  {copy.profile.studioRotate}
                  <input
                    type="range"
                    min={-20}
                    max={20}
                    step={1}
                    value={photoStudioControls.rotate}
                    onChange={(event) =>
                      setPhotoStudioControls((current) => ({ ...current, rotate: Number(event.target.value) }))
                    }
                  />
                </label>
              </>
            )}

            {isFree && (
              <button
                type="button"
                className="ghost"
                onClick={() => setIsRedrawCropMode((current) => !current)}
              >
                {isRedrawCropMode ? copy.profile.studioRedrawCancel : copy.profile.studioRedraw}
              </button>
            )}

            <button
              type="button"
              className="ghost photo-adjust-toggle"
              aria-expanded={showAdjust}
              onClick={() => setShowAdjust((v) => !v)}
            >
              {showAdjust ? copy.profile.studioAdjustHide : copy.profile.studioAdjustShow}
            </button>

            {showAdjust && (
              <>
                <label>
                  {copy.profile.studioBrightness}
                  <input
                    type="range"
                    min={70}
                    max={140}
                    step={1}
                    value={photoStudioControls.brightness}
                    onChange={(event) =>
                      setPhotoStudioControls((current) => ({ ...current, brightness: Number(event.target.value) }))
                    }
                  />
                </label>
                <label>
                  {copy.profile.studioContrast}
                  <input
                    type="range"
                    min={70}
                    max={150}
                    step={1}
                    value={photoStudioControls.contrast}
                    onChange={(event) =>
                      setPhotoStudioControls((current) => ({ ...current, contrast: Number(event.target.value) }))
                    }
                  />
                </label>
                <label>
                  {copy.profile.studioSaturation}
                  <input
                    type="range"
                    min={70}
                    max={150}
                    step={1}
                    value={photoStudioControls.saturate}
                    onChange={(event) =>
                      setPhotoStudioControls((current) => ({ ...current, saturate: Number(event.target.value) }))
                    }
                  />
                </label>
                {!isFree && (
                  <>
                    <label>
                      {copy.profile.studioHorizontal}
                      <input
                        type="range"
                        min={-220}
                        max={220}
                        step={1}
                        value={photoStudioControls.offsetX}
                        onChange={(event) =>
                          setPhotoStudioControls((current) => ({ ...current, offsetX: Number(event.target.value) }))
                        }
                      />
                    </label>
                    <label>
                      {copy.profile.studioVertical}
                      <input
                        type="range"
                        min={-220}
                        max={220}
                        step={1}
                        value={photoStudioControls.offsetY}
                        onChange={(event) =>
                          setPhotoStudioControls((current) => ({ ...current, offsetY: Number(event.target.value) }))
                        }
                      />
                    </label>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sticky action bar — always in thumb reach, no scrolling to find it. */}
        <div className="photo-editor-actionbar">
          <button type="button" className="ghost" onClick={closePhotoStudio}>
            {copy.profile.studioCancel}
          </button>
          <button type="button" className="ghost" onClick={resetPhotoStudioControls}>
            {copy.profile.studioReset}
          </button>
          <button type="button" className="primary" onClick={applyPhotoStudio} disabled={photoStudioBusy}>
            {photoStudioBusy ? copy.profile.studioProcessing : copy.profile.studioUsePhoto}
          </button>
        </div>
      </div>
    )
  }

  // ── MANAGER STATE ─────────────────────────────────────────────────
  return (
    <div className="photo-manager">
      <div className="photo-manager-add">
        <label className="upload-field photo-manager-upload">
          <span className="photo-manager-upload-cta">{copy.profile.uploadPhoto}</span>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} />
        </label>
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
      </div>

      {profileDraft.photos.length > 0 ? (
        <div className="draft-photo-grid">
          {profileDraft.photos.map((photo, index) => (
            <div key={`${photo}-${index}`} className="draft-photo-item">
              <img src={photo} alt={`Profile ${index + 1}`} loading="lazy" decoding="async" />
              <div className="draft-photo-actions">
                {index === 0 ? (
                  <span className="draft-photo-primary-badge">{copy.profile.primaryPhoto}</span>
                ) : (
                  <button
                    type="button"
                    className="mini-btn ghost"
                    onClick={() => setPrimaryDraftPhoto(index)}
                  >
                    {copy.profile.setAsPrimary}
                  </button>
                )}
                <button type="button" className="mini-btn" onClick={() => removeDraftPhoto(photo)}>
                  {copy.profile.removePhoto}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="photo-manager-empty soft">{copy.profile.noPhotosYet}</p>
      )}

      <div className="photo-coach-block">
        <div className="photo-coach-actions">
          <button
            type="button"
            className="ghost photo-coach-cta"
            onClick={() => void runPhotoCoach()}
            disabled={photoCoachLoading || profileDraft.photos.length === 0}
          >
            {photoCoachLoading ? copy.profile.photoCoachLoading : copy.profile.photoCoachCta}
          </button>
          {photoCoachError ? (
            <button type="button" className="mini-btn" onClick={() => void runPhotoCoach()}>
              {copy.profile.photoCoachRetry}
            </button>
          ) : null}
        </div>
        {photoCoachError ? <p className="photo-coach-error soft">{photoCoachError}</p> : null}
        {photoCoachResult ? (
          <div className="photo-coach-result">
            <p className="photo-coach-overall">
              <strong>{copy.profile.photoCoachOverall}:</strong> {photoCoachResult.overall}
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
                      entry.index === photoCoachResult.primaryPick ? 'is-primary-pick' : ''
                    }`}
                  >
                    <div className="photo-coach-photo-thumb">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={formatUiText(copy.profile.photoCoachPhotoLabel, { index: entry.index + 1 })}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>
                    <div className="photo-coach-photo-body">
                      <p className="photo-coach-photo-head">
                        <strong>
                          {formatUiText(copy.profile.photoCoachPhotoLabel, { index: entry.index + 1 })}
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
    </div>
  )
}
