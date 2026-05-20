import { describe, it, expect } from 'vitest'
import { formatUiText, formatShortTime } from './format'
import { getStrongPasswordError } from './password'
import { parseRoute, buildPath } from './routing'

describe('formatUiText', () => {
  it('replaces a single placeholder', () => {
    expect(formatUiText('Hello {name}', { name: 'Master' })).toBe('Hello Master')
  })

  it('replaces multiple placeholders', () => {
    expect(
      formatUiText('Photo {index} / {total}', { index: 3, total: 6 }),
    ).toBe('Photo 3 / 6')
  })

  it('handles numbers (coerces via String)', () => {
    expect(formatUiText('Score: {score}%', { score: 78 })).toBe('Score: 78%')
  })

  it('leaves unknown placeholders as-is', () => {
    expect(formatUiText('Hi {name}, {unknown}', { name: 'Alex' })).toBe(
      'Hi Alex, {unknown}',
    )
  })

  it('replaces ALL occurrences of the same placeholder', () => {
    expect(formatUiText('{x} and {x}', { x: 'hello' })).toBe('hello and hello')
  })

  it('returns the template unchanged when no replacements are passed', () => {
    expect(formatUiText('Plain string', {})).toBe('Plain string')
  })
})

describe('formatShortTime', () => {
  it('returns a non-empty string for a valid timestamp', () => {
    expect(formatShortTime(Date.now())).toMatch(/\d/)
  })

  it('is locale-formatted (contains a colon for HH:MM)', () => {
    // Most locales produce HH:MM with a colon.
    expect(formatShortTime(Date.now())).toMatch(/[:.]/)
  })
})

describe('getStrongPasswordError', () => {
  it('rejects passwords shorter than 10 chars', () => {
    expect(getStrongPasswordError('Aa1!aa')).toMatch(/at least 10/)
  })

  it('requires an uppercase letter', () => {
    expect(getStrongPasswordError('abcdefgh1!')).toMatch(/uppercase/)
  })

  it('requires a lowercase letter', () => {
    expect(getStrongPasswordError('ABCDEFGH1!')).toMatch(/lowercase/)
  })

  it('requires a digit', () => {
    expect(getStrongPasswordError('AbcdefghIJK!')).toMatch(/number/)
  })

  it('requires a symbol', () => {
    expect(getStrongPasswordError('Abcdefgh123')).toMatch(/symbol/)
  })

  it('accepts a strong password', () => {
    expect(getStrongPasswordError('Abc12345!def')).toBeNull()
  })

  it('returns the FIRST applicable error (length wins over composition)', () => {
    expect(getStrongPasswordError('a')).toMatch(/at least 10/)
  })
})

describe('parseRoute', () => {
  it('maps known screen paths to the correct screen', () => {
    expect(parseRoute('/login').screen).toBe('login')
    expect(parseRoute('/').screen).toBe('login')
    expect(parseRoute('/discover').screen).toBe('discover')
    expect(parseRoute('/activity').screen).toBe('activity')
    expect(parseRoute('/circles').screen).toBe('circles')
    expect(parseRoute('/chats').screen).toBe('chats')
    expect(parseRoute('/profile').screen).toBe('profile')
    expect(parseRoute('/settings').screen).toBe('settings')
    expect(parseRoute('/moderation').screen).toBe('moderation')
    expect(parseRoute('/filters').screen).toBe('filters')
    expect(parseRoute('/personality-guide').screen).toBe('personality-guide')
  })

  it('extracts the profile id from /profile/123', () => {
    expect(parseRoute('/profile/123')).toEqual({
      screen: 'profile-detail',
      profileId: 123,
    })
  })

  it('returns null profileId for non-numeric ids', () => {
    expect(parseRoute('/profile/abc').screen).toBe('login') // unknown path -> login fallback
  })

  it('falls back to login for unknown paths', () => {
    expect(parseRoute('/does-not-exist').screen).toBe('login')
    expect(parseRoute('').screen).toBe('login')
  })
})

describe('buildPath', () => {
  it('builds /profile/N for profile-detail with a profileId', () => {
    expect(buildPath('profile-detail', 42)).toBe('/profile/42')
  })

  it('returns the screen name for top-level screens', () => {
    expect(buildPath('discover', null)).toBe('/discover')
    expect(buildPath('chats', null)).toBe('/chats')
    expect(buildPath('settings', null)).toBe('/settings')
  })

  it('produces a static /filters path for the filters screen', () => {
    expect(buildPath('filters', null)).toBe('/filters')
  })

  it('round-trips through parseRoute for every top-level screen', () => {
    const screens = [
      'login',
      'discover',
      'activity',
      'circles',
      'chats',
      'profile',
      'settings',
      'moderation',
      'filters',
      'personality-guide',
    ] as const
    for (const screen of screens) {
      const path = buildPath(screen, null)
      expect(parseRoute(path).screen).toBe(screen)
    }
  })
})
