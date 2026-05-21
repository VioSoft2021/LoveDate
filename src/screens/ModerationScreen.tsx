import React from 'react'
import { UI_TEXT, translateRelationshipIntent, translateSafetyCategory } from '../constants'
import type { AppLanguage, ModerationFilter } from '../domain'
import type { ModerationStatus, SafetyReport } from '../services/moderation'
import {
  backendApproveWaitlist,
  backendDeclineWaitlist,
  backendListClientErrors,
  backendListWaitlist,
  type ClientErrorRow,
  type WaitlistEntry,
} from '../services/backendApi'

export type ModerationScreenProps = {
  appLanguage: AppLanguage
  isModerationAdmin: boolean
  userEmail: string
  moderationStatusFilter: ModerationFilter
  setModerationStatusFilter: (value: ModerationFilter) => void
  moderationSearchQuery: string
  setModerationSearchQuery: (value: string) => void
  moderationReportsFiltered: SafetyReport[]
  moderationReportsSorted: SafetyReport[]
  selectedModerationReport: SafetyReport | null
  setActiveModerationReportId: (id: string | null) => void
  updateReportStatus: (id: string, status: ModerationStatus) => void
  resolveAndBlockReport: (report: SafetyReport) => void
  onBackToSettings: () => void
}

export const ModerationScreen: React.FC<ModerationScreenProps> = ({
  appLanguage,
  isModerationAdmin,
  userEmail,
  moderationStatusFilter,
  setModerationStatusFilter,
  moderationSearchQuery,
  setModerationSearchQuery,
  moderationReportsFiltered,
  moderationReportsSorted,
  selectedModerationReport,
  setActiveModerationReportId,
  updateReportStatus,
  resolveAndBlockReport,
  onBackToSettings,
}) => {
  const copy = UI_TEXT[appLanguage]
  const ro = appLanguage === 'ro'

  // MED-15 crash inbox — fetched only for admins. RLS returns 0 rows for
  // anyone else so the call is harmless if the gate ever drifts. We
  // refetch on demand via the Refresh button; no auto-poll to keep the
  // server load predictable.
  const [crashRows, setCrashRows] = React.useState<ClientErrorRow[]>([])
  const [crashLoading, setCrashLoading] = React.useState(false)
  const [crashLoadedAt, setCrashLoadedAt] = React.useState<number | null>(null)
  const [expandedCrashId, setExpandedCrashId] = React.useState<string | null>(null)

  const loadCrashes = React.useCallback(async () => {
    setCrashLoading(true)
    const rows = await backendListClientErrors(50)
    setCrashRows(rows)
    setCrashLoadedAt(Date.now())
    setCrashLoading(false)
  }, [])

  React.useEffect(() => {
    if (!isModerationAdmin) return
    void loadCrashes()
  }, [isModerationAdmin, loadCrashes])

  // Waitlist admin — list pending requests, approve (auto-generates an
  // invite code) or decline. Reuses the existing admin-gated RPCs.
  type WaitlistTab = 'pending' | 'approved' | 'declined' | 'all'
  const [waitlistTab, setWaitlistTab] = React.useState<WaitlistTab>('pending')
  const [waitlistRows, setWaitlistRows] = React.useState<WaitlistEntry[]>([])
  const [waitlistLoading, setWaitlistLoading] = React.useState(false)
  const [waitlistError, setWaitlistError] = React.useState<string | null>(null)
  const [waitlistCopiedId, setWaitlistCopiedId] = React.useState<string | null>(null)

  const loadWaitlist = React.useCallback(
    async (tab: WaitlistTab) => {
      setWaitlistLoading(true)
      setWaitlistError(null)
      const rows = await backendListWaitlist(tab)
      setWaitlistRows(rows)
      setWaitlistLoading(false)
    },
    [],
  )

  React.useEffect(() => {
    if (!isModerationAdmin) return
    void loadWaitlist(waitlistTab)
  }, [isModerationAdmin, waitlistTab, loadWaitlist])

  const handleApprove = async (id: string) => {
    const code = await backendApproveWaitlist(id)
    if (!code) {
      setWaitlistError(copy.waitlist.adminApproveFailed)
      return
    }
    // Optimistic update: copy the code into the row so admin can copy + email.
    setWaitlistRows((rows) =>
      rows.map((r) =>
        r.id === id ? { ...r, status: 'approved', inviteCode: code } : r,
      ),
    )
  }
  const handleDecline = async (id: string) => {
    const ok = await backendDeclineWaitlist(id)
    if (!ok) {
      setWaitlistError(copy.waitlist.adminDeclineFailed)
      return
    }
    setWaitlistRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, status: 'declined' } : r)),
    )
  }
  const copyInviteCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setWaitlistCopiedId(id)
      window.setTimeout(() => setWaitlistCopiedId(null), 2000)
    } catch {
      // best-effort; admin can still read + retype the code from the row
    }
  }

  if (!isModerationAdmin) {
    return (
      <section className="settings-screen moderation-screen">
        <article className="profile-settings moderation-detail">
          <h2>{ro ? 'Acces restricționat' : 'Access Restricted'}</h2>
          <p className="soft">
            {ro
              ? 'Centrul de moderare este disponibil doar pentru conturile de administrator.'
              : 'Moderation Center is available only for admin accounts.'}
          </p>
          <p className="soft">
            {ro ? 'Conectat ca' : 'Signed in as'}:{' '}
            <strong>{userEmail || (ro ? 'necunoscut' : 'unknown')}</strong>
          </p>
          <button type="button" className="ghost" onClick={onBackToSettings}>
            {ro ? 'Înapoi la setări' : 'Back to Settings'}
          </button>
        </article>
      </section>
    )
  }

  return (
    <section className="settings-screen moderation-screen">
      <article className="profile-settings moderation-list">
        <h2>{ro ? 'Coada de moderare' : 'Moderation Queue'}</h2>
        <p className="soft">
          {ro
            ? 'Spațiu separat de revizuire pentru raportările utilizatorilor.'
            : 'Separate review workspace for user reports.'}
        </p>
        <div className="moderation-toolbar">
          <label>
            {ro ? 'Status' : 'Status'}
            <select
              value={moderationStatusFilter}
              onChange={(event) =>
                setModerationStatusFilter(event.target.value as ModerationFilter)
              }
            >
              <option value="open">{ro ? 'Deschise' : 'Open'}</option>
              <option value="reviewing">{ro ? 'În analiză' : 'Reviewing'}</option>
              <option value="resolved">{ro ? 'Rezolvate' : 'Resolved'}</option>
              <option value="dismissed">{ro ? 'Respinse' : 'Dismissed'}</option>
              <option value="all">{ro ? 'Toate' : 'All'}</option>
            </select>
          </label>
          <label className="moderation-search">
            {ro ? 'Caută' : 'Search'}
            <input
              type="text"
              value={moderationSearchQuery}
              onChange={(event) => setModerationSearchQuery(event.target.value)}
              placeholder={ro ? 'Nume, email, categorie, detalii...' : 'Name, email, category, details...'}
            />
          </label>
        </div>
        <p className="soft">
          {ro
            ? `Se afișează ${moderationReportsFiltered.length} din ${moderationReportsSorted.length} raportări.`
            : `Showing ${moderationReportsFiltered.length} of ${moderationReportsSorted.length} reports.`}
        </p>
        {moderationReportsFiltered.length === 0 ? (
          <p className="soft">
            {ro ? 'Nicio raportare nu corespunde filtrelor curente.' : 'No reports match current filters.'}
          </p>
        ) : (
          <div className="notification-list">
            {moderationReportsFiltered.map((report) => (
              <button
                key={report.id}
                type="button"
                className={`chat-item ${selectedModerationReport?.id === report.id ? 'active' : ''}`}
                onClick={() => setActiveModerationReportId(report.id)}
              >
                <div className="chat-item-body">
                  <div className="chat-meta">
                    <strong>{report.profileName}</strong>
                    {report.aiRiskLevel ? (
                      <span className={`mod-risk-badge mod-risk-badge--${report.aiRiskLevel}`}>
                        {report.aiRiskLevel.toUpperCase()}
                      </span>
                    ) : null}
                    <span>{translateSafetyCategory(report.category, appLanguage)}</span>
                  </div>
                  {report.aiSummary ? (
                    <p className="mod-ai-summary" title={report.aiSummary}>
                      {report.aiSummary}
                    </p>
                  ) : null}
                  <div className="chat-status">
                    <small>{report.status}</small>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </article>

      <article className="profile-settings moderation-detail">
        <h2>{ro ? 'Detalii raportare' : 'Report Details'}</h2>
        {selectedModerationReport ? (
          <>
            {selectedModerationReport.profileSnapshot.photoUrl ? (
              <img
                className="chat-avatar"
                style={{ width: '5.2rem', height: '5.2rem', borderRadius: '1rem', marginBottom: '0.8rem' }}
                src={selectedModerationReport.profileSnapshot.photoUrl}
                alt={`${selectedModerationReport.profileName} snapshot`}
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <p>
              <strong>{ro ? 'Utilizator' : 'User'}:</strong> {selectedModerationReport.profileName},{' '}
              {selectedModerationReport.profileSnapshot.age}
            </p>
            <p>
              <strong>{ro ? 'Context' : 'Context'}:</strong>{' '}
              {selectedModerationReport.profileSnapshot.city} {'•'}{' '}
              {translateRelationshipIntent(
                selectedModerationReport.profileSnapshot.relationshipGoal,
                appLanguage,
              )}
            </p>
            <p>
              <strong>{copy.profile.vibe}:</strong> {selectedModerationReport.profileSnapshot.vibe}
            </p>
            <p>
              <strong>{ro ? 'Instantaneu bio' : 'Bio snapshot'}:</strong>{' '}
              {selectedModerationReport.profileSnapshot.bio}
            </p>
            <p>
              <strong>{ro ? 'Categorie' : 'Category'}:</strong>{' '}
              {translateSafetyCategory(selectedModerationReport.category, appLanguage)}
            </p>
            {selectedModerationReport.aiRiskLevel ? (
              <div className="mod-ai-block">
                <p>
                  <strong>{ro ? 'Risc AI' : 'AI risk'}:</strong>{' '}
                  <span className={`mod-risk-badge mod-risk-badge--${selectedModerationReport.aiRiskLevel}`}>
                    {selectedModerationReport.aiRiskLevel.toUpperCase()}
                  </span>
                  {selectedModerationReport.aiCategories?.length ? (
                    <span className="mod-ai-categories">
                      {' • '}
                      {selectedModerationReport.aiCategories.join(', ')}
                    </span>
                  ) : null}
                </p>
                {selectedModerationReport.aiSummary ? (
                  <p>
                    <strong>{ro ? 'Rezumat AI' : 'AI summary'}:</strong>{' '}
                    {selectedModerationReport.aiSummary}
                  </p>
                ) : null}
              </div>
            ) : null}
            <p>
              <strong>{ro ? 'Raportat de' : 'Reporter'}:</strong>{' '}
              {selectedModerationReport.reporterEmail}
            </p>
            <p>
              <strong>{ro ? 'Detalii' : 'Details'}:</strong>{' '}
              {selectedModerationReport.details ||
                (ro ? 'Nu au fost oferite detalii suplimentare.' : 'No extra details provided.')}
            </p>
            <p>
              <strong>{ro ? 'Status' : 'Status'}:</strong> {selectedModerationReport.status}
            </p>
            <div className="summary-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => updateReportStatus(selectedModerationReport.id, 'reviewing')}
              >
                {ro ? 'În analiză' : 'Reviewing'}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => updateReportStatus(selectedModerationReport.id, 'resolved')}
              >
                {ro ? 'Rezolvă' : 'Resolve'}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => resolveAndBlockReport(selectedModerationReport)}
              >
                {ro ? 'Rezolvă + blochează' : 'Resolve + Block'}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => updateReportStatus(selectedModerationReport.id, 'dismissed')}
              >
                {ro ? 'Respinge' : 'Dismiss'}
              </button>
            </div>
          </>
        ) : (
          <p className="soft">{ro ? 'Selectează o raportare din coadă.' : 'Select a report from the queue.'}</p>
        )}
      </article>

      <article className="profile-settings waitlist-admin">
        <div className="crash-inbox-head">
          <h2>{copy.waitlist.adminTitle}</h2>
          <div className="crash-inbox-actions">
            {(['pending', 'approved', 'declined', 'all'] as WaitlistTab[]).map((t) => {
              const labelMap: Record<WaitlistTab, string> = {
                pending: copy.waitlist.adminPending,
                approved: copy.waitlist.adminApproved,
                declined: copy.waitlist.adminDeclined,
                all: copy.waitlist.adminAll,
              }
              return (
                <button
                  key={t}
                  type="button"
                  className={t === waitlistTab ? 'is-active' : 'ghost'}
                  onClick={() => setWaitlistTab(t)}
                >
                  {labelMap[t]}
                </button>
              )
            })}
          </div>
        </div>
        {waitlistError ? <p className="error-text">{waitlistError}</p> : null}
        {waitlistLoading ? (
          <p className="soft">{copy.common.loading}…</p>
        ) : waitlistRows.length === 0 ? (
          <p className="soft">{copy.waitlist.adminEmpty}</p>
        ) : (
          <ul className="crash-list">
            {waitlistRows.map((row) => (
              <li key={row.id} className="crash-row">
                <div className="crash-row-head">
                  <span className="mod-risk-badge">{row.status.toUpperCase()}</span>
                  <span className="crash-row-message">
                    <strong>{row.email}</strong>
                    {row.note ? <> — <em>{row.note}</em></> : null}
                  </span>
                  <span className="crash-row-meta">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="crash-row-detail">
                  {row.inviteCode ? (
                    <>
                      <p>
                        {copy.waitlist.adminCodeGenerated.replace('{code}', row.inviteCode)}
                      </p>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => void copyInviteCode(row.id, row.inviteCode!)}
                      >
                        {waitlistCopiedId === row.id
                          ? copy.waitlist.adminCopiedToast
                          : copy.waitlist.adminCopyCode}
                      </button>
                    </>
                  ) : row.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => void handleApprove(row.id)}
                      >
                        {copy.waitlist.adminApprove}
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => void handleDecline(row.id)}
                      >
                        {copy.waitlist.adminDecline}
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="profile-settings crash-inbox">
        <div className="crash-inbox-head">
          <h2>{ro ? 'Erori client (recente)' : 'Client crashes (recent)'}</h2>
          <div className="crash-inbox-actions">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                // Diagnostic — fires an unhandled rejection AND a delayed
                // throw on the macrotask queue. Both are caught by the
                // global listeners in main.tsx (unhandledrejection +
                // window error) so the UI does not crash. After ~1s
                // tap Refresh and you should see 2 new rows.
                void Promise.reject(new Error('[diagnostic] test unhandled rejection'))
                window.setTimeout(() => {
                  throw new Error('[diagnostic] test window error')
                }, 0)
              }}
              title={
                ro
                  ? 'Inserează 2 erori de test (rejection + window) ca să verifici pipeline-ul.'
                  : 'Insert 2 diagnostic errors (rejection + window) to verify the pipeline.'
              }
            >
              {ro ? 'Test' : 'Test'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => void loadCrashes()}
              disabled={crashLoading}
            >
              {crashLoading
                ? ro ? 'Se încarcă…' : 'Loading…'
                : ro ? 'Reîmprospătează' : 'Refresh'}
            </button>
          </div>
        </div>
        <p className="soft">
          {ro
            ? 'Erorile React, promise rejections și window.onerror raportate de aplicații instalate. RLS limitează vizibilitatea la administratori.'
            : 'React errors, promise rejections, and window.onerror events from installed clients. RLS limits visibility to admins.'}
        </p>
        {crashLoadedAt ? (
          <p className="soft">
            {ro ? 'Ultima încărcare' : 'Last loaded'}: {new Date(crashLoadedAt).toLocaleTimeString()}
            {' • '}
            {ro ? 'rânduri' : 'rows'}: {crashRows.length}
          </p>
        ) : null}
        {crashRows.length === 0 && !crashLoading ? (
          <p className="soft">
            {ro
              ? 'Niciun crash înregistrat — sau tabela public.client_errors nu este încă aplicată.'
              : 'No crashes logged — or public.client_errors is not yet applied.'}
          </p>
        ) : (
          <ul className="crash-list">
            {crashRows.map((row) => {
              const isOpen = expandedCrashId === row.id
              return (
                <li key={row.id} className={`crash-row crash-row--${row.severity}`}>
                  <button
                    type="button"
                    className="crash-row-head"
                    onClick={() => setExpandedCrashId(isOpen ? null : row.id)}
                  >
                    <span className={`mod-risk-badge mod-risk-badge--${
                      row.severity === 'react-render' ? 'high'
                      : row.severity === 'unhandled-rejection' ? 'medium'
                      : 'low'
                    }`}>
                      {row.severity.replace('-', ' ').toUpperCase()}
                    </span>
                    <span className="crash-row-message">{row.message}</span>
                    <small className="crash-row-meta">
                      {new Date(row.created_at).toLocaleString()}
                      {row.app_version ? ` • ${row.app_version}` : ''}
                    </small>
                  </button>
                  {isOpen ? (
                    <div className="crash-row-detail">
                      {row.user_id ? (
                        <p>
                          <strong>user_id:</strong> <code>{row.user_id}</code>
                        </p>
                      ) : (
                        <p className="soft">{ro ? '(utilizator anonim — pre-autentificare)' : '(anonymous user — pre-auth)'}</p>
                      )}
                      {row.url ? (
                        <p>
                          <strong>URL:</strong> <code>{row.url}</code>
                        </p>
                      ) : null}
                      {row.user_agent ? (
                        <p className="crash-row-ua">
                          <strong>UA:</strong> {row.user_agent}
                        </p>
                      ) : null}
                      {row.stack ? (
                        <details>
                          <summary>{ro ? 'Stack' : 'Stack'}</summary>
                          <pre className="crash-row-stack">{row.stack}</pre>
                        </details>
                      ) : null}
                      {row.component_stack ? (
                        <details>
                          <summary>{ro ? 'Component stack (React)' : 'Component stack (React)'}</summary>
                          <pre className="crash-row-stack">{row.component_stack}</pre>
                        </details>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </article>
    </section>
  )
}
