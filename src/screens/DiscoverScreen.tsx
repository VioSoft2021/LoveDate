import React from 'react'
import { UI_TEXT, ZODIAC_EMOJI, initialFilters, translateInterest } from '../constants'
import { buildHighResImageUrl } from '../utils'
import { compatibilityFromAnswers } from '../services/compatibility'
import type {
  AppLanguage,
  ChemistryInsights,
  Filters,
  MatchAnalysis,
  SelfProfile,
  SwipeIntent,
} from '../domain'
import type { Profile } from '../services/loveDateApi'

export type DiscoverScreenProps = {
  appLanguage: AppLanguage
  selfProfile: SelfProfile
  filteredProfiles: Profile[]
  matchedProfiles: Profile[]
  topProfile: Profile | null
  upcoming: Profile[]
  topProfileMatchAnalysis: MatchAnalysis | null
  topProfileChemistry: ChemistryInsights | null
  // usage / counters
  likeUsage: { used: number; limit: number | null; remaining: number | null }
  superLikeUsage: { used: number; limit: number | null; remaining: number | null }
  boostsLeft: number
  setBoostsLeft: React.Dispatch<React.SetStateAction<number>>
  // load state
  loadingProfiles: boolean
  loadError: string | null
  showingNoResults: boolean
  showingDeckCompletion: boolean
  loadProfiles: () => Promise<void> | void
  // swipe deck
  isDragging: boolean
  isResolvingSwipe: boolean
  likeLimitReached: boolean
  superLikeLimitReached: boolean
  lastIntent: SwipeIntent | null
  rightBadgeOpacity: number
  leftBadgeOpacity: number
  swipeCard: (direction: 'left' | 'right', intent?: SwipeIntent) => void
  handlePointerDown: (event: React.PointerEvent<HTMLElement>) => void
  handlePointerMove: (event: React.PointerEvent<HTMLElement>) => void
  handlePointerUp: (event: React.PointerEvent<HTMLElement>) => void
  handlePointerCancel: (event: React.PointerEvent<HTMLElement>) => void
  getCardStyle: () => React.CSSProperties
  getDiscoverCardBackground: (profile: Profile, tone?: 'front' | 'back') => string
  getCompatibilityScore: (profile: Profile) => number
  // resets / clears
  setFilters: (filters: Filters) => void
  setIndex: React.Dispatch<React.SetStateAction<number>>
  setHistory: (value: { likedIds: number[]; passedIds: number[]; matchIds: number[] }) => void
  setSwipeLog: (value: never[]) => void
  setChatThreads: (value: Record<number, never>) => void
  setUnreadChats: (value: Record<number, number>) => void
  setMatchQueueIds: (value: number[]) => void
  setActiveChatId: (value: number | null) => void
  // navigation + side effects
  navigate: (screen: 'filters') => void
  openProfileDetail: (profileId: number, source: 'discover') => void
  pushToast: (message: string, tone: 'info' | 'success' | 'error') => void
  pushNotification: (item: {
    title: string
    body: string
    category: 'system' | 'match' | 'message' | 'safety'
  }) => void
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  appLanguage,
  selfProfile,
  filteredProfiles,
  matchedProfiles,
  topProfile,
  upcoming,
  topProfileMatchAnalysis,
  topProfileChemistry,
  likeUsage,
  superLikeUsage,
  boostsLeft,
  setBoostsLeft,
  loadingProfiles,
  loadError,
  showingNoResults,
  showingDeckCompletion,
  loadProfiles,
  isDragging,
  isResolvingSwipe,
  likeLimitReached,
  superLikeLimitReached,
  lastIntent,
  rightBadgeOpacity,
  leftBadgeOpacity,
  swipeCard,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  getCardStyle,
  getDiscoverCardBackground,
  getCompatibilityScore,
  setFilters,
  setIndex,
  setHistory,
  setSwipeLog,
  setChatThreads,
  setUnreadChats,
  setMatchQueueIds,
  setActiveChatId,
  navigate,
  openProfileDetail,
  pushToast,
  pushNotification,
}) => {
  const copy = UI_TEXT[appLanguage]
  const ro = appLanguage === 'ro'

  return (
    <section className="discover-main-only discover-redesign" aria-label="Discover cards and actions">
      <section className="discover-metrics" aria-label={copy.discover.summary}>
        <div className="discover-kpis">
          <div className="discover-kpi">
            <strong className="discover-kpi-value">{filteredProfiles.length}</strong>
            <span className="discover-kpi-label">{copy.discover.inDeck}</span>
          </div>
          <div className="discover-kpi">
            <strong className="discover-kpi-value">{matchedProfiles.length}</strong>
            <span className="discover-kpi-label">{copy.discover.matches}</span>
          </div>
          <div className="discover-kpi">
            <strong className="discover-kpi-value">
              {likeUsage.limit === null || likeUsage.limit === Infinity
                ? '∞'
                : Math.max(0, likeUsage.limit - likeUsage.used)}
            </strong>
            <span className="discover-kpi-label">{copy.discover.likesLeft}</span>
          </div>
          <div className="discover-kpi">
            <strong className="discover-kpi-value">
              {superLikeUsage.limit === null || superLikeUsage.limit === Infinity
                ? '∞'
                : Math.max(0, superLikeUsage.limit - superLikeUsage.used)}
            </strong>
            <span className="discover-kpi-label">{copy.discover.superLikes}</span>
          </div>
        </div>
        <div className="discover-metric-controls">
          <button type="button" className="discover-metric-btn" onClick={() => navigate('filters')}>
            {copy.discover.openFilters}
          </button>
          <button
            type="button"
            className="discover-metric-btn"
            onClick={() => {
              if (boostsLeft <= 0) {
                pushToast(
                  ro ? 'Nu mai ai promovări disponibile momentan.' : 'No boosts left right now.',
                  'error',
                )
                return
              }
              setBoostsLeft((current) => Math.max(0, current - 1))
              setIndex(0)
              pushNotification({
                title: ro ? 'Promovare profil activată' : 'Profile boost activated',
                body: ro
                  ? 'Profilul tău primește vizibilitate extra pentru următoarea oră (demo).'
                  : 'Your profile gets extra visibility for the next hour (demo).',
                category: 'system',
              })
              pushToast(ro ? 'Promovare activată.' : 'Boost activated.', 'success')
            }}
          >
            {copy.discover.boost}
          </button>
          <button
            type="button"
            className="discover-metric-btn"
            onClick={() => setFilters(initialFilters)}
          >
            {copy.common.reset}
          </button>
        </div>
      </section>

      {loadingProfiles && (
        <section className="state-box" aria-live="polite">
          <p className="pill">{copy.common.loading}</p>
          <h1>{copy.discover.findingProfiles}</h1>
        </section>
      )}
      {loadError && !loadingProfiles && (
        <section className="state-box" aria-live="assertive">
          <p className="pill">{copy.common.error}</p>
          <h1>{loadError}</h1>
          <button type="button" onClick={() => void loadProfiles()}>
            {copy.common.retry}
          </button>
        </section>
      )}
      {showingNoResults && !loadError && (
        <section className="state-box" aria-live="polite">
          <p className="pill">{copy.common.noResults}</p>
          <h1>{copy.discover.noProfilesMatch}</h1>
          <div className="summary-actions">
            <button type="button" onClick={() => setFilters(initialFilters)}>
              {copy.discover.resetFilters}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setHistory({ likedIds: [], passedIds: [], matchIds: [] })
                setSwipeLog([])
                setIndex(0)
              }}
            >
              {ro ? 'Reset istoric swipe' : 'Reset swipe history'}
            </button>
          </div>
        </section>
      )}
      {!loadingProfiles && !loadError && topProfile && (
        <section className="discover-stage">
          <div className="discover-deck-column">
            <section className="deck-wrap discover-deck">
              {upcoming
                .slice()
                .reverse()
                .map((profile, reverseIndex) => {
                  const depth = upcoming.length - reverseIndex
                  return (
                    <article
                      key={profile.id}
                      className="profile-card back"
                      style={{
                        background: getDiscoverCardBackground(profile, 'back'),
                        transform: `translateY(${depth * 6}px) scale(${1 - depth * 0.03})`,
                      }}
                    >
                      <p className="mini-label">{copy.discover.upNext}</p>
                      <h2>
                        {profile.name}, {profile.age}
                      </h2>
                      <p>{profile.vibe}</p>
                    </article>
                  )
                })}
              <article
                className={`profile-card front ${isDragging ? 'dragging' : ''}`}
                style={{
                  background: getDiscoverCardBackground(topProfile, 'front'),
                  ...getCardStyle(),
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open ${topProfile.name} full profile`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openProfileDetail(topProfile.id, 'discover')
                  }
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
              >
                <div className="badge like" style={{ opacity: rightBadgeOpacity }}>
                  LIKE
                </div>
                <div className="badge nope" style={{ opacity: leftBadgeOpacity }}>
                  NOPE
                </div>
                {topProfile.photos[0] ? (
                  <div
                    className="card-photo-wrap"
                    style={{
                      // Used by .card-photo-wrap::before in mobile.css to
                      // paint a blurred copy of the photo behind the contained
                      // image — eliminates ugly letterboxing on non-portrait
                      // photos while keeping the full image visible.
                      ['--card-photo-bg' as string]: `url("${buildHighResImageUrl(topProfile.photos[0], 1200, 1)}")`,
                    } as React.CSSProperties}
                  >
                    <img
                      src={buildHighResImageUrl(topProfile.photos[0], 2400, 2)}
                      srcSet={`${buildHighResImageUrl(topProfile.photos[0], 1800, 1)} 1x, ${buildHighResImageUrl(topProfile.photos[0], 3200, 2)} 2x`}
                      sizes="(min-width: 1200px) 1024px, (min-width: 768px) 88vw, 96vw"
                      alt={`${topProfile.name} profile`}
                      className="card-photo"
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                    />
                    <div className="card-photo-overlay">
                      <div className="profile-head">
                        <h1 className="discover-card-name">
                          {topProfile.name}, {topProfile.age}
                        </h1>
                        <p className="discover-presence-line">
                          <span className="discover-status-dot" aria-hidden="true" />
                          {copy.discover.activeNow}
                        </p>
                        <p className="discover-location-line">
                          {'📍'} {topProfile.city} {'•'} {topProfile.distanceKm} km
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="profile-head">
                      <h1 className="discover-card-name">
                        {topProfile.name}, {topProfile.age}
                      </h1>
                      <p className="discover-presence-line">
                        <span className="discover-status-dot" aria-hidden="true" />
                        {copy.discover.activeNow}
                      </p>
                      <p className="discover-location-line">
                        {'📍'} {topProfile.city} {'•'} {topProfile.distanceKm} km
                      </p>
                    </div>
                  </>
                )}
              </article>
            </section>
          </div>
          <aside className="discover-side-panel" aria-label="Profile insights and actions">
            <article className="discover-info-panel">
              <h2 className="discover-side-name">
                {topProfile.name}, {topProfile.age}
              </h2>
              <p className="discover-zodiac-line">
                {copy.discover.zodiac}: {topProfile.zodiac}{' '}
                {ZODIAC_EMOJI[topProfile.zodiac] ?? ''}
              </p>
              <p className="compatibility-score">
                {copy.discover.matchScore}:{' '}
                {topProfileMatchAnalysis?.score ?? getCompatibilityScore(topProfile)}% {'•'}{' '}
                {copy.discover.personality}:{' '}
                {topProfileMatchAnalysis?.personalityScore ??
                  compatibilityFromAnswers(
                    selfProfile.personalityAnswers,
                    topProfile.personalityAnswers,
                  )}
                %
              </p>
              {topProfileChemistry ? (
                <p className="compatibility-score">
                  {copy.discover.chemistry}: {topProfileChemistry.chemistryScore}% {'•'}{' '}
                  {copy.discover.cognitiveOverlap}: {topProfileChemistry.cognitiveOverlapScore}%{' '}
                  {'•'} {copy.discover.zodiac}:{' '}
                  {topProfileChemistry.zodiacAligned ? copy.discover.aligned : copy.discover.neutral}
                </p>
              ) : null}
              <p className="compatibility-score">{topProfileMatchAnalysis?.pairCode}</p>
              {topProfileMatchAnalysis?.reasons?.length ? (
                <ul className="discover-reasons-list">
                  {topProfileMatchAnalysis.reasons.slice(0, 3).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
              {(topProfileMatchAnalysis?.frictionPoints?.length ?? 0) > 0 ||
              (topProfileMatchAnalysis?.tips?.length ?? 0) > 0 ? (
                <details
                  className="discover-deeper-why"
                  onClick={(event) => event.stopPropagation()}
                >
                  <summary>
                    <span className="discover-deeper-why-show">
                      {copy.discover.deeperWhyShow}
                    </span>
                    <span className="discover-deeper-why-hide">
                      {copy.discover.deeperWhyHide}
                    </span>
                  </summary>
                  {(topProfileMatchAnalysis?.frictionPoints?.length ?? 0) > 0 ? (
                    <div className="discover-deeper-section">
                      <em>{copy.discover.frictionPoints}</em>
                      <ul>
                        {topProfileMatchAnalysis!.frictionPoints!.map((point, i) => (
                          <li key={`fp-${i}`}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {(topProfileMatchAnalysis?.tips?.length ?? 0) > 0 ? (
                    <div className="discover-deeper-section">
                      <em>{copy.discover.tips}</em>
                      <ul>
                        {topProfileMatchAnalysis!.tips!.map((tip, i) => (
                          <li key={`tip-${i}`}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </details>
              ) : null}
              <p className="mini-label discover-spotlight-pill">{topProfile.vibe}</p>
              <p className="vibe">{topProfile.vibe}</p>
              <div className="discover-interest-chips">
                {topProfile.interests.slice(0, 3).map((interest) => (
                  <span key={`${topProfile.id}-${interest}`}>
                    {translateInterest(interest, appLanguage)}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="details-link"
                onClick={(event) => {
                  event.stopPropagation()
                  openProfileDetail(topProfile.id, 'discover')
                }}
              >
                {copy.discover.viewFullProfile}
              </button>
            </article>
            <section
              className="actions discover-action-cluster discover-primary-actions"
              aria-label="Swipe actions"
            >
              <button
                type="button"
                className="ghost pass-action"
                onClick={() => swipeCard('left')}
                disabled={!topProfile || isResolvingSwipe}
              >
                {copy.discover.pass}
              </button>
              <button
                type="button"
                className="super super-action"
                onClick={() => swipeCard('right', 'super-like')}
                disabled={
                  !topProfile || isResolvingSwipe || likeLimitReached || superLikeLimitReached
                }
              >
                {copy.discover.superLike}
              </button>
              <button
                type="button"
                className="solid like-action"
                onClick={() => swipeCard('right')}
                disabled={!topProfile || isResolvingSwipe || likeLimitReached}
              >
                {copy.discover.like}
              </button>
            </section>
            <footer className="hint discover-hint">
              <div className="discover-keymap" aria-label={copy.discover.keyboardShortcuts}>
                <span>
                  <b>{'←'}</b> {copy.discover.pass}
                </span>
                <span>
                  <b>{'↑'}</b> {copy.discover.superLike}
                </span>
                <span>
                  <b>{'→'}</b> {copy.discover.like}
                </span>
              </div>
              <p>{copy.discover.undoHint}</p>
              {likeLimitReached && <p className="result">{copy.discover.likeLimitReached}</p>}
              {superLikeLimitReached && (
                <p className="result">{copy.discover.superLikeLimitReached}</p>
              )}
              {isResolvingSwipe && <p className="result">{copy.discover.checkingMatch}</p>}
              {lastIntent && (
                <p className="result">
                  {copy.discover.lastAction}: {lastIntent.replace('-', ' ')}
                </p>
              )}
            </footer>
          </aside>
        </section>
      )}
      {showingDeckCompletion && (
        <section className="match-summary">
          <p className="pill">{copy.discover.deckComplete}</p>
          <h1>{copy.discover.noMoreProfiles}</h1>
          <div className="summary-actions">
            <button type="button" onClick={() => setIndex(0)}>
              {copy.discover.startAgain}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setHistory({ likedIds: [], passedIds: [], matchIds: [] })
                setSwipeLog([])
                setChatThreads({})
                setUnreadChats({})
                setMatchQueueIds([])
                setActiveChatId(null)
                setIndex(0)
              }}
            >
              {copy.discover.clearHistory}
            </button>
          </div>
        </section>
      )}
    </section>
  )
}
