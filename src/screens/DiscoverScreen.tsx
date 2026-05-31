import React from 'react'
import './DiscoverScreen.css'
import { UI_TEXT, ZODIAC_EMOJI, initialFilters, translateInterest } from '../constants'
import { buildHighResImageUrl } from '../utils'
import { compatibilityFromBigFiveAttachment } from '../services/compatibility'
import { stabilityFromProfiles, type StabilityProfile } from '../services/stability'
import { distanceBetweenCities, formatDistance } from '../services/cityDistance'
import type {
  AppLanguage,
  ChemistryInsights,
  Filters,
  HiddenEntry,
  HiddenReason,
  MatchAnalysis,
  SelfProfile,
  SwipeIntent,
} from '../domain'
import type { Profile } from '../services/priveApi'
import type { StableMatchVerdict } from '../hooks/useStableMatch'

export type DiscoverScreenProps = {
  appLanguage: AppLanguage
  selfProfile: SelfProfile
  /** Guest Tour mode (2026-05-26). When true, the top card carries a
   *  small "Demo" chip so the visitor can't mistake the synthetic
   *  fixture profiles for real registered users. */
  isGuest: boolean
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
  setBlockedProfileIds: React.Dispatch<React.SetStateAction<number[]>>
  // D4 — deck self-diagnosis: list of profiles hidden by the filter
  // cascade with reasons. Lets the deck explain itself.
  hiddenBreakdown: HiddenEntry[]
  // navigation + side effects
  navigate: (screen: 'filters') => void
  openProfileDetail: (profileId: number, source: 'discover') => void
  pushToast: (message: string, tone: 'info' | 'success' | 'error') => void
  pushNotification: (item: {
    title: string
    body: string
    category: 'system' | 'match' | 'message' | 'safety'
  }) => void
  // Phase B (E4) — AI semantic filter status, surfaced as a chip above the
  // deck so the user knows their free-text prompt is actively narrowing
  // the candidate pool (or is currently being evaluated). Optional so
  // existing tests + any other caller don't need to pass them.
  aiFilterStatus?: 'inactive' | 'fetching' | 'active' | 'error'
  aiFilterPrompt?: string
  // 2026-05-30 — second matching lens (Gale-Shapley). Optional so existing
  // test fixtures keep working; when present, renders alongside the AI
  // compatibility score on the top profile.
  stableMatchVerdict?: StableMatchVerdict
  // Self's stability profile (optional). When present alongside the top
  // profile's, the card shows a durability band + reason below the G-S line.
  selfStabilityProfile?: StabilityProfile
}

const DiscoverScreenInner: React.FC<DiscoverScreenProps> = ({
  appLanguage,
  selfProfile,
  isGuest,
  filteredProfiles,
  matchedProfiles,
  topProfile,
  upcoming,
  topProfileMatchAnalysis,
  topProfileChemistry,
  stableMatchVerdict,
  selfStabilityProfile,
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
  setBlockedProfileIds,
  hiddenBreakdown,
  navigate,
  openProfileDetail,
  pushToast,
  pushNotification,
  aiFilterStatus = 'inactive',
  aiFilterPrompt = '',
}) => {
  const copy = UI_TEXT[appLanguage]
  const ro = appLanguage === 'ro'

  // City-pair distance display. Uses the curated Romanian city dataset
  // to compute Haversine distance between selfProfile.city and the
  // other profile's city. Falls back to the legacy Profile.distanceKm
  // (mock data) only if either city is unknown to the dataset — keeps
  // the deck readable for profiles in towns we haven't catalogued yet.
  const displayDistanceTo = (other: Profile): string => {
    const real = distanceBetweenCities(selfProfile.city, other.city)
    if (real !== null) return formatDistance(real, { sameCityLabel: ro ? 'Același oraș' : 'Same city' })
    return `${other.distanceKm} km`
  }

  // D4 — deck self-diagnosis. When the filter cascade hides any profiles,
  // surface the breakdown inline so the user can see exactly who and why,
  // and act on it (reset swipes, reset block list, reset filters).
  const reasonLabel = (reason: HiddenReason): string => {
    if (ro) {
      const map: Record<HiddenReason, string> = {
        blocked: 'blocate',
        age: 'vârstă în afara intervalului',
        city: 'oraș diferit',
        interest: 'fără potrivire pe interese',
        goal: 'intenție de relație diferită',
        distance: 'prea departe',
        'verified-only': 'doar verificate activ',
        'already-swiped': 'deja vizualizate',
        zodiac: 'zodii incompatibile',
      }
      return map[reason]
    }
    const map: Record<HiddenReason, string> = {
      blocked: 'blocked',
      age: 'age range',
      city: 'different city',
      interest: 'no interest match',
      goal: 'different relationship intent',
      distance: 'too far',
      'verified-only': 'verified-only on',
      'already-swiped': 'already swiped',
      zodiac: 'zodiac incompatible',
    }
    return map[reason]
  }

  // Group hidden profiles by their first reason for the breakdown summary.
  const breakdownByReason = (entries: HiddenEntry[]): Map<HiddenReason, string[]> => {
    const grouped = new Map<HiddenReason, string[]>()
    for (const entry of entries) {
      const primary = entry.reasons[0]
      if (!primary) continue
      const list = grouped.get(primary) ?? []
      list.push(entry.profile.name)
      grouped.set(primary, list)
    }
    return grouped
  }

  const renderHiddenPanel = (entries: HiddenEntry[]) => {
    if (entries.length === 0) return null
    const grouped = breakdownByReason(entries)
    return (
      <details className="hidden-breakdown">
        <summary>
          {ro
            ? `ⓘ ${entries.length} ${entries.length === 1 ? 'profil ascuns' : 'profile ascunse'} de filtrele tale — vezi de ce`
            : `ⓘ ${entries.length} profile${entries.length === 1 ? '' : 's'} hidden by your filters — see why`}
        </summary>
        <ul className="hidden-breakdown-list">
          {Array.from(grouped.entries()).map(([reason, names]) => (
            <li key={reason}>
              <strong>{names.length}</strong> {reasonLabel(reason)}
              {names.length > 0 && (
                <span className="hidden-breakdown-names">
                  {' — '}
                  {names.slice(0, 5).join(', ')}
                  {names.length > 5 ? `, +${names.length - 5}` : ''}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="hidden-breakdown-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setHistory({ likedIds: [], passedIds: [], matchIds: [] })
              setSwipeLog([])
              setIndex(0)
            }}
          >
            {ro ? 'Resetează istoricul' : 'Reset swipe history'}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => setBlockedProfileIds([])}
          >
            {ro ? 'Resetează blocările' : 'Reset block list'}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => setFilters(initialFilters)}
          >
            {ro ? 'Resetează filtrele' : 'Reset filters'}
          </button>
        </div>
      </details>
    )
  }

  // Phase B (E4) — AI filter chip. Surfaces when the viewer's free-text
  // preference is actively narrowing the deck. Tap → jump to FilterScreen
  // to edit or clear. Hidden when the filter is inactive or silently failed.
  const aiChipVisible = aiFilterStatus === 'active' || aiFilterStatus === 'fetching'
  const aiChipPromptDisplay =
    aiFilterPrompt.length > 56 ? `${aiFilterPrompt.slice(0, 53)}…` : aiFilterPrompt

  return (
    <section className="discover-main-only discover-redesign" aria-label="Discover cards and actions">
      {aiChipVisible && (
        <button
          type="button"
          className="discover-ai-chip"
          onClick={() => navigate('filters')}
          aria-label={ro ? 'Editează filtrul AI' : 'Edit AI filter'}
        >
          <span className="discover-ai-chip-eyebrow">
            {ro ? 'AI ascultă' : 'AI listening'}
          </span>
          <span aria-hidden="true">&middot;</span>
          <span className="discover-ai-chip-prompt">{aiChipPromptDisplay}</span>
          <span aria-hidden="true">&middot;</span>
          <span className="discover-ai-chip-count">
            {aiFilterStatus === 'fetching'
              ? '…'
              : `${filteredProfiles.length} ${ro ? (filteredProfiles.length === 1 ? 'potrivire' : 'potriviri') : (filteredProfiles.length === 1 ? 'match' : 'matches')}`}
          </span>
        </button>
      )}
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
          {hiddenBreakdown.length > 0 ? (
            // When the breakdown panel is shown it already contains the
            // three reset buttons (Reset history / Reset block list /
            // Reset filters) — no need to duplicate them below.
            renderHiddenPanel(hiddenBreakdown)
          ) : (
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
                {ro ? 'Resetează istoricul' : 'Reset swipe history'}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setBlockedProfileIds([])}
              >
                {ro ? 'Resetează blocările' : 'Reset block list'}
              </button>
            </div>
          )}
        </section>
      )}
      {!loadingProfiles && !loadError && topProfile && hiddenBreakdown.length > 0 && (
        renderHiddenPanel(hiddenBreakdown)
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
                          {topProfile.verified ? (
                            <span
                              className="discover-card-verified"
                              title={appLanguage === 'ro'
                                ? 'Persoană reală — verificat'
                                : 'Real person — verified'}
                              aria-label={appLanguage === 'ro' ? 'Verificat' : 'Verified'}
                            >
                              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                                <path
                                  d="M3.5 8.2l3 3 6-6.4"
                                  stroke="currentColor"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                />
                              </svg>
                            </span>
                          ) : null}
                        </h1>
                        <p className="discover-presence-line">
                          <span className="discover-status-dot" aria-hidden="true" />
                          {copy.discover.activeNow}
                        </p>
                        <p className="discover-location-line">
                          {'📍'} {topProfile.city} {'•'} {displayDistanceTo(topProfile)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="profile-head">
                      <h1 className="discover-card-name">
                        {topProfile.name}, {topProfile.age}
                        {isGuest ? (
                          <span
                            className="discover-card-demo-chip"
                            title={appLanguage === 'ro'
                              ? 'Profil sintetic pentru demonstrație'
                              : 'Synthetic demo profile'}
                          >
                            {appLanguage === 'ro' ? 'Demo' : 'Demo'}
                          </span>
                        ) : null}
                      </h1>
                      <p className="discover-presence-line">
                        <span className="discover-status-dot" aria-hidden="true" />
                        {copy.discover.activeNow}
                      </p>
                      <p className="discover-location-line">
                        {'📍'} {topProfile.city} {'•'} {displayDistanceTo(topProfile)}
                      </p>
                    </div>
                  </>
                )}
              </article>
            </section>
            {/* Swipe actions sit directly under the deck card (2026-05-31) —
                fills the left column and puts the controls right beneath the
                photo (better UX) instead of stranded in the info panel. */}
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
            {(likeLimitReached || superLikeLimitReached || isResolvingSwipe) && (
              <footer className="hint discover-hint">
                {likeLimitReached && <p className="result">{copy.discover.likeLimitReached}</p>}
                {superLikeLimitReached && (
                  <p className="result">{copy.discover.superLikeLimitReached}</p>
                )}
                {isResolvingSwipe && <p className="result">{copy.discover.checkingMatch}</p>}
              </footer>
            )}
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
                  compatibilityFromBigFiveAttachment(
                    selfProfile.lovePersonality?.bigFive ?? null,
                    selfProfile.lovePersonality?.attachment ?? null,
                    topProfile.bigFive ?? null,
                    topProfile.attachmentStyle ?? null,
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
              {/* Second matching lens — Gale-Shapley stable matching across
                  the full pool. Different question than personality
                  compatibility above; we surface both side by side. */}
              {stableMatchVerdict ? (
                <p
                  className="compatibility-score stable-match-line"
                  title={copy.discover.stableMatchExplainer}
                >
                  {copy.discover.stableMatchLabel}:{' '}
                  {stableMatchVerdict.match
                    ? stableMatchVerdict.isStableMatch(topProfile.id)
                      ? <strong>{copy.discover.stableMatchSelfBadge}</strong>
                      : <em>{copy.discover.stableMatchOther}{stableMatchVerdict.match.name}</em>
                    : <em>{copy.discover.stableMatchPending}</em>}
                </p>
              ) : null}
              {/* Stability lens — durability band + reason from the optional
                  Stability Assessment. Shown only when self has taken it;
                  reads as a real verdict when the top profile has too, else a
                  quiet nudge to take it. */}
              {selfStabilityProfile ? (
                <p
                  className="compatibility-score stability-line"
                  title={copy.discover.stabilityExplainer}
                >
                  {copy.discover.stabilityLensLabel}:{' '}
                  {topProfile.stabilityProfile ? (
                    <>
                      <strong>
                        {copy.discover.stabilityBands[
                          stabilityFromProfiles(selfStabilityProfile, topProfile.stabilityProfile).band
                        ]}
                      </strong>
                      {(() => {
                        const verdict = stabilityFromProfiles(
                          selfStabilityProfile,
                          topProfile.stabilityProfile,
                        )
                        const phrases = verdict.drivers
                          .map((d) =>
                            d.polarity === 'positive'
                              ? copy.discover.stabilityDriverPositive[d.key]
                              : copy.discover.stabilityDriverRisk[d.key],
                          )
                          .slice(0, 2)
                        return phrases.length ? <> — {phrases.join(', ')}</> : null
                      })()}
                    </>
                  ) : (
                    <em>{copy.discover.stabilityPendingShort}</em>
                  )}
                </p>
              ) : null}
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

export const DiscoverScreen = React.memo(DiscoverScreenInner)
