import React from 'react'
import { UI_TEXT, ZODIAC_DESCRIPTIONS, ZODIAC_EMOJI } from '../constants'
import { formatShortTime, formatUiText, getCallDurationLabel, getCallOutcomeLabel } from '../utils'
import type {
  AppLanguage,
  CallLogEntry,
  ChatMessage,
  ChemistryInsights,
  DatePlan,
} from '../domain'
import type { Profile } from '../services/loveDateApi'

type ChatPreview = {
  profile: Profile
  lastText: string
  lastTime: string
  unread: number
}

type TypeGuide = { code: string; label: string; summary: string } | null | undefined
type CognitiveFunctions =
  | { primary: string; support: string; tertiary: string; shadow: string }
  | null
  | undefined

export type ChatScreenProps = {
  appLanguage: AppLanguage
  chatSearch: string
  setChatSearch: (value: string) => void
  filteredChatPreviews: ChatPreview[]
  activeChatId: number | null
  setActiveChatId: (id: number | null) => void
  selectedChatProfile: Profile | null
  selectedChatChemistry: ChemistryInsights | null
  selectedChatPersonalityCode: string | null
  selectedChatTypeGuide: TypeGuide
  selectedChatCognitiveFunctions: CognitiveFunctions
  selectedChatMessages: ChatMessage[]
  selectedChatCallHistory: CallLogEntry[]
  hiddenChatMessageCount: number
  revealOlderMessages: () => void
  messagesContainerRef: React.RefObject<HTMLDivElement | null>
  handleMessagesScroll: (event: React.UIEvent<HTMLDivElement>) => void
  aiCoachSuggestions: string[]
  aiCoachLoading: boolean
  generateAiCoachSuggestions: () => void
  aiDatePlans: DatePlan[]
  aiDatePlannerLoading: boolean
  generateAiDatePlans: () => void
  chatDraft: string
  setChatDraft: (value: string) => void
  chatAttachmentDraft: ChatMessage['attachment'] | null
  setChatAttachmentDraft: (value: ChatMessage['attachment'] | null) => void
  attachmentInputRef: React.RefObject<HTMLInputElement | null>
  handleAttachmentPick: (event: React.ChangeEvent<HTMLInputElement>) => void
  isRecordingVoice: boolean
  startVoiceRecording: () => void | Promise<void>
  sendChatMessage: () => void
  rejoinCallFromHistory: (entry: CallLogEntry) => void
  openProfileDetail: (profileId: number, source: 'chats' | 'activity') => void
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  appLanguage,
  chatSearch,
  setChatSearch,
  filteredChatPreviews,
  activeChatId,
  setActiveChatId,
  selectedChatProfile,
  selectedChatChemistry,
  selectedChatPersonalityCode,
  selectedChatTypeGuide,
  selectedChatCognitiveFunctions,
  selectedChatMessages,
  selectedChatCallHistory,
  hiddenChatMessageCount,
  revealOlderMessages,
  messagesContainerRef,
  handleMessagesScroll,
  aiCoachSuggestions,
  aiCoachLoading,
  generateAiCoachSuggestions,
  aiDatePlans,
  aiDatePlannerLoading,
  generateAiDatePlans,
  chatDraft,
  setChatDraft,
  chatAttachmentDraft,
  setChatAttachmentDraft,
  attachmentInputRef,
  handleAttachmentPick,
  isRecordingVoice,
  startVoiceRecording,
  sendChatMessage,
  rejoinCallFromHistory,
  openProfileDetail,
}) => {
  const copy = UI_TEXT[appLanguage]

  return (
    <section className="chats-layout">
      <article className="chat-list">
        <div className="chat-tools">
          <input
            type="text"
            placeholder={copy.chats.searchPlaceholder}
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
      <article className="chat-thread">
        {selectedChatProfile ? (
          <>
            <header>
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
                <button
                  type="button"
                  className="chat-icon-btn"
                  aria-label={copy.chats.moreOptions}
                  onClick={() => openProfileDetail(selectedChatProfile.id, 'chats')}
                  title={copy.discover.viewFullProfile}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>
              </div>
            </header>
            <section className="chat-compatibility-panel" aria-label={copy.chats.compatibility}>
              <p className="compatibility-score">
                {copy.discover.chemistry}: {selectedChatChemistry?.chemistryScore ?? 0}% {'•'}{' '}
                {copy.discover.cognitiveOverlap}:{' '}
                {selectedChatChemistry?.cognitiveOverlapScore ?? 0}% {'•'} {copy.chats.zodiac}:{' '}
                {selectedChatChemistry?.zodiacAligned ? copy.discover.aligned : copy.discover.neutral}
              </p>
              <p className="chat-compatibility-line">
                <strong>{copy.chats.type}:</strong>{' '}
                {selectedChatPersonalityCode ?? copy.chats.unknown}
                {selectedChatTypeGuide ? ` - ${selectedChatTypeGuide.label}` : ''}
              </p>
              <p className="chat-compatibility-line">
                <strong>{copy.chats.zodiac}:</strong> {selectedChatProfile.zodiac}{' '}
                {ZODIAC_EMOJI[selectedChatProfile.zodiac] ?? ''} {'•'}{' '}
                {ZODIAC_DESCRIPTIONS[selectedChatProfile.zodiac]?.overview ??
                  copy.chats.uniqueCosmicSignature}
              </p>
              {selectedChatCognitiveFunctions ? (
                <p className="chat-compatibility-line">
                  <strong>{copy.chats.cognitive}:</strong> {selectedChatCognitiveFunctions.primary}{' '}
                  {'•'} {selectedChatCognitiveFunctions.support}
                </p>
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
              </div>
              {aiCoachSuggestions.length > 0 ? (
                <div className="chat-ai-suggestion-list">
                  {aiCoachSuggestions.map((suggestion, index) => (
                    <button
                      key={`${index}-${suggestion.slice(0, 18)}`}
                      type="button"
                      className="chat-ai-suggestion"
                      onClick={() => setChatDraft(suggestion)}
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
                        onClick={() => setChatDraft(plan.message)}
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
            <section className="chat-call-history" aria-label={copy.chats.recentCalls}>
              <div className="chat-call-history-head">
                <p className="compatibility-score">{copy.chats.recentCalls}</p>
              </div>
              {selectedChatCallHistory.length > 0 ? (
                <div className="chat-call-history-list">
                  {selectedChatCallHistory.map((entry) => (
                    <article key={entry.id} className={`chat-call-history-item ${entry.outcome}`}>
                      <div>
                        <strong>
                          {entry.type === 'video' ? copy.chats.videoCallLabel : copy.chats.audioCallLabel}
                        </strong>
                        <p>
                          {getCallOutcomeLabel(entry.outcome)} {'•'} {formatShortTime(entry.startedAt)}
                          {entry.endedAt
                            ? ` • ${getCallDurationLabel(entry.startedAt, entry.endedAt)}`
                            : ''}
                        </p>
                      </div>
                      <div className="summary-actions">
                        <button
                          type="button"
                          className="ghost mini-btn"
                          onClick={() => rejoinCallFromHistory(entry)}
                        >
                          {copy.chats.rejoin}
                        </button>
                        <button
                          type="button"
                          className="mini-btn"
                          onClick={() =>
                            window.open(entry.roomUrl, '_blank', 'noopener,noreferrer')
                          }
                        >
                          {copy.chats.openRoom}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="soft">{copy.chats.noCallActivity}</p>
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
                  {message.callMeta
                    ? (() => {
                        const callMeta = message.callMeta
                        return (
                          <span className={`msg-call-chip ${callMeta.event}`}>
                            {callMeta.type === 'video' ? copy.chats.videoCallLabel : copy.chats.audioCallLabel}{' '}
                            {callMeta.event}
                          </span>
                        )
                      })()
                    : null}
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
                    <video className="msg-media" src={message.attachment.url} controls />
                  ) : null}
                  {message.attachment?.kind === 'audio' ? (
                    <audio className="msg-audio" src={message.attachment.url} controls />
                  ) : null}
                  {message.callMeta && selectedChatProfile
                    ? (() => {
                        const callMeta = message.callMeta
                        return (
                          <div className="msg-call-actions">
                            <button
                              type="button"
                              className="ghost mini-btn"
                              onClick={() =>
                                rejoinCallFromHistory({
                                  id: `${message.id}-${callMeta.roomId}`,
                                  profileId: selectedChatProfile.id,
                                  profileName: selectedChatProfile.name,
                                  type: callMeta.type,
                                  roomId: callMeta.roomId,
                                  roomUrl: callMeta.roomUrl,
                                  startedAt: message.createdAt,
                                  answeredAt: null,
                                  endedAt: null,
                                  outcome: 'initiated',
                                })
                              }
                            >
                              {copy.chats.joinCall}
                            </button>
                            <button
                              type="button"
                              className="ghost mini-btn"
                              onClick={() =>
                                window.open(callMeta.roomUrl, '_blank', 'noopener,noreferrer')
                              }
                            >
                              {copy.chats.openExternally}
                            </button>
                          </div>
                        )
                      })()
                    : null}
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
                type="text"
                placeholder={copy.chats.typeMessage}
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
    </section>
  )
}
