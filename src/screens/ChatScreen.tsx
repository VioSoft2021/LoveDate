import React from 'react'
import './ChatScreen.css'
import { UI_TEXT, ZODIAC_EMOJI, getZodiacDescription } from '../constants'
import { formatShortTime, formatUiText } from '../utils'
import type {
  AppLanguage,
  ChatMessage,
  ChemistryInsights,
  DatePlan,
} from '../domain'
import type { Profile } from '../services/priveApi'
import type { AttachmentStyle, BigFiveScores, LovePersonality } from '../services/compatibility'

type ChatPreview = {
  profile: Profile
  lastText: string
  lastTime: string
  unread: number
}

const ATTACHMENT_LABELS: Record<AppLanguage, Record<AttachmentStyle, string>> = {
  en: { secure: 'Secure', anxious: 'Anxious', avoidant: 'Avoidant', disorganized: 'Disorganized' },
  ro: { secure: 'Sigur', anxious: 'Anxios', avoidant: 'Evitant', disorganized: 'Dezorganizat' },
}

export type ChatScreenProps = {
  appLanguage: AppLanguage
  chatSearch: string
  setChatSearch: (value: string) => void
  filteredChatPreviews: ChatPreview[]
  activeChatId: number | null
  setActiveChatId: (id: number | null) => void
  selectedChatProfile: Profile | null
  selectedChatChemistry: ChemistryInsights | null
  selectedChatBigFive: BigFiveScores | null
  selectedChatAttachment: AttachmentStyle | null
  // Tier B (2026-05-26) — self Love Personality, used to gate the
  // "Your dynamic →" chip in the chat header: chip only appears when
  // BOTH sides have completed the Tier A quiz, so tapping it actually
  // takes the user to a populated Pair Dynamic section in ProfileDetail.
  selfLovePersonality: LovePersonality | null
  selectedChatMessages: ChatMessage[]
  hiddenChatMessageCount: number
  revealOlderMessages: () => void
  messagesContainerRef: React.RefObject<HTMLDivElement | null>
  handleMessagesScroll: (event: React.UIEvent<HTMLDivElement>) => void
  aiCoachSuggestions: string[]
  aiCoachLoading: boolean
  generateAiCoachSuggestions: () => void
  clearAiCoachSuggestions: () => void
  aiDatePlans: DatePlan[]
  aiDatePlannerLoading: boolean
  generateAiDatePlans: () => void
  clearAiDatePlans: () => void
  chatDraft: string
  setChatDraft: (value: string) => void
  chatAttachmentDraft: ChatMessage['attachment'] | null
  setChatAttachmentDraft: (value: ChatMessage['attachment'] | null) => void
  attachmentInputRef: React.RefObject<HTMLInputElement | null>
  handleAttachmentPick: (event: React.ChangeEvent<HTMLInputElement>) => void
  isRecordingVoice: boolean
  startVoiceRecording: () => void | Promise<void>
  sendChatMessage: () => void
  openProfileDetail: (profileId: number, source: 'chats' | 'activity') => void
  onStartCall: (type: 'audio' | 'video') => void
  /** Surfaces the audio/video call actions. Gated OFF until the free P2P
   *  WebRTC call flow is wired in (Phase 2) so users don't hit a broken call. */
  callsEnabled: boolean
}

const ChatScreenInner: React.FC<ChatScreenProps> = ({
  appLanguage,
  chatSearch,
  setChatSearch,
  filteredChatPreviews,
  activeChatId,
  setActiveChatId,
  selectedChatProfile,
  selectedChatChemistry,
  selectedChatBigFive,
  selectedChatAttachment,
  selfLovePersonality,
  selectedChatMessages,
  hiddenChatMessageCount,
  revealOlderMessages,
  messagesContainerRef,
  handleMessagesScroll,
  aiCoachSuggestions,
  aiCoachLoading,
  generateAiCoachSuggestions,
  clearAiCoachSuggestions,
  aiDatePlans,
  aiDatePlannerLoading,
  generateAiDatePlans,
  clearAiDatePlans,
  chatDraft,
  setChatDraft,
  chatAttachmentDraft,
  setChatAttachmentDraft,
  attachmentInputRef,
  handleAttachmentPick,
  isRecordingVoice,
  startVoiceRecording,
  sendChatMessage,
  openProfileDetail,
  onStartCall,
  callsEnabled,
}) => {
  const copy = UI_TEXT[appLanguage]
  const composerInputRef = React.useRef<HTMLInputElement | null>(null)
  const [chatToolsOpen, setChatToolsOpen] = React.useState(false)
  React.useEffect(() => {
    setChatToolsOpen(false)
  }, [activeChatId])

  // Header overflow menu (View profile / Audio call / Video call).
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false)
  const headerMenuRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    setHeaderMenuOpen(false)
  }, [activeChatId])
  React.useEffect(() => {
    if (!headerMenuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setHeaderMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHeaderMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [headerMenuOpen])

  // Phone-vs-desktop detection for layout. On phone we render ONLY the
  // active pane (list OR thread, never both) so the back button works
  // reliably via React unmount instead of CSS display:none. On desktop
  // both panes render side-by-side in the chats-layout grid as before.
  const [isPhone, setIsPhone] = React.useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 768px)').matches
      : false,
  )
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(max-width: 768px)')
    const handler = (event: MediaQueryListEvent) => setIsPhone(event.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  const showList = !isPhone || !activeChatId
  const showThread = !isPhone || Boolean(activeChatId)

  const applyDraftAndFocus = (text: string) => {
    setChatDraft(text)
    // After React commits the new draft, scroll the composer into view
    // and focus it so the user sees the tapped suggestion landed.
    window.requestAnimationFrame(() => {
      const node = composerInputRef.current
      if (node) {
        node.scrollIntoView({ block: 'center', behavior: 'smooth' })
        node.focus()
      }
    })
  }

  return (
    <section
      className="chats-layout"
      data-mobile-view={activeChatId ? 'thread' : 'list'}
    >
      {showList && (
        <article className="chat-list">
          <div className="chat-tools">
            <input
              type="text"
              placeholder={copy.chats.searchPlaceholder}
              aria-label={copy.chats.searchPlaceholder}
              value={chatSearch}
              onChange={(event) => setChatSearch(event.target.value)}
            />
          </div>
          {filteredChatPreviews.map((preview) => (
            <button
              key={preview.profile.id}
              type="button"
              className={`chat-item ${activeChatId === preview.profile.id ? 'active' : ''}`}
              onClick={() => setActiveChatId(preview.profile.id)}
            >
              <div className="chat-avatar-wrap">
                <img
                  className="chat-avatar"
                  src={preview.profile.photos[0]}
                  alt={preview.profile.name}
                  loading="lazy"
                  decoding="async"
                />
                <span className="chat-online-dot" aria-hidden="true" />
              </div>
              <div className="chat-item-body">
                <div className="chat-meta">
                  <strong>{preview.profile.name}</strong>
                  <span>{preview.lastText}</span>
                </div>
                <div className="chat-status">
                  <small>{preview.lastTime}</small>
                  {preview.unread > 0 ? <span className="badge-count">{preview.unread}</span> : null}
                </div>
              </div>
            </button>
          ))}
        </article>
      )}
      {showThread && (
      <article className={`chat-thread${chatToolsOpen ? ' chat-thread--tools-open' : ''}`}>
        {selectedChatProfile ? (
          <>
            <header>
              <button
                type="button"
                className="chat-back-btn"
                aria-label={copy.a11y.backToChats}
                onClick={() => setActiveChatId(null)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="chat-header-profile">
                <div className="chat-avatar-wrap">
                  <img
                    className="chat-avatar"
                    src={selectedChatProfile.photos[0]}
                    alt={selectedChatProfile.name}
                    decoding="async"
                    fetchPriority="high"
                  />
                  <span className="chat-online-dot" aria-hidden="true" />
                </div>
                <div>
                  <h2>{selectedChatProfile.name}</h2>
                  <p className="chat-presence">{copy.chats.online}</p>
                </div>
              </div>
              <div className="chat-header-actions">
                {isPhone ? (
                  <button
                    type="button"
                    className={`chat-icon-btn chat-tools-toggle${chatToolsOpen ? ' is-active' : ''}`}
                    aria-label={copy.a11y.toggleAiTools}
                    aria-pressed={chatToolsOpen}
                    onClick={() => setChatToolsOpen((open) => !open)}
                    title={copy.a11y.toggleAiTools}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.6" fill="none" />
                    </svg>
                  </button>
                ) : null}
                <div className="chat-header-menu-wrap" ref={headerMenuRef}>
                  <button
                    type="button"
                    className={`chat-icon-btn chat-more-options${headerMenuOpen ? ' is-active' : ''}`}
                    aria-label={copy.chats.moreOptions}
                    aria-haspopup="menu"
                    aria-expanded={headerMenuOpen}
                    onClick={() => setHeaderMenuOpen((open) => !open)}
                    title={copy.chats.moreOptions}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
                      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                      <circle cx="12" cy="19" r="1.8" fill="currentColor" />
                    </svg>
                  </button>
                  {headerMenuOpen ? (
                    <div className="chat-header-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className="chat-header-menu-item"
                        onClick={() => {
                          setHeaderMenuOpen(false)
                          openProfileDetail(selectedChatProfile.id, 'chats')
                        }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" fill="none" />
                          <path d="M5.5 19.5c0-3.3 2.9-5.6 6.5-5.6s6.5 2.3 6.5 5.6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                        </svg>
                        {copy.discover.viewFullProfile}
                      </button>
                      {callsEnabled ? (
                        <>
                          <button
                            type="button"
                            role="menuitem"
                            className="chat-header-menu-item"
                            onClick={() => {
                              setHeaderMenuOpen(false)
                              onStartCall('audio')
                            }}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.7 21 3 13.3 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.2 2.2z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
                            </svg>
                            {copy.chats.audioCallLabel}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="chat-header-menu-item"
                            onClick={() => {
                              setHeaderMenuOpen(false)
                              onStartCall('video')
                            }}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <rect x="3" y="7" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                              <path d="M15 11l5-3v8l-5-3z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                            </svg>
                            {copy.chats.videoCallLabel}
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </header>
            <section className="chat-compatibility-panel" aria-label={copy.chats.compatibility}>
              <p className="compatibility-score">
                {copy.discover.chemistry}: {selectedChatChemistry?.chemistryScore ?? 0}% {'•'}{' '}
                {copy.discover.cognitiveOverlap}:{' '}
                {selectedChatChemistry?.cognitiveOverlapScore ?? 0}% {'•'} {copy.chats.zodiac}:{' '}
                {selectedChatChemistry?.zodiacAligned ? copy.discover.aligned : copy.discover.neutral}
              </p>
              {selectedChatAttachment ? (
                <p className="chat-compatibility-line">
                  <strong>{copy.chats.type}:</strong>{' '}
                  {ATTACHMENT_LABELS[appLanguage][selectedChatAttachment]}
                </p>
              ) : null}
              <p className="chat-compatibility-line">
                <strong>{copy.chats.zodiac}:</strong> {selectedChatProfile.zodiac}{' '}
                {ZODIAC_EMOJI[selectedChatProfile.zodiac] ?? ''} {'•'}{' '}
                {getZodiacDescription(selectedChatProfile.zodiac, appLanguage)?.overview ??
                  copy.chats.uniqueCosmicSignature}
              </p>
              {selectedChatBigFive ? (
                <p className="chat-compatibility-line">
                  <strong>{copy.chats.cognitive}:</strong>{' '}
                  O {Math.round(selectedChatBigFive.openness)}% {'•'}{' '}
                  C {Math.round(selectedChatBigFive.conscientiousness)}% {'•'}{' '}
                  E {Math.round(selectedChatBigFive.extraversion)}% {'•'}{' '}
                  A {Math.round(selectedChatBigFive.agreeableness)}% {'•'}{' '}
                  S {Math.round(100 - selectedChatBigFive.neuroticism)}%
                </p>
              ) : null}
              {/* Tier B (2026-05-26) — Pair Dynamic teaser chip. Only
                  surfaces when both sides have completed Tier A so the
                  tap-through actually lands on a populated reveal
                  section in ProfileDetail. */}
              {selectedChatBigFive
                && selectedChatAttachment
                && selfLovePersonality?.bigFive
                && selfLovePersonality?.attachment ? (
                  <button
                    type="button"
                    className="chat-pair-dynamic-chip"
                    onClick={() => openProfileDetail(selectedChatProfile.id, 'chats')}
                    aria-label={copy.profile.pairDynamicTitle}
                  >
                    <span className="chat-pair-dynamic-chip-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="14" height="14">
                        <path
                          d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4zm-5 0c0-5 4-9 9-9s9 4 9 9-4 9-9 9"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="chat-pair-dynamic-chip-label">
                      {copy.profile.pairDynamicTitle}
                    </span>
                    <span className="chat-pair-dynamic-chip-chevron" aria-hidden="true">→</span>
                  </button>
                ) : null}
            </section>
            <section className="chat-ai-coach" aria-label={copy.chats.aiCoach}>
              <div className="chat-ai-coach-head">
                <p className="compatibility-score">{copy.chats.aiCoach}</p>
                <button
                  type="button"
                  className="ghost"
                  onClick={generateAiCoachSuggestions}
                  disabled={aiCoachLoading}
                >
                  {aiCoachLoading ? copy.chats.thinking : copy.chats.generateSuggestions}
                </button>
                {aiCoachSuggestions.length > 0 ? (
                  <button
                    type="button"
                    className="chat-ai-dismiss"
                    onClick={clearAiCoachSuggestions}
                    aria-label={copy.chats.closeSuggestions}
                    title={copy.chats.closeSuggestions}
                  >
                    ×
                  </button>
                ) : null}
              </div>
              {aiCoachSuggestions.length > 0 ? (
                <div className="chat-ai-suggestion-list">
                  {aiCoachSuggestions.map((suggestion, index) => (
                    <button
                      key={`${index}-${suggestion.slice(0, 18)}`}
                      type="button"
                      className="chat-ai-suggestion"
                      onClick={() => applyDraftAndFocus(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="soft">{copy.chats.coachEmpty}</p>
              )}
            </section>
            <section className="chat-date-planner" aria-label={copy.chats.aiPlanner}>
              <div className="chat-date-planner-head">
                <p className="compatibility-score">{copy.chats.aiPlanner}</p>
                <button
                  type="button"
                  className="ghost"
                  onClick={generateAiDatePlans}
                  disabled={aiDatePlannerLoading}
                >
                  {aiDatePlannerLoading ? copy.chats.planning : copy.chats.planDate}
                </button>
                {aiDatePlans.length > 0 ? (
                  <button
                    type="button"
                    className="chat-ai-dismiss"
                    onClick={clearAiDatePlans}
                    aria-label={copy.chats.closePlans}
                    title={copy.chats.closePlans}
                  >
                    ×
                  </button>
                ) : null}
              </div>
              {aiDatePlans.length > 0 ? (
                <div className="chat-date-plan-list">
                  {aiDatePlans.map((plan) => (
                    <article key={plan.id} className="chat-date-plan-card">
                      <div className="chat-date-plan-top">
                        <strong>{plan.title}</strong>
                        <span className="chat-date-plan-budget">{plan.budget}</span>
                      </div>
                      <p className="chat-date-plan-meta">
                        {plan.placeType} {'•'} {plan.duration}
                      </p>
                      <p className="chat-date-plan-pitch">{plan.pitch}</p>
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => applyDraftAndFocus(plan.message)}
                      >
                        {copy.chats.useMessage}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="soft">{copy.chats.plannerEmpty}</p>
              )}
            </section>
            {hiddenChatMessageCount > 0 ? (
              <div className="messages-toolbar">
                <button type="button" className="ghost mini-btn" onClick={revealOlderMessages}>
                  {formatUiText(copy.chats.olderMessages, { count: hiddenChatMessageCount })}
                </button>
              </div>
            ) : null}
            <div ref={messagesContainerRef} className="messages" onScroll={handleMessagesScroll}>
              {selectedChatMessages.map((message) => (
                <p key={message.id} className={`msg ${message.sender}`}>
                  {message.text}
                  {message.attachment?.kind === 'image' ? (
                    <img
                      className="msg-media"
                      src={message.attachment.url}
                      alt={message.attachment.name}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  {message.attachment?.kind === 'video' ? (
                    <video
                      className="msg-media"
                      src={message.attachment.url}
                      controls
                      controlsList="nodownload noplaybackrate noremoteplayback"
                      disablePictureInPicture
                    />
                  ) : null}
                  {message.attachment?.kind === 'audio' ? (
                    <audio
                      className="msg-audio"
                      src={message.attachment.url}
                      controls
                      controlsList="nodownload noplaybackrate noremoteplayback"
                    />
                  ) : null}
                  <span>
                    {formatShortTime(message.createdAt)}
                    {message.sender === 'me' ? ` | ${message.status ?? 'sent'}` : ''}
                  </span>
                </p>
              ))}
            </div>
            {chatAttachmentDraft ? (
              <div className="chat-attachment-preview">
                <strong>{copy.chats.attachmentReady}</strong> {chatAttachmentDraft.name}
                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => setChatAttachmentDraft(null)}
                >
                  {copy.chats.remove}
                </button>
              </div>
            ) : null}
            <form
              className="chat-input"
              onSubmit={(event) => {
                event.preventDefault()
                sendChatMessage()
              }}
            >
              <input
                ref={composerInputRef}
                type="text"
                placeholder={copy.chats.typeMessage}
                aria-label={copy.chats.typeMessage}
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
              />
              <input
                ref={attachmentInputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={handleAttachmentPick}
              />
              <button
                type="button"
                className="chat-icon-btn"
                aria-label={copy.chats.attachMedia}
                onClick={() => attachmentInputRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21.4 11.2l-8.9 8.9a5 5 0 0 1-7.1-7.1l9.5-9.5a3.5 3.5 0 1 1 5 5l-9.8 9.8a2 2 0 1 1-2.8-2.8l8.8-8.8" />
                </svg>
              </button>
              <button
                type="button"
                className={`chat-icon-btn ${isRecordingVoice ? 'danger' : ''}`}
                aria-label={isRecordingVoice ? copy.chats.stopRecording : copy.chats.recordVoice}
                onClick={() => void startVoiceRecording()}
              >
                {isRecordingVoice ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="7" y="7" width="10" height="10" rx="1.8" ry="1.8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="12" rx="3" ry="3" />
                    <path d="M5 11a7 7 0 0 0 14 0" />
                    <path d="M12 18v3" />
                    <path d="M8 21h8" />
                  </svg>
                )}
              </button>
              <button type="submit" className="chat-send-btn" aria-label={copy.chats.send}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22l-4-9-9-4z" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <section className="state-box">
            <p className="pill">{copy.chats.noChat}</p>
            <h1>{copy.chats.selectMatch}</h1>
          </section>
        )}
      </article>
      )}
    </section>
  )
}

export const ChatScreen = React.memo(ChatScreenInner)
