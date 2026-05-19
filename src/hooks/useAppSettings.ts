import { useState } from 'react'
import { readAppLanguage } from '../persistence'
import type { SettingsPayload } from '../services/backendApi'
import type { AppLanguage } from '../domain'

// Phase D1.8 — useAppSettings
//
// Owns the global app settings (push/email notification toggles),
// the app language, and the save-status indicators for both. The
// save handlers themselves (handleSettingsToggle,
// handlePreferenceSave) stay in App.tsx for now — they reach into
// backend services + push subscription + toast surfaces.

const DEFAULT_SETTINGS: SettingsPayload = {
  pushNotifications: true,
  emailNotifications: false,
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const useAppSettings = () => {
  const [settings, setSettings] = useState<SettingsPayload>(DEFAULT_SETTINGS)
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<SaveStatus>('idle')
  const [preferenceSaveStatus, setPreferenceSaveStatus] = useState<SaveStatus>('idle')
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => readAppLanguage())

  return {
    settings,
    setSettings,
    settingsSaveStatus,
    setSettingsSaveStatus,
    preferenceSaveStatus,
    setPreferenceSaveStatus,
    appLanguage,
    setAppLanguage,
  } as const
}
