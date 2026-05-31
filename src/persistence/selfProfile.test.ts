import { describe, it, expect } from 'vitest'
import { buildSelfProfileFromDraft, toProfileDraft, type ProfileDraft } from './selfProfile'
import { EMPTY_SELF_PROFILE } from '../constants'
import { PERSONALITY_QUESTION_COUNT, type LikertAnswer } from '../services/compatibility'
import type { SelfProfile } from '../domain'

// A fully-populated profile to exercise the round-trip. Built off
// EMPTY_SELF_PROFILE so every required field is present.
const FULL_PROFILE: SelfProfile = {
  ...EMPTY_SELF_PROFILE,
  name: 'Alex',
  age: 30,
  city: 'Bucharest',
  bio: 'I make things.',
  interests: ['coffee', 'hiking'],
  languages: ['en', 'ro'],
  dealbreakers: ['smoking'],
  heightCm: 175,
  photos: ['https://example.com/a.jpg'],
}

// Fields the editor never touches — carried through from the saved profile.
const baseCarry = {
  socialConnections: EMPTY_SELF_PROFILE.socialConnections,
  lovePersonality: undefined,
  stabilityAnswers: undefined,
  stabilityProfile: undefined,
  voiceNoteUrl: undefined,
}

const makeDraft = (overrides: Partial<ProfileDraft> = {}): ProfileDraft => ({
  ...toProfileDraft(FULL_PROFILE),
  ...overrides,
})

describe('buildSelfProfileFromDraft — round-trip', () => {
  it('reconstructs the editor-owned fields from toProfileDraft output', () => {
    const result = buildSelfProfileFromDraft(toProfileDraft(FULL_PROFILE), baseCarry)
    expect(result.name).toBe('Alex')
    expect(result.age).toBe(30)
    expect(result.city).toBe('Bucharest')
    expect(result.bio).toBe('I make things.')
    expect(result.interests).toEqual(['coffee', 'hiking'])
    expect(result.languages).toEqual(['en', 'ro'])
    expect(result.dealbreakers).toEqual(['smoking'])
    expect(result.heightCm).toBe(175)
    expect(result.photos).toEqual(['https://example.com/a.jpg'])
  })
})

describe('buildSelfProfileFromDraft — numeric clamping', () => {
  it('clamps age into [18, 99]', () => {
    expect(buildSelfProfileFromDraft(makeDraft({ age: '15' }), baseCarry).age).toBe(18)
    expect(buildSelfProfileFromDraft(makeDraft({ age: '200' }), baseCarry).age).toBe(99)
    expect(buildSelfProfileFromDraft(makeDraft({ age: '34' }), baseCarry).age).toBe(34)
  })

  it('falls back to the empty-profile age only when age is not a finite number', () => {
    // Number('') === 0 is finite → clamps UP to 18 (matches legacy behaviour).
    expect(buildSelfProfileFromDraft(makeDraft({ age: '' }), baseCarry).age).toBe(18)
    // Number('abc') === NaN → not finite → empty-profile fallback.
    expect(buildSelfProfileFromDraft(makeDraft({ age: 'abc' }), baseCarry).age).toBe(EMPTY_SELF_PROFILE.age)
  })

  it('clamps height into [130, 230]', () => {
    expect(buildSelfProfileFromDraft(makeDraft({ heightCm: '100' }), baseCarry).heightCm).toBe(130)
    expect(buildSelfProfileFromDraft(makeDraft({ heightCm: '300' }), baseCarry).heightCm).toBe(230)
    expect(buildSelfProfileFromDraft(makeDraft({ heightCm: '181' }), baseCarry).heightCm).toBe(181)
  })
})

describe('buildSelfProfileFromDraft — CSV list fields', () => {
  it('splits, trims, drops blanks, and caps interests/languages at 6 and dealbreakers at 8', () => {
    const result = buildSelfProfileFromDraft(
      makeDraft({
        interests: ' a , b ,, c ,d,e,f,g,h', // 8 valid → cap 6
        languages: 'en, ro, fr, de, es, it, pt', // 7 valid → cap 6
        dealbreakers: 'a,b,c,d,e,f,g,h,i,j', // 10 valid → cap 8
      }),
      baseCarry,
    )
    expect(result.interests).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(result.languages).toHaveLength(6)
    expect(result.dealbreakers).toHaveLength(8)
  })

  it('falls back to EMPTY_SELF_PROFILE list when the CSV is entirely blank', () => {
    const result = buildSelfProfileFromDraft(makeDraft({ interests: '  ,  , ' }), baseCarry)
    expect(result.interests).toEqual(EMPTY_SELF_PROFILE.interests)
  })

  it('filters blank photos and caps at 9', () => {
    const photos = Array.from({ length: 12 }, (_, i) => `https://x/${i}.jpg`)
    photos.splice(2, 0, '   ') // a blank entry that must be dropped
    const result = buildSelfProfileFromDraft(makeDraft({ photos }), baseCarry)
    expect(result.photos).toHaveLength(9)
    expect(result.photos).not.toContain('   ')
  })
})

describe('buildSelfProfileFromDraft — string fallbacks', () => {
  it('falls back to EMPTY_SELF_PROFILE for blank string fields', () => {
    const result = buildSelfProfileFromDraft(makeDraft({ city: '   ', zodiac: '' }), baseCarry)
    expect(result.city).toBe(EMPTY_SELF_PROFILE.city)
    expect(result.zodiac).toBe(EMPTY_SELF_PROFILE.zodiac)
  })

  it('trims bio without applying a fallback (empty bio stays empty)', () => {
    expect(buildSelfProfileFromDraft(makeDraft({ bio: '  hi  ' }), baseCarry).bio).toBe('hi')
    expect(buildSelfProfileFromDraft(makeDraft({ bio: '   ' }), baseCarry).bio).toBe('')
  })
})

describe('buildSelfProfileFromDraft — personality answers', () => {
  it('keeps a valid 14-length Likert array', () => {
    const answers = Array.from({ length: PERSONALITY_QUESTION_COUNT }, () => 3 as LikertAnswer)
    const result = buildSelfProfileFromDraft(makeDraft({ personalityAnswers: answers }), baseCarry)
    expect(result.personalityAnswers).toEqual(answers)
  })

  it('drops personality answers of the wrong length', () => {
    const result = buildSelfProfileFromDraft(
      makeDraft({ personalityAnswers: [3, 3, 3] as LikertAnswer[] }),
      baseCarry,
    )
    expect(result.personalityAnswers).toBeUndefined()
  })
})

describe('buildSelfProfileFromDraft — draft vs. carry split', () => {
  it('takes socialPromotionOptIn and travelMode from the draft', () => {
    const result = buildSelfProfileFromDraft(
      makeDraft({ socialPromotionOptIn: true, travelMode: true }),
      baseCarry,
    )
    expect(result.socialPromotionOptIn).toBe(true)
    expect(result.travelMode).toBe(true)
  })

  it('carries social graph + stability assessment from carry, not the draft', () => {
    const stabilityAnswers = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2] as LikertAnswer[]
    const result = buildSelfProfileFromDraft(makeDraft(), {
      ...baseCarry,
      socialConnections: EMPTY_SELF_PROFILE.socialConnections,
      stabilityAnswers,
    })
    expect(result.socialConnections).toBe(EMPTY_SELF_PROFILE.socialConnections)
    expect(result.stabilityAnswers).toEqual(stabilityAnswers)
  })

  // Regression: handleSaveVoiceNote writes voiceNoteUrl into the profile, but
  // saveMyProfile used to rebuild the profile WITHOUT it — so editing your bio
  // after recording a clip silently wiped the voice note. It must now survive.
  it('carries voiceNoteUrl through (regression: form save no longer wipes it)', () => {
    const result = buildSelfProfileFromDraft(makeDraft(), {
      ...baseCarry,
      voiceNoteUrl: 'https://cdn.example.com/voice-abc.webm',
    })
    expect(result.voiceNoteUrl).toBe('https://cdn.example.com/voice-abc.webm')
  })
})
