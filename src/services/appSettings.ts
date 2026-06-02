// src/services/appSettings.ts
//
// Opens the OS app-settings page so a user who hard-denied the microphone can
// re-enable it (Android stops prompting after a "don't ask again" denial). Backed
// by the native AppSettings plugin (see AppSettingsPlugin.java); a no-op on the
// web, where the toast's text guidance is the fallback.
import { Capacitor, registerPlugin } from '@capacitor/core'

interface AppSettingsPlugin {
  open(): Promise<void>
}

const AppSettings = registerPlugin<AppSettingsPlugin>('AppSettings')

/** True only where we can actually jump to the OS settings page. */
export const canOpenAppSettings = (): boolean => Capacitor.isNativePlatform()

export const openAppSettings = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await AppSettings.open()
  } catch {
    // Plugin unavailable / intent failed — the toast text still tells the user
    // where to go manually.
  }
}
