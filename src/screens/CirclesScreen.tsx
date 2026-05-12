import React from 'react'
import { UI_TEXT } from '../constants'
import { formatShortTime } from '../utils'
import type { AppLanguage, Circle, CirclePost } from '../domain'

export type CirclesScreenProps = {
  appLanguage: AppLanguage
  circleSearch: string
  setCircleSearch: (value: string) => void
  filteredCircles: Circle[]
  joinedCircleIds: string[]
  selectedCircle: Circle | null
  setSelectedCircleId: (id: string) => void
  toggleCircleJoin: (circleId: string) => void
  circleRsvps: Record<string, boolean>
  toggleCircleRsvp: (eventId: string) => void
  circlePostDraft: string
  setCirclePostDraft: (value: string) => void
  publishCirclePost: () => void
  selectedCirclePosts: CirclePost[]
}

export const CirclesScreen: React.FC<CirclesScreenProps> = ({
  appLanguage,
  circleSearch,
  setCircleSearch,
  filteredCircles,
  joinedCircleIds,
  selectedCircle,
  setSelectedCircleId,
  toggleCircleJoin,
  circleRsvps,
  toggleCircleRsvp,
  circlePostDraft,
  setCirclePostDraft,
  publishCirclePost,
  selectedCirclePosts,
}) => {
  const copy = UI_TEXT[appLanguage]

  return (
    <section className="settings-screen circles-screen" aria-label={copy.circles.community}>
      <article className="profile-settings circles-list-panel">
        <h2>{copy.circles.title}</h2>
        <p className="soft">{copy.circles.subtitle}</p>
        <label>
          {copy.circles.search}
          <input
            type="text"
            value={circleSearch}
            onChange={(event) => setCircleSearch(event.target.value)}
            placeholder={copy.circles.searchPlaceholder}
          />
        </label>
        <div className="notification-list circles-list">
          {filteredCircles.map((circle) => {
            const joined = joinedCircleIds.includes(circle.id)
            return (
              <button
                key={circle.id}
                type="button"
                className={`chat-item ${selectedCircle?.id === circle.id ? 'active' : ''}`}
                onClick={() => setSelectedCircleId(circle.id)}
              >
                <div className="chat-item-body">
                  <div className="chat-meta">
                    <strong>{circle.name}</strong>
                    <span>
                      {circle.memberCount + (joined ? 1 : 0)} {copy.circles.members}
                    </span>
                  </div>
                  <div className="chat-status">
                    <small>{joined ? copy.circles.joined : copy.circles.explore}</small>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </article>
      <article className="profile-settings circles-detail-panel">
        {selectedCircle ? (
          <>
            <div className="circles-hero">
              <img
                src={selectedCircle.hero}
                alt={`${selectedCircle.name} cover`}
                loading="lazy"
                decoding="async"
              />
              <div className="circles-hero-overlay">
                <h3>{selectedCircle.name}</h3>
                <p>{selectedCircle.theme}</p>
              </div>
            </div>
            <p>{selectedCircle.description}</p>
            <div className="chips">
              {selectedCircle.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div className="summary-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => toggleCircleJoin(selectedCircle.id)}
              >
                {joinedCircleIds.includes(selectedCircle.id)
                  ? copy.circles.leaveCircle
                  : copy.circles.joinCircle}
              </button>
            </div>
            <h3>{copy.circles.upcomingEvents}</h3>
            <div className="circles-events">
              {selectedCircle.events.map((eventItem) => (
                <div key={eventItem.id} className="circles-event-card">
                  <p>
                    <strong>{eventItem.title}</strong>
                  </p>
                  <p>
                    {eventItem.when} {'•'} {eventItem.where}
                  </p>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => toggleCircleRsvp(eventItem.id)}
                  >
                    {circleRsvps[eventItem.id] ? copy.circles.rsvpSaved : copy.circles.rsvp}
                  </button>
                </div>
              ))}
            </div>
            <h3>{copy.circles.feed}</h3>
            <label>
              {copy.circles.sharePrompt}
              <textarea
                rows={3}
                value={circlePostDraft}
                onChange={(event) => setCirclePostDraft(event.target.value)}
                placeholder={copy.circles.sharePlaceholder}
              />
            </label>
            <div className="summary-actions">
              <button type="button" onClick={publishCirclePost}>
                {copy.circles.publishPost}
              </button>
            </div>
            <div className="notification-list circles-posts">
              {selectedCirclePosts.length === 0 ? (
                <p className="soft">{copy.circles.noPosts}</p>
              ) : (
                selectedCirclePosts.map((post) => (
                  <div key={post.id} className="notification-item">
                    <strong>{post.author}</strong>
                    <span>{post.text}</span>
                    <small>{formatShortTime(post.createdAt)}</small>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <p className="soft">{copy.circles.noCirclesFound}</p>
        )}
      </article>
    </section>
  )
}
