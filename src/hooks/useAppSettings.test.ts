import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAppSettings } from './useAppSettings'
import { backendSaveSettings } from '../services/backendApi'
import { enablePushNotifications, disablePushNotifications } from '../services/push'

vi.mock('../services/backendApi', () => ({
  backendSaveSettings: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../services/push', () => ({
  enablePushNotifications: vi.fn().mockResolvedValue({ ok: true }),
  disablePushNotifications: vi.fn().mockResolvedValue(undefined),
}))

const mockSave = vi.mocked(backendSaveSettings)
const mockEnable = vi.mocked(enablePushNotifications)
const mockDisable = vi.mocked(disablePushNotifications)

beforeEach(() => {
  mockSave.mockReset().mockResolvedValue(undefined)
  mockEnable.mockReset().mockResolvedValue({ ok: true })
  mockDisable.mockReset().mockResolvedValue(undefined)
})

describe('useAppSettings — initial state', () => {
  it('starts with the default settings + idle save status', () => {
    const { result } = renderHook(() => useAppSettings({ pushToast: vi.fn() }))
    expect(result.current.settings).toEqual({ pushNotifications: true, emailNotifications: false })
    expect(result.current.settingsSaveStatus).toBe('idle')
  })
})

describe('useAppSettings — handleSettingsToggle', () => {
  it('updates the setting, persists it, and toasts on success', async () => {
    const pushToast = vi.fn()
    const { result } = renderHook(() => useAppSettings({ pushToast }))
    await act(async () => {
      result.current.handleSettingsToggle('emailNotifications', true)
    })
    expect(result.current.settings.emailNotifications).toBe(true)
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ emailNotifications: true }))
    await waitFor(() => expect(result.current.settingsSaveStatus).toBe('saved'))
    expect(pushToast).toHaveBeenCalledWith('Settings saved.', 'success')
  })

  it('marks error + toasts when the save rejects', async () => {
    mockSave.mockRejectedValueOnce(new Error('nope'))
    const pushToast = vi.fn()
    const { result } = renderHook(() => useAppSettings({ pushToast }))
    await act(async () => {
      result.current.handleSettingsToggle('emailNotifications', true)
    })
    await waitFor(() => expect(result.current.settingsSaveStatus).toBe('error'))
    expect(pushToast).toHaveBeenCalledWith('Settings failed to save.', 'error')
  })

  it('subscribes to push + confirms when pushNotifications is enabled', async () => {
    const pushToast = vi.fn()
    const { result } = renderHook(() => useAppSettings({ pushToast }))
    await act(async () => {
      result.current.handleSettingsToggle('pushNotifications', true)
    })
    expect(mockEnable).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(pushToast).toHaveBeenCalledWith('Push notifications enabled.', 'success'))
  })

  it('reverts the toggle + explains when push permission is denied', async () => {
    mockEnable.mockResolvedValueOnce({ ok: false, reason: 'denied' })
    const pushToast = vi.fn()
    const { result } = renderHook(() => useAppSettings({ pushToast }))
    await act(async () => {
      result.current.handleSettingsToggle('pushNotifications', true)
    })
    await waitFor(() => expect(result.current.settings.pushNotifications).toBe(false))
    expect(pushToast).toHaveBeenCalledWith(
      'Browser blocked notifications. Enable them in site settings.',
      'error',
    )
  })

  it('unsubscribes when pushNotifications is disabled', async () => {
    const pushToast = vi.fn()
    const { result } = renderHook(() => useAppSettings({ pushToast }))
    await act(async () => {
      result.current.handleSettingsToggle('pushNotifications', false)
    })
    expect(mockDisable).toHaveBeenCalledTimes(1)
    expect(mockEnable).not.toHaveBeenCalled()
  })
})
