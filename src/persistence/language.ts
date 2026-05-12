import type { AppLanguage } from '../domain'
import { APP_LANGUAGE_KEY } from './keys'

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
