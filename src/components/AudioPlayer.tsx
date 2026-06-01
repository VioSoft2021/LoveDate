// src/components/AudioPlayer.tsx
//
// A small custom audio player (play/pause + seek + time) used for voice
// messages, the profile voice intro, and the recorder preview. Uses a NATIVE
// <audio> with NO `controls`, so the browser/WebView never renders its native
// control bar or its three-dot overflow menu (Playback speed / Download) —
// which on the Android WebView showed up as a broken grey popup. Fully
// self-styled in Privé navy + gold.
import React, { useRef, useState } from 'react'
import './AudioPlayer.css'

type AudioPlayerProps = {
  src: string
  className?: string
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, className }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
    } else {
      audio.pause()
    }
  }

  const syncDuration = () => {
    const audio = audioRef.current
    if (audio && Number.isFinite(audio.duration)) setDuration(audio.duration)
  }

  const onSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio || duration <= 0) return
    const next = (Number(event.target.value) / 100) * duration
    audio.currentTime = next
    setCurrent(next)
  }

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0

  return (
    <div className={`audio-player${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="audio-player-btn"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        )}
      </button>
      <input
        type="range"
        className="audio-player-seek"
        min={0}
        max={100}
        step={0.1}
        value={pct}
        onChange={onSeek}
        aria-label="Seek"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
      />
      <span className="audio-player-time">
        {formatTime(current)} / {formatTime(duration)}
      </span>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadStart={() => {
          // Reset transport state when the source changes (e.g. re-record).
          setPlaying(false)
          setCurrent(0)
          setDuration(0)
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setCurrent(0)
        }}
        onTimeUpdate={() => {
          const audio = audioRef.current
          if (audio) setCurrent(audio.currentTime)
        }}
        onLoadedMetadata={syncDuration}
        onDurationChange={syncDuration}
      />
    </div>
  )
}
