import React from 'react'
import './SelfieVerification.css'
import { UI_TEXT } from '../constants'
import {
  backendSubmitVerification,
  backendUploadVerificationSelfie,
} from '../services/backendApi'
import type { AppLanguage } from '../domain'

// Selfie-pose verification capture (anti-fake, 2026-05-27).
//
// The whole point is LIVENESS: the selfie must come from the live
// camera (getUserMedia), never a gallery pick — otherwise a fake just
// uploads another AI image. We show a random pose prompt, open the
// front camera, capture a single frame to a canvas, and upload it to
// the private verification-selfies bucket + record a pending request.
// Master reviews it by hand in the Moderation Center.

type Props = {
  appLanguage: AppLanguage
  onClose: () => void
  onSubmitted: () => void
}

type Phase = 'intro' | 'camera' | 'preview' | 'submitting' | 'done' | 'error'

const pickPose = (poses: readonly string[]): string =>
  poses[Math.floor(Math.random() * poses.length)] ?? poses[0]

export const SelfieVerification: React.FC<Props> = ({ appLanguage, onClose, onSubmitted }) => {
  const t = UI_TEXT[appLanguage].verification
  const [phase, setPhase] = React.useState<Phase>('intro')
  const [pose] = React.useState<string>(() => pickPose(t.poses))
  const [captured, setCaptured] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string>('')

  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)

  const stopStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  // Tear the camera down on unmount no matter how we leave.
  React.useEffect(() => stopStream, [stopStream])

  const openCamera = async () => {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      setPhase('camera')
      // The <video> mounts with the 'camera' phase; attach on next tick.
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      }, 0)
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      setErrorMsg(name === 'NotAllowedError' ? t.cameraDenied : t.cameraFailed)
      setPhase('error')
    }
  }

  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const w = video.videoWidth || 720
    const h = video.videoHeight || 960
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Mirror back to natural orientation (the preview is mirrored for UX).
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCaptured(dataUrl)
    stopStream()
    setPhase('preview')
  }

  const retake = () => {
    setCaptured(null)
    void openCamera()
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

  const close = () => {
    stopStream()
    onClose()
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
              <button type="button" className="selfie-verify-ghost" onClick={close}>
                {t.cancel}
              </button>
            </div>
          </>
        ) : null}

        {phase === 'camera' ? (
          <>
            <div className="selfie-verify-pose selfie-verify-pose--compact">
              <span className="selfie-verify-pose-label">{t.poseLabel}</span>
              <strong>{pose}</strong>
            </div>
            <div className="selfie-verify-stage">
              <video ref={videoRef} className="selfie-verify-video" playsInline muted />
            </div>
            <div className="selfie-verify-actions">
              <button type="button" className="selfie-verify-primary" onClick={capture}>
                {t.capture}
              </button>
              <button type="button" className="selfie-verify-ghost" onClick={close}>
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
              <button type="button" className="selfie-verify-ghost" onClick={retake}>
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
              <button type="button" className="selfie-verify-primary" onClick={close}>
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
              <button type="button" className="selfie-verify-ghost" onClick={close}>
                {t.close}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
