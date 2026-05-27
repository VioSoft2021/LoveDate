import React from 'react'
import './SelfieVerification.css'
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera'
import { UI_TEXT } from '../constants'
import {
  backendSubmitVerification,
  backendUploadVerificationSelfie,
} from '../services/backendApi'
import type { AppLanguage } from '../domain'

// Selfie-pose verification capture (anti-fake, 2026-05-27).
//
// Uses the NATIVE camera via @capacitor/camera — NOT the WebView's
// getUserMedia. Evidence (Samsung logcat: "media.default_video_capture_
// Device isn't registered or is empty") showed the WebView's video
// capture registry is broken on real devices, so getUserMedia could
// never open the camera. The native camera (Camera2/CameraX through the
// plugin) talks to the OS camera directly and sidesteps that entirely.
//
// Liveness: getPhoto with source=Camera forces the device camera (no
// gallery). The user reads a random pose prompt first, then the native
// camera opens for a single shot. Master reviews the selfie + pose by
// hand in the Moderation Center.

type Props = {
  appLanguage: AppLanguage
  onClose: () => void
  onSubmitted: () => void
}

type Phase = 'intro' | 'preview' | 'submitting' | 'done' | 'error'

const pickPose = (poses: readonly string[]): string =>
  poses[Math.floor(Math.random() * poses.length)] ?? poses[0]

export const SelfieVerification: React.FC<Props> = ({ appLanguage, onClose, onSubmitted }) => {
  const t = UI_TEXT[appLanguage].verification
  const [phase, setPhase] = React.useState<Phase>('intro')
  const [pose] = React.useState<string>(() => pickPose(t.poses))
  const [captured, setCaptured] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string>('')

  // Open the NATIVE camera for a single front-facing shot. Returns a
  // data URL we can upload directly. Cancelling the camera just returns
  // to the intro card; a real permission/hardware failure shows the
  // error state.
  const openCamera = async () => {
    setErrorMsg('')
    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
        resultType: CameraResultType.DataUrl,
        quality: 85,
        allowEditing: false,
        saveToGallery: false,
        correctOrientation: true,
      })
      if (photo.dataUrl) {
        setCaptured(photo.dataUrl)
        setPhase('preview')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // The plugin throws "User cancelled photos app" when the user
      // backs out of the camera — that's not an error, just return.
      if (/cancel/i.test(msg)) {
        return
      }
      setErrorMsg(/denied|permission/i.test(msg) ? t.cameraDenied : t.cameraFailed)
      setPhase('error')
    }
  }

  const submit = async () => {
    if (!captured) return
    setPhase('submitting')
    setErrorMsg('')
    try {
      const path = await backendUploadVerificationSelfie(captured)
      if (!path) {
        setErrorMsg(t.uploadFailed)
        setPhase('error')
        return
      }
      await backendSubmitVerification(pose, path)
      setPhase('done')
      onSubmitted()
    } catch {
      setErrorMsg(t.uploadFailed)
      setPhase('error')
    }
  }

  return (
    <div className="selfie-verify-overlay" role="dialog" aria-modal="true" aria-label={t.introTitle}>
      <div className="selfie-verify-card">
        {phase === 'intro' ? (
          <>
            <h2 className="selfie-verify-title">{t.introTitle}</h2>
            <p className="selfie-verify-body">{t.introBody}</p>
            <div className="selfie-verify-pose">
              <span className="selfie-verify-pose-label">{t.poseLabel}</span>
              <strong>{pose}</strong>
            </div>
            <div className="selfie-verify-actions">
              <button type="button" className="selfie-verify-primary" onClick={() => void openCamera()}>
                {t.start}
              </button>
              <button type="button" className="selfie-verify-ghost" onClick={onClose}>
                {t.cancel}
              </button>
            </div>
          </>
        ) : null}

        {phase === 'preview' && captured ? (
          <>
            <div className="selfie-verify-pose selfie-verify-pose--compact">
              <span className="selfie-verify-pose-label">{t.poseLabel}</span>
              <strong>{pose}</strong>
            </div>
            <div className="selfie-verify-stage">
              <img className="selfie-verify-shot" src={captured} alt="" />
            </div>
            <div className="selfie-verify-actions">
              <button type="button" className="selfie-verify-primary" onClick={() => void submit()}>
                {t.use}
              </button>
              <button type="button" className="selfie-verify-ghost" onClick={() => void openCamera()}>
                {t.retake}
              </button>
            </div>
          </>
        ) : null}

        {phase === 'submitting' ? (
          <p className="selfie-verify-body selfie-verify-center">{t.submitting}</p>
        ) : null}

        {phase === 'done' ? (
          <>
            <h2 className="selfie-verify-title">{t.submittedTitle}</h2>
            <p className="selfie-verify-body">{t.submittedBody}</p>
            <div className="selfie-verify-actions">
              <button type="button" className="selfie-verify-primary" onClick={onClose}>
                {t.close}
              </button>
            </div>
          </>
        ) : null}

        {phase === 'error' ? (
          <>
            <p className="selfie-verify-body selfie-verify-error">{errorMsg}</p>
            <div className="selfie-verify-actions">
              <button type="button" className="selfie-verify-primary" onClick={() => void openCamera()}>
                {t.start}
              </button>
              <button type="button" className="selfie-verify-ghost" onClick={onClose}>
                {t.close}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
