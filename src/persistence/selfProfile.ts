import type { SelfProfile, SocialConnection, SocialConnections, SocialPlatform } from '../domain'
import {
  DEFAULT_SOCIAL_CONNECTIONS,
  EMPTY_SELF_PROFILE,
  SOCIAL_PLATFORM_META,
} from '../constants'
import { PERSONALITY_QUESTION_COUNT, type LikertAnswer } from '../services/compatibility'
import { backendReadSelfProfile } from '../services/backendApi'

/**
 * Tier A — sanitize the 14 Likert answers (1-5 integers). Anything outside
 * range or missing returns null so we can detect "user hasn't taken the
 * new assessment yet."
 */
const sanitizeLikertAnswers = (raw: unknown): LikertAnswer[] | undefined => {
  if (!Array.isArray(raw) || raw.length !== PERSONALITY_QUESTION_COUNT) {
    return undefined
  }
  const cleaned: LikertAnswer[] = []
  for (const v of raw) {
    if (v === 1 || v === 2 || v === 3 || v === 4 || v === 5) {
      cleaned.push(v)
    } else {
      return undefined // any invalid value → treat as not-yet-taken
    }
  }
  return cleaned
}

export const normalizeSelfProfile = (raw: unknown): SelfProfile => {
  try {
    const parsed = (raw ?? null) as Partial<SelfProfile> | null
    if (!parsed) {
      return EMPTY_SELF_PROFILE
    }
    const safeInterests = Array.isArray(parsed.interests)
      ? parsed.interests.filter((value): value is string => typeof value === 'string').slice(0, 6)
      : EMPTY_SELF_PROFILE.interests
    const safeLanguages = Array.isArray(parsed.languages)
      ? parsed.languages.filter((value): value is string => typeof value === 'string').slice(0, 6)
      : EMPTY_SELF_PROFILE.languages
    const safeDealbreakers = Array.isArray(parsed.dealbreakers)
      ? parsed.dealbreakers.filter((value): value is string => typeof value === 'string').slice(0, 8)
      : EMPTY_SELF_PROFILE.dealbreakers
    const safePhotos = Array.isArray(parsed.photos)
      ? parsed.photos
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .slice(0, 9)
      : EMPTY_SELF_PROFILE.photos

    const safeString = (value: unknown, fallback = ''): string => {
      return typeof value === 'string' && value.trim().length > 0 ? value : fallback
    }
    const parsedSocialRaw = parsed.socialConnections
    const parsedSocialObject =
      parsedSocialRaw && typeof parsedSocialRaw === 'object'
        ? (parsedSocialRaw as Partial<Record<SocialPlatform, Partial<SocialConnection>>>)
        : {}
    const safeSocialConnections = SOCIAL_PLATFORM_META.reduce((accumulator, platform) => {
      const next = parsedSocialObject[platform.id]
      accumulator[platform.id] = {
        connected:
          typeof next?.connected === 'boolean'
            ? next.connected
            : DEFAULT_SOCIAL_CONNECTIONS[platform.id].connected,
        handle:
          typeof next?.handle === 'string'
            ? next.handle.slice(0, 60)
            : DEFAULT_SOCIAL_CONNECTIONS[platform.id].handle,
      }
      return accumulator
    }, {} as SocialConnections)

    return {
      name: safeString(parsed.name, EMPTY_SELF_PROFILE.name),
      age: Number.isFinite(parsed.age)
        ? Math.min(99, Math.max(18, Number(parsed.age)))
        : EMPTY_SELF_PROFILE.age,
      city: safeString(parsed.city, EMPTY_SELF_PROFILE.city),
      vibe: safeString(parsed.vibe, EMPTY_SELF_PROFILE.vibe),
      bio: safeString(parsed.bio, EMPTY_SELF_PROFILE.bio),
      interests: safeInterests.length > 0 ? safeInterests : EMPTY_SELF_PROFILE.interests,
      pronouns: safeString(parsed.pronouns, EMPTY_SELF_PROFILE.pronouns),
      gender: safeString(parsed.gender, EMPTY_SELF_PROFILE.gender),
      orientation: safeString(parsed.orientation, EMPTY_SELF_PROFILE.orientation),
      lookingFor: safeString(parsed.lookingFor, EMPTY_SELF_PROFILE.lookingFor),
      relationshipIntent: safeString(parsed.relationshipIntent, EMPTY_SELF_PROFILE.relationshipIntent),
      heightCm: Number.isFinite(parsed.heightCm)
        ? Math.min(230, Math.max(130, Number(parsed.heightCm)))
        : EMPTY_SELF_PROFILE.heightCm,
      jobTitle: safeString(parsed.jobTitle, EMPTY_SELF_PROFILE.jobTitle),
      company: safeString(parsed.company, EMPTY_SELF_PROFILE.company),
      education: safeString(parsed.education, EMPTY_SELF_PROFILE.education),
      hometown: safeString(parsed.hometown, EMPTY_SELF_PROFILE.hometown),
      languages: safeLanguages.length > 0 ? safeLanguages : EMPTY_SELF_PROFILE.languages,
      drinking: safeString(parsed.drinking, EMPTY_SELF_PROFILE.drinking),
      smoking: safeString(parsed.smoking, EMPTY_SELF_PROFILE.smoking),
      workout: safeString(parsed.workout, EMPTY_SELF_PROFILE.workout),
      religion: safeString(parsed.religion, EMPTY_SELF_PROFILE.religion),
      politics: safeString(parsed.politics, EMPTY_SELF_PROFILE.politics),
      zodiac: safeString(parsed.zodiac, EMPTY_SELF_PROFILE.zodiac),
      childrenPlan: safeString(parsed.childrenPlan, EMPTY_SELF_PROFILE.childrenPlan),
      pets: safeString(parsed.pets, EMPTY_SELF_PROFILE.pets),
      promptOne: safeString(parsed.promptOne, EMPTY_SELF_PROFILE.promptOne),
      promptTwo: safeString(parsed.promptTwo, EMPTY_SELF_PROFILE.promptTwo),
      promptThree: safeString(parsed.promptThree, EMPTY_SELF_PROFILE.promptThree),
      dealbreakers: safeDealbreakers.length > 0 ? safeDealbreakers : EMPTY_SELF_PROFILE.dealbreakers,
      instagram: safeString(parsed.instagram, EMPTY_SELF_PROFILE.instagram),
      anthem: safeString(parsed.anthem, EMPTY_SELF_PROFILE.anthem),
      socialConnections: safeSocialConnections,
      socialPromotionOptIn:
        typeof parsed.socialPromotionOptIn === 'boolean'
          ? parsed.socialPromotionOptIn
          : EMPTY_SELF_PROFILE.socialPromotionOptIn,
      travelMode: typeof parsed.travelMode === 'boolean' ? parsed.travelMode : EMPTY_SELF_PROFILE.travelMode,
      photos: safePhotos.length > 0 ? safePhotos : EMPTY_SELF_PROFILE.photos,
      personalityAnswers: sanitizeLikertAnswers(parsed.personalityAnswers),
      lovePersonality: parsed.lovePersonality,
    }
  } catch {
    return EMPTY_SELF_PROFILE
  }
}

export const readSelfProfile = (email = ''): SelfProfile =>
  normalizeSelfProfile(backendReadSelfProfile(email))

export const toProfileDraft = (profile: SelfProfile) => ({
  name: profile.name,
  age: profile.age > 0 ? String(profile.age) : '',
  city: profile.city,
  vibe: profile.vibe,
  bio: profile.bio,
  interests: profile.interests.join(', '),
  pronouns: profile.pronouns,
  gender: profile.gender,
  orientation: profile.orientation,
  lookingFor: profile.lookingFor,
  relationshipIntent: profile.relationshipIntent,
  heightCm: profile.heightCm > 0 ? String(profile.heightCm) : '',
  jobTitle: profile.jobTitle,
  company: profile.company,
  education: profile.education,
  hometown: profile.hometown,
  languages: profile.languages.join(', '),
  drinking: profile.drinking,
  smoking: profile.smoking,
  workout: profile.workout,
  religion: profile.religion,
  politics: profile.politics,
  zodiac: profile.zodiac,
  childrenPlan: profile.childrenPlan,
  pets: profile.pets,
  promptOne: profile.promptOne,
  promptTwo: profile.promptTwo,
  promptThree: profile.promptThree,
  dealbreakers: profile.dealbreakers.join(', '),
  instagram: profile.instagram,
  anthem: profile.anthem,
  socialPromotionOptIn: profile.socialPromotionOptIn,
  travelMode: profile.travelMode,
  photos: profile.photos,
  personalityAnswers: profile.personalityAnswers,
  lovePersonality: profile.lovePersonality,
})
