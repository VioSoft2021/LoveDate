import React from 'react'
import './VerificationQueue.css'
import {
  backendGetSelfieSignedUrl,
  backendListVerifications,
  backendReviewVerification,
  type AdminVerificationRequest,
} from '../services/backendApi'
import type { AppLanguage } from '../domain'

// Admin review surface for selfie-pose verification (anti-fake,
// 2026-05-27). Self-contained: loads its own pending queue + signed
// URLs. Rendered inside the admin-gated Moderation Center, so it
// inherits that gate. Master compares the applicant's profile photos
// against their live selfie + the prompted pose, then approves (→
// gold "Verified" badge) or rejects.

type Props = {
  appLanguage: AppLanguage
}

export const VerificationQueue: React.FC<Props> = ({ appLanguage }) => {
  const ro = appLanguage === 'ro'
  const [items, setItems] = React.useState<AdminVerificationRequest[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selfieUrls, setSelfieUrls] = React.useState<Record<string, string>>({})
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await backendListVerifications('pending')
      setItems(rows)
      // Resolve signed URLs for each selfie in parallel.
      const entries = await Promise.all(
        rows.map(async (r) => {
          const url = await backendGetSelfieSignedUrl(r.selfiePath)
          return [r.id, url ?? ''] as const
        }),
      )
      setSelfieUrls(Object.fromEntries(entries))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load verifications')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const review = async (id: string, approve: boolean) => {
    setBusyId(id)
    setError(null)
    try {
      await backendReviewVerification(id, approve)
      setItems((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <article className="profile-settings verification-queue">
      <div className="verification-queue-head">
        <h2>{ro ? 'Verificări (selfie)' : 'Verifications (selfie)'}</h2>
        <button type="button" className="ghost" onClick={() => void load()} disabled={loading}>
          {loading
            ? ro ? 'Se încarcă…' : 'Loading…'
            : ro ? 'Reîmprospătează' : 'Refresh'}
        </button>
      </div>
      <p className="soft">
        {ro
          ? 'Compară selfie-ul live (cu gestul cerut) cu pozele din profil. Aprobă doar dacă e aceeași persoană reală.'
          : 'Compare the live selfie (with the requested gesture) against the profile photos. Approve only if it’s the same real person.'}
      </p>

      {error ? <p className="error-text">{error}</p> : null}

      {items.length === 0 && !loading ? (
        <p className="soft">{ro ? 'Nicio verificare în așteptare.' : 'No pending verifications.'}</p>
      ) : (
        <ul className="verification-list">
          {items.map((req) => (
            <li key={req.id} className="verification-row">
              <div className="verification-row-meta">
                <strong>{req.name || '—'}</strong>
                <span className="soft">{req.email}</span>
                <span className="verification-pose">
                  <span className="verification-pose-label">{ro ? 'Gest cerut' : 'Requested gesture'}</span>
                  {req.pose}
                </span>
              </div>

              <div className="verification-compare">
                <figure className="verification-figure">
                  <figcaption>{ro ? 'Selfie live' : 'Live selfie'}</figcaption>
                  {selfieUrls[req.id] ? (
                    <img src={selfieUrls[req.id]} alt="" className="verification-selfie-img" />
                  ) : (
                    <div className="verification-img-missing">
                      {ro ? 'Selfie indisponibil' : 'Selfie unavailable'}
                    </div>
                  )}
                </figure>
                <figure className="verification-figure">
                  <figcaption>{ro ? 'Poze profil' : 'Profile photos'}</figcaption>
                  <div className="verification-profile-photos">
                    {req.photos.length > 0 ? (
                      req.photos.slice(0, 4).map((p, i) => (
                        <img key={`${req.id}-${i}`} src={p} alt="" />
                      ))
                    ) : (
                      <div className="verification-img-missing">
                        {ro ? 'Fără poze' : 'No photos'}
                      </div>
                    )}
                  </div>
                </figure>
              </div>

              <div className="verification-actions">
                <button
                  type="button"
                  className="verification-approve"
                  disabled={busyId === req.id}
                  onClick={() => void review(req.id, true)}
                >
                  {busyId === req.id ? (ro ? '…' : '…') : ro ? 'Aprobă (verificat)' : 'Approve (verified)'}
                </button>
                <button
                  type="button"
                  className="verification-reject"
                  disabled={busyId === req.id}
                  onClick={() => void review(req.id, false)}
                >
                  {ro ? 'Respinge' : 'Reject'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
