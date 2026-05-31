import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { SetStateAction } from 'react'
import { useModerationActions, type UseModerationActionsInput } from './useModerationActions'
import { backendAddBlock, backendSubmitReport } from '../services/backendApi'
import { backendInvokeSafetyTriage } from '../services/ai/safetyTriage'
import type { Profile } from '../services/priveApi'
import type { SafetyReport } from '../services/moderation'

// Backend calls are mocked so the hook never reaches Supabase. createSafetyReport
// (services/moderation) is left real so the optimistic report shape is exercised.
vi.mock('../services/backendApi', () => ({
  backendAddBlock: vi.fn(),
  backendSubmitReport: vi.fn().mockResolvedValue(null),
}))
vi.mock('../services/ai/safetyTriage', () => ({
  backendInvokeSafetyTriage: vi.fn().mockResolvedValue(null),
}))

const mockAddBlock = vi.mocked(backendAddBlock)
const mockSubmitReport = vi.mocked(backendSubmitReport)
const mockTriage = vi.mocked(backendInvokeSafetyTriage)

const sampleProfile: Profile = {
  id: 42,
  authUserId: 'auth-42',
  name: 'Riley',
  age: 28,
  city: 'Bucharest',
  vibe: 'curious',
  bio: 'hi',
  interests: [],
  palette: ['#000', '#fff'],
  photos: ['https://example.com/a.jpg'],
  gender: 'Woman',
  distanceKm: 5,
  verified: true,
  relationshipGoal: 'Long-term',
  zodiac: 'Leo',
}

const sampleReport: SafetyReport = {
  id: 'rpt_1',
  profileId: 42,
  profileName: 'Riley',
  profileSnapshot: {
    age: 28,
    city: 'Bucharest',
    vibe: 'curious',
    bio: 'hi',
    relationshipGoal: 'Long-term',
    photoUrl: 'https://example.com/a.jpg',
  },
  category: 'spam',
  details: '',
  reporterEmail: 'me@prive-app.club',
  createdAt: 1,
  status: 'open',
  reviewedAt: null,
  reviewerEmail: null,
}

const makeDeps = (overrides: Partial<UseModerationActionsInput> = {}): UseModerationActionsInput => ({
  reportDraftProfile: null,
  reportDraftCategory: 'spam',
  reportDraftDetails: '',
  setReportDraftProfile: vi.fn(),
  setReportDraftCategory: vi.fn(),
  setReportDraftDetails: vi.fn(),
  setSafetyReports: vi.fn(),
  setBlockedProfileIds: vi.fn(),
  activeChatId: null,
  setActiveChatId: vi.fn(),
  setChatThreads: vi.fn(),
  setUnreadChats: vi.fn(),
  setHistory: vi.fn(),
  userEmail: 'me@prive-app.club',
  appLanguage: 'en',
  pushToast: vi.fn(),
  pushNotification: vi.fn(),
  ...overrides,
})

// Apply a captured setState updater (the functional form the handlers use) to a
// concrete previous value so we can assert the reducer behaviour.
const applyUpdater = <T,>(spy: ReturnType<typeof vi.fn>, prev: T): T => {
  const action = spy.mock.calls[0][0] as SetStateAction<T>
  return typeof action === 'function' ? (action as (p: T) => T)(prev) : action
}

beforeEach(() => {
  mockAddBlock.mockReset()
  mockSubmitReport.mockReset().mockResolvedValue(null)
  mockTriage.mockReset().mockResolvedValue(null)
})

describe('useModerationActions — report dialog', () => {
  it('reportProfile opens the dialog with the profile + default category', () => {
    const deps = makeDeps()
    const { result } = renderHook(() => useModerationActions(deps))
    result.current.reportProfile(sampleProfile)
    expect(deps.setReportDraftProfile).toHaveBeenCalledWith(sampleProfile)
    expect(deps.setReportDraftCategory).toHaveBeenCalledWith('spam')
    expect(deps.setReportDraftDetails).toHaveBeenCalledWith('')
  })

  it('closeReportProfileDialog clears the draft back to defaults', () => {
    const deps = makeDeps()
    const { result } = renderHook(() => useModerationActions(deps))
    result.current.closeReportProfileDialog()
    expect(deps.setReportDraftProfile).toHaveBeenCalledWith(null)
    expect(deps.setReportDraftCategory).toHaveBeenCalledWith('spam')
    expect(deps.setReportDraftDetails).toHaveBeenCalledWith('')
  })
})

describe('useModerationActions — submitProfileReport', () => {
  it('is a no-op when there is no draft profile', () => {
    const setSafetyReports = vi.fn()
    const deps = makeDeps({ reportDraftProfile: null, setSafetyReports })
    const { result } = renderHook(() => useModerationActions(deps))
    result.current.submitProfileReport()
    expect(setSafetyReports).not.toHaveBeenCalled()
    expect(mockSubmitReport).not.toHaveBeenCalled()
    expect(deps.pushToast).not.toHaveBeenCalled()
  })

  it('queues the report optimistically (trimmed), submits to backend, notifies, and closes the dialog', () => {
    const setSafetyReports = vi.fn()
    const deps = makeDeps({
      reportDraftProfile: sampleProfile,
      reportDraftCategory: 'harassment',
      reportDraftDetails: '  abusive  ',
      setSafetyReports,
    })
    const { result } = renderHook(() => useModerationActions(deps))
    result.current.submitProfileReport()

    // Optimistic local prepend, details trimmed.
    expect(setSafetyReports).toHaveBeenCalledTimes(1)
    const queued = applyUpdater<SafetyReport[]>(setSafetyReports, [])
    expect(queued).toHaveLength(1)
    expect(queued[0].profileId).toBe(42)
    expect(queued[0].category).toBe('harassment')
    expect(queued[0].details).toBe('abusive')

    // Backend submit with trimmed details.
    expect(mockSubmitReport).toHaveBeenCalledTimes(1)
    expect(mockSubmitReport.mock.calls[0][0]).toMatchObject({
      reportedProfileId: 42,
      category: 'harassment',
      details: 'abusive',
    })

    // Operator feedback + dialog close.
    expect(deps.pushNotification).toHaveBeenCalledWith(expect.objectContaining({ category: 'safety' }))
    expect(deps.pushToast).toHaveBeenCalledWith('Report submitted for Riley.', 'success')
    expect(deps.setReportDraftProfile).toHaveBeenCalledWith(null) // via closeReportProfileDialog
  })
})

describe('useModerationActions — updateReportStatus', () => {
  it('stamps reviewedAt + reviewer for a non-open status and leaves other rows untouched', () => {
    const setSafetyReports = vi.fn()
    const deps = makeDeps({ setSafetyReports })
    const { result } = renderHook(() => useModerationActions(deps))
    result.current.updateReportStatus('rpt_1', 'resolved')
    const out = applyUpdater<SafetyReport[]>(setSafetyReports, [sampleReport, { ...sampleReport, id: 'rpt_2' }])
    expect(out[0].status).toBe('resolved')
    expect(out[0].reviewedAt).toEqual(expect.any(Number))
    expect(out[0].reviewerEmail).toBe('me@prive-app.club')
    expect(out[1].status).toBe('open') // untouched
    expect(deps.pushToast).toHaveBeenCalledWith('Report moved to resolved.', 'info')
  })

  it('clears reviewedAt + reviewer when moving back to open', () => {
    const setSafetyReports = vi.fn()
    const deps = makeDeps({ setSafetyReports })
    const { result } = renderHook(() => useModerationActions(deps))
    result.current.updateReportStatus('rpt_1', 'open')
    const out = applyUpdater<SafetyReport[]>(setSafetyReports, [
      { ...sampleReport, status: 'resolved', reviewedAt: 999, reviewerEmail: 'x' },
    ])
    expect(out[0].status).toBe('open')
    expect(out[0].reviewedAt).toBeNull()
    expect(out[0].reviewerEmail).toBeNull()
  })
})

describe('useModerationActions — block', () => {
  it('blockProfileById adds the id, calls backend, prunes threads/unread/history, and toasts', () => {
    const setBlockedProfileIds = vi.fn()
    const setChatThreads = vi.fn()
    const setUnreadChats = vi.fn()
    const setHistory = vi.fn()
    const deps = makeDeps({ setBlockedProfileIds, setChatThreads, setUnreadChats, setHistory })
    const { result } = renderHook(() => useModerationActions(deps))
    result.current.blockProfileById(42, 'Riley')

    expect(mockAddBlock).toHaveBeenCalledWith(42)

    expect(applyUpdater<number[]>(setBlockedProfileIds, [])).toEqual([42])
    // idempotent — re-applying with the id already present is a no-op
    const blockAction = setBlockedProfileIds.mock.calls[0][0] as (p: number[]) => number[]
    expect(blockAction([42])).toEqual([42])

    expect(applyUpdater<Record<number, unknown[]>>(setChatThreads, { 42: [], 7: [] })).toEqual({ 7: [] })
    expect(applyUpdater<Record<number, number>>(setUnreadChats, { 42: 3, 7: 1 })).toEqual({ 7: 1 })
    expect(
      applyUpdater(setHistory, { likedIds: [42, 7], passedIds: [42], matchIds: [42, 9] }),
    ).toEqual({ likedIds: [7], passedIds: [], matchIds: [9] })

    expect(deps.pushToast).toHaveBeenCalledWith('Riley blocked.', 'info')
  })

  it('clears the active chat only when it is the blocked profile', () => {
    const depsMatch = makeDeps({ activeChatId: 42 })
    renderHook(() => useModerationActions(depsMatch)).result.current.blockProfileById(42, 'Riley')
    expect(depsMatch.setActiveChatId).toHaveBeenCalledWith(null)

    const depsOther = makeDeps({ activeChatId: 7 })
    renderHook(() => useModerationActions(depsOther)).result.current.blockProfileById(42, 'Riley')
    expect(depsOther.setActiveChatId).not.toHaveBeenCalled()
  })

  it('blockProfile delegates to blockProfileById with the profile id + name', () => {
    const deps = makeDeps()
    const { result } = renderHook(() => useModerationActions(deps))
    result.current.blockProfile(sampleProfile)
    expect(mockAddBlock).toHaveBeenCalledWith(42)
    expect(deps.pushToast).toHaveBeenCalledWith('Riley blocked.', 'info')
  })
})

describe('useModerationActions — resolveAndBlockReport', () => {
  it('resolves the report, blocks the profile, and fires a safety notification', () => {
    const setSafetyReports = vi.fn()
    const deps = makeDeps({ setSafetyReports })
    const { result } = renderHook(() => useModerationActions(deps))
    result.current.resolveAndBlockReport(sampleReport)

    // updateReportStatus('resolved') ran (first setSafetyReports call)
    expect(applyUpdater<SafetyReport[]>(setSafetyReports, [sampleReport])[0].status).toBe('resolved')
    // block ran
    expect(mockAddBlock).toHaveBeenCalledWith(42)
    // safety notification
    expect(deps.pushNotification).toHaveBeenCalledWith(expect.objectContaining({ category: 'safety' }))
  })
})
