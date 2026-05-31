import { useState } from 'react'
import './VoiceNoteRecorder.css'
import type { AppLanguage } from '../domain'
import { backendUploadVoiceNote } from '../services/backendApi'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'

const LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    title: 'Voice intro',
    hint: 'A 10–30s hello — let them hear the real you.',
    record: 'Record',
    stop: 'Stop',
    recording: 'Recording…',
    saving: 'Saving…',
    rerecord: 'Re-record',
    remove: 'Remove',
    micError: 'Microphone permission is needed to record a voice note.',
    saveError: 'Could not save the voice note. Please try again.',
  },
  ro: {
    title: 'Mesaj vocal',
    hint: 'Un salut de 10–30s — lasă-i să te audă pe bune.',
    record: 'Înregistrează',
    stop: 'Oprește',
    recording: 'Se înregistrează…',
    saving: 'Se salvează…',
    rerecord: 'Reînregistrează',
    remove: 'Elimină',
    micError: 'E nevoie de permisiune pentru microfon ca să înregistrezi.',
    saveError: 'Nu am putut salva mesajul vocal. Încearcă din nou.',
  },
}

type VoiceNoteRecorderProps = {
  appLanguage: AppLanguage
  value: string | undefined
  onChange: (url: string | null) => void
}

// Profile voice-note control: record (WebView MediaRecorder via useVoiceRecorder)
// → upload (backendUploadVoiceNote) → hand the public URL to onChange. Playback
// is a native <audio> element. Self-contained + bilingual.
export const VoiceNoteRecorder = ({ appLanguage, value, onChange }: VoiceNoteRecorderProps) => {
  const t = LABELS[appLanguage] ?? LABELS.en
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { isRecording, start } = useVoiceRecorder({
    onComplete: async (dataUrl) => {
      setSaving(true)
      try {
        const url = await backendUploadVoiceNote(dataUrl)
        if (url) onChange(url)
        else setError(t.saveError)
      } finally {
        setSaving(false)
      }
    },
    onError: () => setError(t.micError),
  })

  const record = () => {
    setError(null)
    void start()
  }

  const recordLabel = isRecording ? t.stop : saving ? t.saving : t.record

  return (
    <div className="voice-note">
      <div className="voice-note-head">
        <strong>{t.title}</strong>
        <span className="soft">{t.hint}</span>
      </div>
      {value ? (
        <div className="voice-note-player">
          <audio controls src={value} preload="none" />
          <div className="voice-note-actions">
            <button type="button" className="ghost" onClick={record} disabled={saving}>
              {isRecording ? t.stop : t.rerecord}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => onChange(null)}
              disabled={saving || isRecording}
            >
              {t.remove}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`voice-note-record ${isRecording ? 'is-recording' : ''}`}
          onClick={record}
          disabled={saving}
        >
          <span className="voice-note-dot" aria-hidden="true" />
          {recordLabel}
        </button>
      )}
      {isRecording ? <span className="voice-note-status">{t.recording}</span> : null}
      {error ? <span className="voice-note-status voice-note-error">{error}</span> : null}
    </div>
  )
}
