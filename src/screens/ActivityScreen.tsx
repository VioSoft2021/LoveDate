import React from 'react'
import './ActivityScreen.css'
import { UI_TEXT, translateRelationshipIntent } from '../constants'
import type { AppLanguage } from '../domain'
import type { Profile } from '../services/priveApi'

export type ActivityScreenProps = {
  appLanguage: AppLanguage
  likedProfiles: Profile[]
  passedProfiles: Profile[]
  matchedProfiles: Profile[]
  onChatWith: (profileId: number) => void
  onViewProfile: (profileId: number) => void
}

export const ActivityScreen: React.FC<ActivityScreenProps> = ({
  appLanguage,
  likedProfiles,
  passedProfiles,
  matchedProfiles,
  onChatWith,
  onViewProfile,
}) => {
  const copy = UI_TEXT[appLanguage]
  return (
    <section className="activity-layout">
      <section className="activity-overview" aria-label={copy.activity.overview}>
        <p>
          {copy.activity.liked} <strong>{likedProfiles.length}</strong>
        </p>
        <p>
          {copy.activity.passed} <strong>{passedProfiles.length}</strong>
        </p>
        <p>
          {copy.activity.matches} <strong>{matchedProfiles.length}</strong>
        </p>
      </section>

      <article className="list-panel activity-panel activity-panel--matches">
        <h2>{copy.activity.matches}</h2>
        {matchedProfiles.length === 0 ? (
          <p className="soft">{copy.activity.noMatchesYet}</p>
        ) : (
          <ul>
            {matchedProfiles.map((profile) => (
              <li key={profile.id} className="activity-item">
                <div className="activity-item-main">
                  <div className="activity-avatar-wrap">
                    <img
                      className="activity-avatar"
                      src={profile.photos[0]}
                      alt={`${profile.name} avatar`}
                      loading="lazy"
                      decoding="async"
                    />
                    <span
                      className="activity-status-dot activity-status-dot--match"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="activity-item-meta">
                    <strong>{profile.name}</strong>
                    <span>{translateRelationshipIntent(profile.relationshipGoal, appLanguage)}</span>
                  </div>
                </div>
                <button type="button" className="mini-btn" onClick={() => onChatWith(profile.id)}>
                  {copy.activity.chat}
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="list-panel activity-panel">
        <h2>{copy.activity.liked}</h2>
        {likedProfiles.length === 0 ? (
          <p className="soft">{copy.activity.noLikesYet}</p>
        ) : (
          <ul>
            {likedProfiles.map((profile) => (
              <li key={profile.id} className="activity-item">
                <div className="activity-item-main">
                  <div className="activity-avatar-wrap">
                    <img
                      className="activity-avatar"
                      src={profile.photos[0]}
                      alt={`${profile.name} avatar`}
                      loading="lazy"
                      decoding="async"
                    />
                    <span
                      className="activity-status-dot activity-status-dot--liked"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="activity-item-meta">
                    <strong>{profile.name}</strong>
                    <span>{profile.city}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => onViewProfile(profile.id)}
                >
                  {copy.activity.view}
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="list-panel activity-panel">
        <h2>{copy.activity.passed}</h2>
        {passedProfiles.length === 0 ? (
          <p className="soft">{copy.activity.noPassesYet}</p>
        ) : (
          <ul>
            {passedProfiles.map((profile) => (
              <li key={profile.id} className="activity-item">
                <div className="activity-item-main">
                  <div className="activity-avatar-wrap">
                    <img
                      className="activity-avatar"
                      src={profile.photos[0]}
                      alt={`${profile.name} avatar`}
                      loading="lazy"
                      decoding="async"
                    />
                    <span
                      className="activity-status-dot activity-status-dot--passed"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="activity-item-meta">
                    <strong>{profile.name}</strong>
                    <span>{profile.city}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => onViewProfile(profile.id)}
                >
                  {copy.activity.view}
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}
