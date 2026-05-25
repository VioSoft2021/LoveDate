import React from 'react'
import './SettingsScreen.css'
import { SOCIAL_PLATFORM_META, UI_TEXT } from '../constants'
import { formatUiText } from '../utils'
import { formatShortTime } from '../utils'
import { canUsePassport } from '../services/planGate'
import { PLAN_OPTIONS, type PlanTier } from '../spec/priveConfig'
import type { SettingsPayload } from '../services/backendApi'
import type {
  AppLanguage,
  NotificationItem,
  SelfProfile,
  SocialPlatform,
} from '../domain'
import type { Profile } from '../services/priveApi'
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
  sharePriveOnPlatform: (platform: SocialPlatform) => Promise<void> | void
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
  /**
   * User-initiated account deletion. Resolves true if the server confirmed
   * deletion (caller has already signed out by then); false on any failure
   * so the UI can re-enable the button and show an error.
   */
  onDeleteAccount: () => Promise<boolean>
}

const SettingsScreenInner: React.FC<SettingsScreenProps> = ({
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
  sharePriveOnPlatform,
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
  onDeleteAccount,
}) => {
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = React.useState('')
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
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
        <p className="soft">
          {formatUiText(copy.settings.syncLine, {
            settings: formatStatusLabel(settingsSaveStatus),
            preferences: formatStatusLabel(preferenceSaveStatus),
          })}
        </p>
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
        <summary>{copy.settings.socialTitle}</summary>
        <p className="soft">{socialMotivationLine}</p>
        <p>
          {formatUiText(copy.settings.socialConnectedCount, {
            count: socialConnectedCount,
            total: SOCIAL_PLATFORM_META.length,
          })}
        </p>
        <p className="soft">{copy.settings.socialSimpleMode}</p>
        <label className="setting-row">
          {copy.settings.socialPromptOptIn}
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
                    {entry.connected
                      ? copy.settings.socialConnected
                      : copy.settings.socialNotConnected}
                  </span>
                </div>
                <label className="setting-row">
                  {copy.settings.socialConnectAccount}
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
                    onClick={() => void sharePriveOnPlatform(platform.id)}
                    disabled={!entry.connected || !selfProfile.socialPromotionOptIn}
                  >
                    {copy.settings.socialShare}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </details>

      <details className="profile-settings settings-card settings-card--plan">
        <summary>{copy.settings.planTitle}</summary>
        <div className="plan-picker">
          <label htmlFor="plan-tier">{copy.settings.planLabel}</label>
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
          {copy.settings.planLikesUsed}: {likeUsage.used}/
          {likeUsage.limit === Infinity ? copy.settings.planUnlimited : likeUsage.limit}
        </p>
        <p>
          {copy.settings.planSuperLikesUsed}: {superLikeUsage.used}/
          {superLikeUsage.limit === Infinity ? copy.settings.planUnlimited : superLikeUsage.limit}
        </p>
        <p>{copy.settings.planBoostsLeft}: {boostsLeft}</p>
        <p>{copy.settings.planRewindsLeft}: {rewindsLeft}</p>
        <p>
          {copy.settings.planPassportAccess}:{' '}
          {canUsePassport(activePlan)
            ? copy.settings.planEnabled
            : copy.settings.planUpgradeRequired}
        </p>
      </details>

      <details className="profile-settings settings-card settings-card--notifications">
        <summary>{copy.settings.notificationsTitle}</summary>
        {notifications.length === 0 ? (
          <p className="soft">{copy.settings.noNotifications}</p>
        ) : null}
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
          {copy.settings.markAllRead}
        </button>
      </details>

      <details className="profile-settings settings-card settings-card--safety">
        <summary>{copy.settings.safetyTitle}</summary>
        <p>
          {copy.settings.blockedProfiles}: {blockedProfileIds.length}
        </p>
        <p>
          {copy.settings.reportsSubmitted}: {safetyReports.length}
        </p>
        <p>
          {copy.settings.openReports}:{' '}
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
          <p className="soft">{copy.settings.noReports}</p>
        )}
        <hr className="setting-separator" />
        <div className="danger-zone">
          <strong>{copy.settings.dangerZone}</strong>
          <p className="soft">{copy.settings.deleteAccountWarning}</p>
          {!confirmingDelete ? (
            <button
              type="button"
              className="danger"
              onClick={() => {
                setConfirmingDelete(true)
                setDeleteConfirmInput('')
                setDeleteError(null)
              }}
            >
              {copy.settings.deleteAccount}
            </button>
          ) : (
            <div className="danger-zone-confirm">
              <label>
                {copy.settings.deleteAccountConfirmPrompt}
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={(event) => setDeleteConfirmInput(event.target.value)}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              {deleteError ? <p className="bio-writer-error soft">{deleteError}</p> : null}
              <div className="summary-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setConfirmingDelete(false)
                    setDeleteConfirmInput('')
                    setDeleteError(null)
                  }}
                  disabled={deleteLoading}
                >
                  {copy.settings.deleteAccountCancel}
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={
                    deleteLoading ||
                    deleteConfirmInput.trim().toUpperCase() !==
                      copy.settings.deleteAccountConfirmWord
                  }
                  onClick={async () => {
                    setDeleteError(null)
                    setDeleteLoading(true)
                    const ok = await onDeleteAccount()
                    if (!ok) {
                      setDeleteError(copy.settings.deleteAccountFailed)
                      setDeleteLoading(false)
                    }
                    // On success the parent has already signed us out; this
                    // component is about to unmount, no need to reset state.
                  }}
                >
                  {deleteLoading
                    ? copy.settings.deleteAccountDeleting
                    : copy.settings.deleteAccountConfirmButton}
                </button>
              </div>
            </div>
          )}
        </div>
      </details>
    </section>
  )
}

export const SettingsScreen = React.memo(SettingsScreenInner)
