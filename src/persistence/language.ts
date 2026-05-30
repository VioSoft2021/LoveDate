import type { AppLanguage } from '../domain'
import { APP_LANGUAGE_KEY } from './keys'

// Language selection re-enabled 2026-05-30 after the Romanian editorial
// copy pass landed (see memory: project_ro_translation_pass_pending). The
// 2026-05-26 hard-lock to English (return 'en' unconditionally) is reverted;
// we again honor the stored preference, defaulting to English.
export const readAppLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') {
    return 'en'
  }
  const stored = window.localStorage.getItem(APP_LANGUAGE_KEY)
  return stored === 'ro' ? 'ro' : 'en'
}

export const persistAppLanguage = (language: AppLanguage): void => {
  window.localStorage.setItem(APP_LANGUAGE_KEY, language)
}
