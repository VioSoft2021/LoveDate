import { useCallback } from 'react'
import { createSafetyReport } from '../services/moderation'
import { backendAddBlock, backendSubmitReport } from '../services/backendApi'
import { backendInvokeSafetyTriage } from '../services/ai/safetyTriage'
import type { ModerationStatus, SafetyCategory, SafetyReport } from '../services/moderation'
import type { AppLanguage, ChatMessage, NotificationItem, SwipeHistory } from '../domain'
import type { Profile } from '../services/priveApi'

// Phase D — useModerationActions
//
// The report/block moderation handlers, lifted out of App.tsx verbatim. They
// consume the report-draft + safetyReports + blockedProfileIds slots owned by
// useReports, plus the cross-slice setters the block action prunes (chat
// threads, unread counts, swipe history, active chat). The backend calls
// (submit / triage / add-block) are imported directly so they stay mockable
// in tests.
//
// Side-effects callers care about:
//   - submitProfileReport optimistically prepends a SafetyReport to the local
//     queue, then fires a backend submit + fire-and-forget AI triage that
//     overlays its verdict back onto the matching row when it lands.
//   - blockProfileById is a hard local purge: it adds the block (local + via
//     backendAddBlock), drops the chat thread + unread count, removes the id
//     from liked/passed/match history, and clears the active chat if it was
//     the blocked profile.

export type UseModerationActionsInput = {
  // Report-draft + queue state (owned by useReports).
  reportDraftProfile: Profile | null
  reportDraftCategory: SafetyCategory
  reportDraftDetails: string
  setReportDraftProfile: React.Dispatch<React.SetStateAction<Profile | null>>
  setReportDraftCategory: React.Dispatch<React.SetStateAction<SafetyCategory>>
  setReportDraftDetails: React.Dispatch<React.SetStateAction<string>>
  setSafetyReports: React.Dispatch<React.SetStateAction<SafetyReport[]>>
  setBlockedProfileIds: React.Dispatch<React.SetStateAction<number[]>>
  // Cross-slice state the block action prunes.
  activeChatId: number | null
  setActiveChatId: React.Dispatch<React.SetStateAction<number | null>>
  setChatThreads: React.Dispatch<React.SetStateAction<Record<number, ChatMessage[]>>>
  setUnreadChats: React.Dispatch<React.SetStateAction<Record<number, number>>>
  setHistory: React.Dispatch<React.SetStateAction<SwipeHistory>>
  // Identity + i18n + user feedback.
  userEmail: string
  appLanguage: AppLanguage
  pushToast: (message: string, tone?: 'info' | 'success' | 'error') => void
  pushNotification: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void
}

export type UseModerationActionsResult = {
  closeReportProfileDialog: () => void
  reportProfile: (profile: Profile) => void
  submitProfileReport: () => void
  updateReportStatus: (reportId: string, status: ModerationStatus) => void
  blockProfileById: (profileId: number, profileName?: string) => void
  blockProfile: (profile: Profile) => void
  resolveAndBlockReport: (report: SafetyReport) => void
}

export const useModerationActions = (
  deps: UseModerationActionsInput,
): UseModerationActionsResult => {
  const {
    reportDraftProfile,
    reportDraftCategory,
    reportDraftDetails,
    setReportDraftProfile,
    setReportDraftCategory,
    setReportDraftDetails,
    setSafetyReports,
    setBlockedProfileIds,
    activeChatId,
    setActiveChatId,
    setChatThreads,
    setUnreadChats,
    setHistory,
    userEmail,
    appLanguage,
    pushToast,
    pushNotification,
  } = deps

  const closeReportProfileDialog = useCallback(() => {
    setReportDraftProfile(null)
    setReportDraftCategory('spam')
    setReportDraftDetails('')
  }, [setReportDraftCategory, setReportDraftDetails, setReportDraftProfile])

  const reportProfile = useCallback(
    (profile: Profile) => {
      setReportDraftProfile(profile)
      setReportDraftCategory('spam')
      setReportDraftDetails('')
    },
    [setReportDraftCategory, setReportDraftDetails, setReportDraftProfile],
  )

  const submitProfileReport = useCallback(() => {
    if (!reportDraftProfile) {
      return
    }

    const report = createSafetyReport({
      profile: reportDraftProfile,
      category: reportDraftCategory,
      details: reportDraftDetails.trim(),
      reporterEmail: userEmail || 'guest@prive-app.club',
    })
    setSafetyReports((current) => [report, ...current].slice(0, 200))
    void (async () => {
      const submission = await backendSubmitReport({
        reportedProfileId: report.profileId,
        reportedProfileName: report.profileName,
        category: report.category,
        details: report.details,
        profileSnapshot: report.profileSnapshot,
      })
      if (!submission?.reportId) return
      // Fire-and-forget triage. The Edge Function writes the verdict back
      // to safety_reports via the service role; we also overlay it on the
      // local queue so the operator sees AI summary immediately.
      const verdict = await backendInvokeSafetyTriage({
        reportId: submission.reportId,
        category: report.category,
        details: report.details,
        profileSnapshot: {
          name: report.profileName,
          age: report.profileSnapshot.age,
          city: report.profileSnapshot.city,
          vibe: report.profileSnapshot.vibe,
          bio: report.profileSnapshot.bio,
          relationshipGoal: report.profileSnapshot.relationshipGoal,
        },
        language: appLanguage,
      })
      if (verdict) {
        setSafetyReports((current) =>
          current.map((item) =>
            item.id === report.id
              ? {
                  ...item,
                  aiRiskLevel: verdict.riskLevel,
                  aiCategories: verdict.categories,
                  aiSummary: verdict.summary,
                }
              : item,
          ),
        )
      }
    })()
    pushNotification({
      title: `Report submitted for ${reportDraftProfile.name}`,
      body: `Category: ${reportDraftCategory}`,
      category: 'safety',
    })
    pushToast(`Report submitted for ${reportDraftProfile.name}.`, 'success')
    closeReportProfileDialog()
  }, [
    reportDraftProfile,
    reportDraftCategory,
    reportDraftDetails,
    userEmail,
    appLanguage,
    setSafetyReports,
    pushNotification,
    pushToast,
    closeReportProfileDialog,
  ])

  const updateReportStatus = useCallback(
    (reportId: string, status: ModerationStatus) => {
      setSafetyReports((current) =>
        current.map((item) => {
          if (item.id !== reportId) {
            return item
          }
          return {
            ...item,
            status,
            reviewedAt: status === 'open' ? null : Date.now(),
            reviewerEmail: status === 'open' ? null : userEmail,
          }
        }),
      )
      pushToast(`Report moved to ${status}.`, 'info')
    },
    [setSafetyReports, userEmail, pushToast],
  )

  const blockProfileById = useCallback(
    (profileId: number, profileName = 'Profile') => {
      setBlockedProfileIds((current) => (current.includes(profileId) ? current : [...current, profileId]))
      void backendAddBlock(profileId)
      setChatThreads((current) => {
        const clone = { ...current }
        delete clone[profileId]
        return clone
      })
      setUnreadChats((current) => {
        const clone = { ...current }
        delete clone[profileId]
        return clone
      })
      setHistory((current) => ({
        likedIds: current.likedIds.filter((id) => id !== profileId),
        passedIds: current.passedIds.filter((id) => id !== profileId),
        matchIds: current.matchIds.filter((id) => id !== profileId),
      }))
      if (activeChatId === profileId) {
        setActiveChatId(null)
      }
      pushToast(`${profileName} blocked.`, 'info')
    },
    [setBlockedProfileIds, setChatThreads, setUnreadChats, setHistory, activeChatId, setActiveChatId, pushToast],
  )

  const blockProfile = useCallback(
    (profile: Profile) => {
      blockProfileById(profile.id, profile.name)
    },
    [blockProfileById],
  )

  const resolveAndBlockReport = useCallback(
    (report: SafetyReport) => {
      updateReportStatus(report.id, 'resolved')
      blockProfileById(report.profileId, report.profileName)
      pushNotification({
        title: `Resolved report for ${report.profileName}`,
        body: 'Profile blocked and report marked as resolved.',
        category: 'safety',
      })
    },
    [updateReportStatus, blockProfileById, pushNotification],
  )

  return {
    closeReportProfileDialog,
    reportProfile,
    submitProfileReport,
    updateReportStatus,
    blockProfileById,
    blockProfile,
    resolveAndBlockReport,
  }
}
