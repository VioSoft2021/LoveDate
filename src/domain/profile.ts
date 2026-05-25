import type { LovePersonality, LikertAnswer } from '../services/compatibility'
import type { SocialConnections } from './social'

export type SelfProfile = {
  name: string
  age: number
  city: string
  vibe: string
  bio: string
  interests: string[]
  pronouns: string
  gender: string
  orientation: string
  lookingFor: string
  relationshipIntent: string
  heightCm: number
  jobTitle: string
  company: string
  education: string
  hometown: string
  languages: string[]
  drinking: string
  smoking: string
  workout: string
  religion: string
  politics: string
  zodiac: string
  childrenPlan: string
  pets: string
  promptOne: string
  promptTwo: string
  promptThree: string
  dealbreakers: string[]
  instagram: string
  anthem: string
  socialConnections: SocialConnections
  socialPromotionOptIn: boolean
  travelMode: boolean
  photos: string[]
  // Auto-awarded by AI Photo Coach when the average score crosses the
  // verification threshold (≥7/10 across at least 3 rated photos).
  // Surfaces as a gold "Verified" badge on the user's own profile and
  // on candidate profiles. 'none' is the default; 'id-verified' is
  // reserved for a future paid verification flow.
  verificationBadge?: 'none' | 'photo-verified' | 'id-verified'
  // Tier A (2026-05-24) — replaces the previous personalityAnswers binary array.
  // Raw quiz answers (14 Likert items, 1-5) kept locally until cloud sync derives
  // the public Big Five vector + attachment style. The full LovePersonality
  // (scores + attachment + Claude-generated reveal) is rebuilt on hydration
  // from cloud + cache, so a missing value here just means "user hasn't taken
  // the new assessment yet."
  personalityAnswers?: LikertAnswer[]
  lovePersonality?: LovePersonality
}
