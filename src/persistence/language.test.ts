import { describe, it, expect, beforeEach } from 'vitest'
import { readAppLanguage, persistAppLanguage } from './language'
import { APP_LANGUAGE_KEY } from './keys'

const setLocale = (language: string, languages: string[] = [language]) => {
  Object.defineProperty(navigator, 'language', { value: language, configurable: true })
  Object.defineProperty(navigator, 'languages', { value: languages, configurable: true })
}

beforeEach(() => {
  window.localStorage.clear()
  setLocale('en-US', ['en-US'])
})

describe('readAppLanguage — explicit choice always wins', () => {
  it('returns a stored Romanian choice even on an English browser', () => {
    setLocale('en-US')
    window.localStorage.setItem(APP_LANGUAGE_KEY, 'ro')
    expect(readAppLanguage()).toBe('ro')
  })

  it('returns a stored English choice even on a Romanian browser', () => {
    setLocale('ro-RO')
    window.localStorage.setItem(APP_LANGUAGE_KEY, 'en')
    expect(readAppLanguage()).toBe('en')
  })
})

describe('readAppLanguage — browser-locale default (no stored choice)', () => {
  it('defaults to Romanian for a ro-RO browser', () => {
    setLocale('ro-RO', ['ro-RO', 'en-US'])
    expect(readAppLanguage()).toBe('ro')
  })

  it('detects Romanian anywhere in navigator.languages', () => {
    setLocale('en-US', ['en-US', 'ro'])
    expect(readAppLanguage()).toBe('ro')
  })

  it('matches Moldovan Romanian (ro-MD) too', () => {
    setLocale('ro-MD', ['ro-MD'])
    expect(readAppLanguage()).toBe('ro')
  })

  it('defaults to English for an English browser', () => {
    setLocale('en-GB', ['en-GB'])
    expect(readAppLanguage()).toBe('en')
  })

  it('falls back to English for a non-Romanian, non-English locale', () => {
    setLocale('fr-FR', ['fr-FR'])
    expect(readAppLanguage()).toBe('en')
  })
})

describe('persistAppLanguage', () => {
  it('round-trips: a saved choice is read back regardless of locale', () => {
    persistAppLanguage('ro')
    setLocale('en-US')
    expect(readAppLanguage()).toBe('ro')
  })
})
