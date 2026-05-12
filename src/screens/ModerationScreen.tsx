import React from 'react'
import { UI_TEXT } from '../constants'
import type { AppLanguage, ModerationFilter } from '../domain'
import type { ModerationStatus, SafetyReport } from '../services/moderation'

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
                    <span>{report.category}</span>
                  </div>
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
              {selectedModerationReport.profileSnapshot.relationshipGoal}
            </p>
            <p>
              <strong>{copy.profile.vibe}:</strong> {selectedModerationReport.profileSnapshot.vibe}
            </p>
            <p>
              <strong>{ro ? 'Instantaneu bio' : 'Bio snapshot'}:</strong>{' '}
              {selectedModerationReport.profileSnapshot.bio}
            </p>
            <p>
              <strong>{ro ? 'Categorie' : 'Category'}:</strong> {selectedModerationReport.category}
            </p>
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
    </section>
  )
}
