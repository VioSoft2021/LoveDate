import type { Profile } from '../services/loveDateApi'

export type SwipeDirection = 'left' | 'right'
export type SwipeIntent = 'pass' | 'like' | 'super-like'

export type SwipeHistory = {
  likedIds: number[]
  passedIds: number[]
  matchIds: number[]
}

export type SwipeLog = {
  profileId: number
  direction: SwipeDirection
  intent: SwipeIntent
  wasMatch: boolean
}

export type Filters = {
  minAge: number
  maxAge: number
  city: string
  interest: string
  gender: 'any' | 'woman' | 'man' | 'non-binary'
  relationshipGoal: 'any' | Profile['relationshipGoal']
  maxDistanceKm: number
  verifiedOnly: boolean
  sortBy: 'recommended' | 'nearest' | 'youngest' | 'oldest'
  zodiacCompatibility: string
  /**
   * AI-first filter: free-text preference prompt the viewer types in
   * (e.g. "serious, into hiking, not into clubs"). Sent to the E3
   * Sonnet scoring function as `viewerPreference`, which lets the LLM
   * weight + explain the score in light of what the viewer actually
   * wants — rather than the user trying to encode their preferences
   * as a stack of dropdowns and sliders.
   *
   * Empty string disables the prompt; the AI scores neutrally.
   */
  aiPreferencePrompt: string
}

// One reason per filter clause that can hide a profile from the deck.
// D4 surfaces these inline in DiscoverScreen so missing profiles are
// never opaque again.
export type HiddenReason =
  | 'blocked'
  | 'age'
  | 'city'
  | 'interest'
  | 'goal'
  | 'distance'
  | 'verified-only'
  | 'already-swiped'
  | 'zodiac'

export type HiddenEntry = {
  profile: Profile
  reasons: HiddenReason[]
}
