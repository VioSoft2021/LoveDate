import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModerationScreen } from './ModerationScreen'
import type { ClientErrorRow } from '../services/backendApi'
import type { SafetyReport } from '../services/moderation'

// Mock the backend module so the test never hits Supabase.
vi.mock('../services/backendApi', () => ({
  backendListClientErrors: vi.fn(),
}))

import { backendListClientErrors } from '../services/backendApi'
const mockBackendListClientErrors = vi.mocked(backendListClientErrors)

const buildCrashRow = (overrides: Partial<ClientErrorRow> = {}): ClientErrorRow => ({
  id: 'crash-1',
  user_id: 'user-123',
  severity: 'react-render',
  message: 'TypeError: Cannot read property of undefined',
  stack: 'Error\n    at App.tsx:42\n    at React.render',
  component_stack: '\n    in App\n    in ErrorBoundary',
  url: 'https://example.com/app',
  user_agent: 'Mozilla/5.0',
  app_version: 'abc1234',
  created_at: new Date('2026-05-20T12:00:00Z').toISOString(),
  ...overrides,
})

const noopReports = {
  moderationReportsFiltered: [] as SafetyReport[],
  moderationReportsSorted: [] as SafetyReport[],
  selectedModerationReport: null,
  setActiveModerationReportId: vi.fn(),
  updateReportStatus: vi.fn(),
  resolveAndBlockReport: vi.fn(),
  moderationStatusFilter: 'open' as const,
  setModerationStatusFilter: vi.fn(),
  moderationSearchQuery: '',
  setModerationSearchQuery: vi.fn(),
  onBackToSettings: vi.fn(),
}

beforeEach(() => {
  mockBackendListClientErrors.mockReset()
})

describe('ModerationScreen — access gating', () => {
  it('shows Access Restricted when isModerationAdmin is false', () => {
    mockBackendListClientErrors.mockResolvedValue([])
    render(
      <ModerationScreen
        appLanguage="en"
        isModerationAdmin={false}
        userEmail="user@example.com"
        {...noopReports}
      />,
    )
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('does NOT call backendListClientErrors when not admin', async () => {
    mockBackendListClientErrors.mockResolvedValue([])
    render(
      <ModerationScreen
        appLanguage="en"
        isModerationAdmin={false}
        userEmail="user@example.com"
        {...noopReports}
      />,
    )
    // Give the effect a tick — should still be 0 calls.
    await Promise.resolve()
    expect(mockBackendListClientErrors).not.toHaveBeenCalled()
  })
})

describe('ModerationScreen — Crash Inbox (admin)', () => {
  it('renders the Crash Inbox heading when admin', async () => {
    mockBackendListClientErrors.mockResolvedValue([])
    render(
      <ModerationScreen
        appLanguage="en"
        isModerationAdmin={true}
        userEmail="admin@lovedate.com"
        {...noopReports}
      />,
    )
    expect(screen.getByText(/Client crashes \(recent\)/i)).toBeInTheDocument()
  })

  it('fetches crashes on mount and shows the empty-state message', async () => {
    mockBackendListClientErrors.mockResolvedValue([])
    render(
      <ModerationScreen
        appLanguage="en"
        isModerationAdmin={true}
        userEmail="admin@lovedate.com"
        {...noopReports}
      />,
    )
    await waitFor(() => {
      expect(mockBackendListClientErrors).toHaveBeenCalledWith(50)
    })
    await waitFor(() => {
      expect(screen.getByText(/No crashes logged/i)).toBeInTheDocument()
    })
  })

  it('renders one row per crash and expands details on click', async () => {
    const row = buildCrashRow({ message: 'BOOM' })
    mockBackendListClientErrors.mockResolvedValue([row])
    render(
      <ModerationScreen
        appLanguage="en"
        isModerationAdmin={true}
        userEmail="admin@lovedate.com"
        {...noopReports}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('BOOM')).toBeInTheDocument()
    })
    // Severity badge label (with hyphen→space transform)
    expect(screen.getByText(/REACT RENDER/i)).toBeInTheDocument()
    // Details collapsed initially
    expect(screen.queryByText(/user_id:/i)).not.toBeInTheDocument()
    // Click the row → details visible
    fireEvent.click(screen.getByText('BOOM'))
    expect(screen.getByText(/user_id:/i)).toBeInTheDocument()
    expect(screen.getByText('user-123')).toBeInTheDocument()
  })

  it('shows anonymous label when user_id is null', async () => {
    const row = buildCrashRow({ user_id: null, message: 'pre-auth crash' })
    mockBackendListClientErrors.mockResolvedValue([row])
    render(
      <ModerationScreen
        appLanguage="en"
        isModerationAdmin={true}
        userEmail="admin@lovedate.com"
        {...noopReports}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('pre-auth crash')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('pre-auth crash'))
    expect(screen.getByText(/anonymous user/i)).toBeInTheDocument()
  })

  it('Refresh button refetches the crash list', async () => {
    mockBackendListClientErrors.mockResolvedValue([])
    render(
      <ModerationScreen
        appLanguage="en"
        isModerationAdmin={true}
        userEmail="admin@lovedate.com"
        {...noopReports}
      />,
    )
    await waitFor(() => {
      expect(mockBackendListClientErrors).toHaveBeenCalledTimes(1)
    })
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => {
      expect(mockBackendListClientErrors).toHaveBeenCalledTimes(2)
    })
  })

  it('color-codes severity correctly (react-render → high, unhandled-rejection → medium, window-error → low)', async () => {
    const rows: ClientErrorRow[] = [
      buildCrashRow({ id: 'r1', severity: 'react-render', message: 'A' }),
      buildCrashRow({ id: 'r2', severity: 'unhandled-rejection', message: 'B' }),
      buildCrashRow({ id: 'r3', severity: 'window-error', message: 'C' }),
    ]
    mockBackendListClientErrors.mockResolvedValue(rows)
    const { container } = render(
      <ModerationScreen
        appLanguage="en"
        isModerationAdmin={true}
        userEmail="admin@lovedate.com"
        {...noopReports}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument()
    })
    expect(container.querySelectorAll('.mod-risk-badge--high')).toHaveLength(1)
    expect(container.querySelectorAll('.mod-risk-badge--medium')).toHaveLength(1)
    expect(container.querySelectorAll('.mod-risk-badge--low')).toHaveLength(1)
  })
})
