import { useCallback, useState } from 'react'
import { readAppLanguage } from '../persistence'
import { backendSaveSettings } from '../services/backendApi'
import { enablePushNotifications, disablePushNotifications } from '../services/push'
import type { SettingsPayload } from '../services/backendApi'
import type { AppLanguage } from '../domain'

// Phase D1.8 — useAppSettings
//
// Owns the global app settings (push/email notification toggles),
// the app language, and the save-status indicators for both — plus
// handleSettingsToggle, which persists a toggle and, for push, drives
// the subscribe/unsubscribe + permission-revert flow. Takes pushToast
// for user feedback (the one external surface it touches).

type UseAppSettingsInput = {
  pushToast: (message: string, tone?: 'info' | 'success' | 'error') => void
}

const DEFAULT_SETTINGS: SettingsPayload = {
  pushNotifications: true,
  emailNotifications: false,
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const useAppSettings = ({ pushToast }: UseAppSettingsInput) => {
  const [settings, setSettings] = useState<SettingsPayload>(DEFAULT_SETTINGS)
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<SaveStatus>('idle')
  const [preferenceSaveStatus, setPreferenceSaveStatus] = useState<SaveStatus>('idle')
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => readAppLanguage())

  const handleSettingsToggle = useCallback(
    (key: keyof SettingsPayload, checked: boolean) => {
      const nextValue = {
        ...settings,
        [key]: checked,
      }

      setSettings(nextValue)
      setSettingsSaveStatus('saving')
      void backendSaveSettings(nextValue)
        .then(() => {
          setSettingsSaveStatus('saved')
          pushToast('Settings saved.', 'success')
        })
        .catch(() => {
          setSettingsSaveStatus('error')
          pushToast('Settings failed to save.', 'error')
        })

      // Side effect: when the user flips Push Notifications on, request
      // permission + subscribe. Reverting the local toggle if denied keeps
      // the UI honest. Flipping off purges the subscription.
      if (key === 'pushNotifications') {
        if (checked) {
          void enablePushNotifications().then((result) => {
            if (!result.ok) {
              setSettings((current) => ({ ...current, pushNotifications: false }))
              const message =
                result.reason === 'denied'
                  ? 'Browser blocked notifications. Enable them in site settings.'
                  : result.reason === 'unsupported'
                    ? 'Push not supported on this browser/device.'
                    : 'Could not enable push notifications.'
              pushToast(message, 'error')
            } else {
              pushToast('Push notifications enabled.', 'success')
            }
          })
        } else {
          void disablePushNotifications()
        }
      }
    },
    [settings, pushToast],
  )

  return {
    settings,
    setSettings,
    settingsSaveStatus,
    setSettingsSaveStatus,
    preferenceSaveStatus,
    setPreferenceSaveStatus,
    appLanguage,
    setAppLanguage,
    handleSettingsToggle,
  } as const
}
