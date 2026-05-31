import { useCallback, useEffect, useRef, useState } from 'react'

type UseVoiceRecorderOptions = {
  // Fires once with the recorded clip as a base64 data URL (audio/webm).
  onComplete: (dataUrl: string) => void
  // Fires with a user-facing message on permission denial / read failure.
  onError?: (message: string) => void
  // Hard cap so a forgotten recording can't run forever. Default 30s.
  maxMs?: number
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(blob)
  })

// Microphone recording via the WebView's MediaRecorder. This is the SAME
// proven path the chat voice-note feature ships with (App.tsx startVoiceRecording)
// — audio getUserMedia works on-device (RECORD_AUDIO is in the manifest); only
// *video* capture needed the native workaround (see SelfieVerification). Returns
// the clip as a data URL so callers can upload it through the existing photo
// storage pipeline.
export const useVoiceRecorder = ({ onComplete, onError, maxMs = 30000 }: UseVoiceRecorderOptions) => {
  const [isRecording, setIsRecording] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }, [])

  const start = useCallback(async () => {
    if (isRecording) {
      stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        clearTimer()
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        setIsRecording(false)
        if (blob.size === 0) return
        void blobToDataUrl(blob)
          .then(onComplete)
          .catch(() => onError?.('Could not read the recording. Please try again.'))
      }
      recorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      timerRef.current = window.setTimeout(() => stop(), maxMs)
    } catch {
      onError?.('Microphone permission is needed to record a voice note.')
    }
  }, [isRecording, maxMs, onComplete, onError, stop])

  // Stop a live recording if the component unmounts mid-record.
  useEffect(() => {
    return () => {
      clearTimer()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
    }
  }, [])

  return { isRecording, start, stop }
}
