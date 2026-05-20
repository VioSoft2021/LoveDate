import React from 'react'
import type { AppLanguage } from '../domain'
import type { Profile } from '../services/loveDateApi'
import { SAFETY_CATEGORIES, type SafetyCategory } from '../services/moderation'

export type ReportProfileDialogProps = {
  profile: Profile | null
  appLanguage: AppLanguage
  category: SafetyCategory
  setCategory: (value: SafetyCategory) => void
  details: string
  setDetails: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}

// Safety report dialog opened from a profile's overflow menu. Writes
// to the cloud via the parent's submitProfileReport handler, which
// also pushes a confirmation toast on success. Returns null when no
// profile is being reported so the parent can render it
// unconditionally.
export const ReportProfileDialog: React.FC<ReportProfileDialogProps> = ({
  profile,
  appLanguage,
  category,
  setCategory,
  details,
  setDetails,
  onCancel,
  onSubmit,
}) => {
  if (!profile) return null
  const ro = appLanguage === 'ro'
  const titleText = ro ? `Raportează ${profile.name}` : `Report ${profile.name}`
  return (
    <div
      className="match-modal"
      role="dialog"
      aria-modal="true"
      aria-label={titleText}
    >
      <article className="match-card report-modal-card">
        <p className="pill">{ro ? 'Siguranță' : 'Safety'}</p>
        <h2>{titleText}</h2>
        <p>
          {ro
            ? 'Spune-ne ce s-a întâmplat. Raportarea ta va apărea în Centrul de Moderare pentru analiză.'
            : 'Tell us what happened. Your report will appear in the Moderation Center for review.'}
        </p>
        <label className="report-field">
          <span>{ro ? 'Categorie' : 'Category'}</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as SafetyCategory)}
          >
            {SAFETY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="report-field report-field--textarea">
          <span>{ro ? 'Detalii' : 'Details'}</span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder={
              ro
                ? 'Adaugă orice detaliu util pentru echipa de moderare.'
                : 'Add any useful detail for the moderation team.'
            }
          />
        </label>
        <div className="match-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            {ro ? 'Anulează' : 'Cancel'}
          </button>
          <button type="button" className="danger" onClick={onSubmit}>
            {ro ? 'Trimite raportarea' : 'Submit report'}
          </button>
        </div>
      </article>
    </div>
  )
}
