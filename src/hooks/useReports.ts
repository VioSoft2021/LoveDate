import { useMemo, useState } from 'react'
import type { Profile } from '../services/priveApi'
import {
  readBlockedProfileIds,
  readModerationQueue,
  type SafetyCategory,
  type SafetyReport,
} from '../services/moderation'
import type { ModerationFilter } from '../domain'

// Phase D1.5 — useReports
//
// Groups safety-reports + moderation-queue + report-draft state.
// Pure state container — submitProfileReport, block/unblock, and
// moderation actions stay in App.tsx for now (they touch backend
// services + toast surfaces).

export const useReports = () => {
  const [blockedProfileIds, setBlockedProfileIds] = useState<number[]>(() =>
    readBlockedProfileIds(),
  )
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>(() =>
    readModerationQueue(),
  )
  const [reportDraftProfile, setReportDraftProfile] = useState<Profile | null>(null)
  const [reportDraftCategory, setReportDraftCategory] = useState<SafetyCategory>('spam')
  const [reportDraftDetails, setReportDraftDetails] = useState('')
  const [activeModerationReportId, setActiveModerationReportId] =
    useState<string | null>(null)
  const [moderationStatusFilter, setModerationStatusFilter] =
    useState<ModerationFilter>('open')
  const [moderationSearchQuery, setModerationSearchQuery] = useState('')

  // Derived moderation views (pure selectors over the state above).
  const moderationReportsSorted = useMemo(() => {
    // Sort: AI risk DESC (high → medium → low → untriaged), then createdAt DESC.
    const riskRank: Record<string, number> = { high: 3, medium: 2, low: 1 }
    return safetyReports.slice().sort((a, b) => {
      const aRank = a.aiRiskLevel ? riskRank[a.aiRiskLevel] ?? 0 : 0
      const bRank = b.aiRiskLevel ? riskRank[b.aiRiskLevel] ?? 0 : 0
      if (aRank !== bRank) return bRank - aRank
      return b.createdAt - a.createdAt
    })
  }, [safetyReports])
  const moderationReportsFiltered = useMemo(() => {
    const query = moderationSearchQuery.trim().toLowerCase()
    return moderationReportsSorted.filter((report) => {
      const statusMatches = moderationStatusFilter === 'all' || report.status === moderationStatusFilter
      if (!statusMatches) {
        return false
      }
      if (query.length === 0) {
        return true
      }
      const searchableText = [
        report.profileName,
        report.profileSnapshot.city,
        report.profileSnapshot.vibe,
        report.category,
        report.details,
        report.reporterEmail,
      ]
        .join(' ')
        .toLowerCase()
      return searchableText.includes(query)
    })
  }, [moderationReportsSorted, moderationSearchQuery, moderationStatusFilter])
  const selectedModerationReport = useMemo(() => {
    if (moderationReportsFiltered.length === 0) {
      return null
    }
    if (!activeModerationReportId) {
      return moderationReportsFiltered[0]
    }
    return (
      moderationReportsFiltered.find((report) => report.id === activeModerationReportId) ??
      moderationReportsFiltered[0]
    )
  }, [activeModerationReportId, moderationReportsFiltered])

  return {
    blockedProfileIds, setBlockedProfileIds,
    safetyReports, setSafetyReports,
    reportDraftProfile, setReportDraftProfile,
    reportDraftCategory, setReportDraftCategory,
    reportDraftDetails, setReportDraftDetails,
    activeModerationReportId, setActiveModerationReportId,
    moderationStatusFilter, setModerationStatusFilter,
    moderationSearchQuery, setModerationSearchQuery,
    moderationReportsSorted,
    moderationReportsFiltered,
    selectedModerationReport,
  } as const
}
