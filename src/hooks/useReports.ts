import { useState } from 'react'
import type { Profile } from '../services/loveDateApi'
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

  return {
    blockedProfileIds, setBlockedProfileIds,
    safetyReports, setSafetyReports,
    reportDraftProfile, setReportDraftProfile,
    reportDraftCategory, setReportDraftCategory,
    reportDraftDetails, setReportDraftDetails,
    activeModerationReportId, setActiveModerationReportId,
    moderationStatusFilter, setModerationStatusFilter,
    moderationSearchQuery, setModerationSearchQuery,
  } as const
}
