import type { AppLanguage } from '../domain'
import { APP_LANGUAGE_KEY } from './keys'

// Language selection re-enabled 2026-05-30 after the Romanian editorial
// copy pass landed (see memory: project_ro_translation_pass_pending). The
// 2026-05-26 hard-lock to English is reverted.
//
// 2026-05-31 — Privé is launching Romania-first, so a first-time visitor on a
// Romanian-locale browser now opens in Romanian instead of English. Resolution
// order: (1) an explicit in-app choice always wins, (2) else browser locale —
// ro* → Romanian, (3) else English. The toggle still switches either way, and
// that choice is then remembered.
export const readAppLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') {
    return 'en'
  }
  const stored = window.localStorage.getItem(APP_LANGUAGE_KEY)
  if (stored === 'ro' || stored === 'en') {
    return stored
  }
  const locales =
    typeof navigator === 'undefined'
      ? []
      : [navigator.language, ...(navigator.languages ?? [])].filter(Boolean)
  return locales.some((locale) => locale.toLowerCase().startsWith('ro')) ? 'ro' : 'en'
}

export const persistAppLanguage = (language: AppLanguage): void => {
  window.localStorage.setItem(APP_LANGUAGE_KEY, language)
}
