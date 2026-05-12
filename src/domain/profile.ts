import type { PersonalityAnswer } from '../services/compatibility'
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
  personalityAnswers: PersonalityAnswer[]
}
