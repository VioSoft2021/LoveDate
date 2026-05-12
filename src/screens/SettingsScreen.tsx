import React from 'react'
import { SOCIAL_PLATFORM_META, UI_TEXT } from '../constants'
import { formatUiText } from '../utils'
import { formatShortTime } from '../utils'
import { canUsePassport } from '../services/planGate'
import { PLAN_OPTIONS, type PlanTier } from '../spec/lovedateConfig'
import type { SettingsPayload } from '../services/backendApi'
import type {
  AppLanguage,
  NotificationItem,
  SelfProfile,
  SocialPlatform,
} from '../domain'
import type { Profile } from '../services/loveDateApi'
import type { SafetyReport } from '../services/moderation'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type SettingsScreenProps = {
  appLanguage: AppLanguage
  setAppLanguage: (lang: AppLanguage) => void
  settings: SettingsPayload
  settingsSaveStatus: SaveStatus
  preferenceSaveStatus: SaveStatus
  handleSettingsToggle: (key: keyof SettingsPayload, value: boolean) => void
  socialConnectedCount: number
  socialMotivationLine: string
  unreadNotificationCount: number
  selfProfile: SelfProfile
  toggleSocialPromotionOptIn: (value: boolean) => void
  setSocialConnectionDecision: (platform: SocialPlatform, connected: boolean) => void
  shareLoveDateOnPlatform: (platform: SocialPlatform) => Promise<void> | void
  activePlan: PlanTier
  setActivePlan: (plan: PlanTier) => void
  persistActivePlan: (plan: PlanTier) => void
  refreshEngagementUsage: (plan: PlanTier) => void
  likeUsage: { used: number; limit: number | null; remaining: number | null }
  superLikeUsage: { used: number; limit: number | null; remaining: number | null }
  boostsLeft: number
  rewindsLeft: number
  backendMode: string
  notifications: NotificationItem[]
  markAllNotificationsRead: () => void
  blockedProfileIds: number[]
  safetyReports: SafetyReport[]
  profileById: Map<number, Profile>
  isModerationAdmin: boolean
  onOpenModeration: () => void
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  appLanguage,
  setAppLanguage,
  settings,
  settingsSaveStatus,
  preferenceSaveStatus,
  handleSettingsToggle,
  socialConnectedCount,
  socialMotivationLine,
  unreadNotificationCount,
  selfProfile,
  toggleSocialPromotionOptIn,
  setSocialConnectionDecision,
  shareLoveDateOnPlatform,
  activePlan,
  setActivePlan,
  persistActivePlan,
  refreshEngagementUsage,
  likeUsage,
  superLikeUsage,
  boostsLeft,
  rewindsLeft,
  backendMode,
  notifications,
  markAllNotificationsRead,
  blockedProfileIds,
  safetyReports,
  profileById,
  isModerationAdmin,
  onOpenModeration,
}) => {
  const copy = UI_TEXT[appLanguage]

  const formatStatusLabel = (status: SaveStatus): string =>
    ({
      idle: copy.common.idleStatus,
      saving: copy.common.savingStatus,
      saved: copy.common.saveStatus,
      error: copy.common.errorStatus,
    })[status]

  return (
    <section className="settings-screen settings-dashboard">
      <article className="profile-settings settings-hero-card">
        <div className="settings-hero-copy">
          <p className="pill">{copy.settings.controlCenter}</p>
          <h1>{copy.settings.title}</h1>
          <p className="soft">{copy.settings.subtitle}</p>
        </div>
        <div className="settings-status-grid" aria-label="Settings overview">
          <p>
            <strong>{copy.settings.profileSync}</strong>
            <span>{formatStatusLabel(preferenceSaveStatus)}</span>
          </p>
          <p>
            <strong>{copy.settings.settingsSync}</strong>
            <span>{formatStatusLabel(settingsSaveStatus)}</span>
          </p>
          <p>
            <strong>{copy.settings.connectedSocials}</strong>
            <span>{socialConnectedCount}</span>
          </p>
          <p>
            <strong>{copy.settings.unreadAlerts}</strong>
            <span>{unreadNotificationCount}</span>
          </p>
        </div>
      </article>

      <details className="profile-settings settings-card settings-card--preferences" open>
        <summary>{copy.settings.preferences}</summary>
        <label className="setting-row">
          {copy.settings.pushNotifications}
          <input
            type="checkbox"
            checked={settings.pushNotifications}
            onChange={(event) => handleSettingsToggle('pushNotifications', event.target.checked)}
          />
        </label>
        <label className="setting-row">
          {copy.settings.emailNotifications}
          <input
            type="checkbox"
            checked={settings.emailNotifications}
            onChange={(event) => handleSettingsToggle('emailNotifications', event.target.checked)}
          />
        </label>
        <label className="setting-row">
          {copy.settings.privateMode}
          <input
            type="checkbox"
            checked={settings.privateMode}
            onChange={(event) => handleSettingsToggle('privateMode', event.target.checked)}
          />
        </label>
        <p className="soft">
          {formatUiText(copy.settings.syncLine, {
            settings: formatStatusLabel(settingsSaveStatus),
            preferences: formatStatusLabel(preferenceSaveStatus),
          })}
        </p>
        <label className="setting-row">
          {copy.settings.incognitoMode}
          <input
            type="checkbox"
            checked={settings.incognitoMode}
            onChange={(event) => handleSettingsToggle('incognitoMode', event.target.checked)}
          />
        </label>
        <label className="setting-row setting-row--select">
          {copy.settings.appLanguage}
          <select
            value={appLanguage}
            onChange={(event) => setAppLanguage(event.target.value as AppLanguage)}
          >
            <option value="en">{copy.auth.english}</option>
            <option value="ro">{copy.auth.romanian}</option>
          </select>
        </label>
      </details>

      <details className="profile-settings settings-card settings-card--social">
        <summary>Social Connect &amp; Share</summary>
        <p className="soft">{socialMotivationLine}</p>
        <p>
          Connected: <strong>{socialConnectedCount}</strong> / {SOCIAL_PLATFORM_META.length}
        </p>
        <p className="soft">Simple mode: for each platform, users just pick Yes or No.</p>
        <label className="setting-row">
          Prompt me to share LoveDate socially
          <input
            type="checkbox"
            checked={selfProfile.socialPromotionOptIn}
            onChange={(event) => toggleSocialPromotionOptIn(event.target.checked)}
          />
        </label>
        <div className="social-grid">
          {SOCIAL_PLATFORM_META.map((platform) => {
            const entry = selfProfile.socialConnections[platform.id]
            return (
              <article key={platform.id} className="social-item-card">
                <div className="social-item-head">
                  <strong>{platform.label}</strong>
                  <span className={`social-status ${entry.connected ? 'is-connected' : ''}`}>
                    {entry.connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                <label className="setting-row">
                  Connect this account (Yes)
                  <input
                    type="checkbox"
                    checked={entry.connected}
                    onChange={(event) =>
                      setSocialConnectionDecision(platform.id, event.target.checked)
                    }
                  />
                </label>
                <div className="summary-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => void shareLoveDateOnPlatform(platform.id)}
                    disabled={!entry.connected || !selfProfile.socialPromotionOptIn}
                  >
                    Share LoveDate
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </details>

      <details className="profile-settings settings-card settings-card--plan">
        <summary>Plan &amp; Session</summary>
        <div className="plan-picker">
          <label htmlFor="plan-tier">Plan</label>
          <select
            id="plan-tier"
            value={activePlan}
            onChange={(event) => {
              const nextPlan = event.target.value as PlanTier
              setActivePlan(nextPlan)
              persistActivePlan(nextPlan)
              refreshEngagementUsage(nextPlan)
            }}
          >
            {(Object.keys(PLAN_OPTIONS) as PlanTier[]).map((tier) => (
              <option key={tier} value={tier}>
                {tier.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <p>
          Likes used: {likeUsage.used}/{likeUsage.limit === Infinity ? 'Unlimited' : likeUsage.limit}
        </p>
        <p>
          Super Likes used: {superLikeUsage.used}/
          {superLikeUsage.limit === Infinity ? 'Unlimited' : superLikeUsage.limit}
        </p>
        <p>Boosts left: {boostsLeft}</p>
        <p>Rewinds left: {rewindsLeft}</p>
        <p>Passport access: {canUsePassport(activePlan) ? 'Enabled' : 'Upgrade required'}</p>
        <p>Backend mode: {backendMode}</p>
        <p className="soft">Sign out and Exit App live in the top header.</p>
      </details>

      <details className="profile-settings settings-card settings-card--notifications">
        <summary>Notifications</summary>
        {notifications.length === 0 ? <p className="soft">No notifications yet.</p> : null}
        <div className="notification-list">
          {notifications.slice(0, 8).map((item) => (
            <p key={item.id} className={`notification-item ${item.read ? 'read' : ''}`}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
              <small>{formatShortTime(item.createdAt)}</small>
            </p>
          ))}
        </div>
        <button type="button" className="ghost" onClick={markAllNotificationsRead}>
          Mark all as read
        </button>
      </details>

      <details className="profile-settings settings-card settings-card--safety">
        <summary>Safety</summary>
        <p>
          {appLanguage === 'ro' ? 'Profiluri blocate' : 'Blocked profiles'}: {blockedProfileIds.length}
        </p>
        <p>
          {appLanguage === 'ro' ? 'Raportări trimise' : 'Reports submitted'}: {safetyReports.length}
        </p>
        <p>
          {appLanguage === 'ro' ? 'Raportări deschise' : 'Open reports'}:{' '}
          {safetyReports.filter((report) => report.status === 'open').length}
        </p>
        {safetyReports.length > 0 ? (
          <ul>
            {safetyReports.slice(-4).map((report, idx) => {
              const profileName = profileById.get(report.profileId)?.name ?? report.profileName
              return (
                <li key={`${report.id}-${idx}`}>
                  {profileName}: {report.category} ({report.status})
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="soft">
            {appLanguage === 'ro' ? 'Nu există încă raportări de siguranță.' : 'No safety reports yet.'}
          </p>
        )}
        {isModerationAdmin ? (
          <button type="button" className="ghost" onClick={onOpenModeration}>
            {appLanguage === 'ro' ? 'Deschide centrul de moderare' : 'Open Moderation Center'}
          </button>
        ) : null}
      </details>
    </section>
  )
}
