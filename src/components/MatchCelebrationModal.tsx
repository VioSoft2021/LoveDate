import React from 'react'
import type { AppLanguage } from '../domain'
import type { Profile } from '../services/loveDateApi'

export type MatchCelebrationModalProps = {
  match: Profile | null
  appLanguage: AppLanguage
  onDismiss: () => void
  onOpenChat: () => void
}

// "It's a match" overlay shown after a mutual right-swipe. Two
// dismiss paths: Keep Swiping (just closes) and Open Chat (jumps to
// the new thread). The parent wires onOpenChat to setActiveChatId +
// clearLightbox + navigate('chats'). Returns null when match is null
// so the parent renders it unconditionally.
export const MatchCelebrationModal: React.FC<MatchCelebrationModalProps> = ({
  match,
  appLanguage,
  onDismiss,
  onOpenChat,
}) => {
  if (!match) return null
  const ro = appLanguage === 'ro'
  return (
    <div
      className="match-modal"
      role="dialog"
      aria-modal="true"
      aria-label={ro ? 'Potrivire găsită' : 'Match found'}
    >
      <article className="match-card">
        <p className="pill">{ro ? 'Este o potrivire' : "It's a match"}</p>
        <h2>
          {ro
            ? `Tu și ${match.name} v-ați apreciat reciproc`
            : `You and ${match.name} liked each other`}
        </h2>
        <p>
          {ro
            ? 'Trimite un mesaj acum sau continuă să descoperi profile.'
            : 'Send a message now or keep swiping.'}
        </p>
        <div className="match-actions">
          <button type="button" className="ghost" onClick={onDismiss}>
            {ro ? 'Continuă descoperirea' : 'Keep Swiping'}
          </button>
          <button type="button" onClick={onOpenChat}>
            {ro ? 'Deschide chatul' : 'Open Chat'}
          </button>
        </div>
      </article>
    </div>
  )
}
