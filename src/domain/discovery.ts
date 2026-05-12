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
}
