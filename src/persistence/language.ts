import type { AppLanguage } from '../domain'
import { APP_LANGUAGE_KEY } from './keys'

// 2026-05-26: app language is hard-locked to English until the
// Romanian translation pass (see memory:
// project_ro_translation_pass_pending) lands. The picker is hidden
// in the UI; this reader returns 'en' regardless of any stored
// value so existing users who previously chose Romanian don't get
// stuck on the literal/awkward translations. The localStorage key
// is preserved (still readable below for diagnostics) so we can
// restore the previous behavior with a one-line revert when RO is
// ready.
export const readAppLanguage = (): AppLanguage => {
  return 'en'
}

export const persistAppLanguage = (language: AppLanguage): void => {
  window.localStorage.setItem(APP_LANGUAGE_KEY, language)
}
