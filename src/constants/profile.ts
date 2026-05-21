import type { Filters, SelfProfile, SocialConnections, SocialPlatform } from '../domain'
import { PERSONALITY_QUESTIONS } from '../services/compatibility'

export const SOCIAL_PLATFORM_META: Array<{
  id: SocialPlatform
  label: string
  shortLabel: string
}> = [
  { id: 'x', label: 'X (Twitter)', shortLabel: 'X' },
  { id: 'instagram', label: 'Instagram', shortLabel: 'IG' },
  { id: 'facebook', label: 'Facebook', shortLabel: 'FB' },
  { id: 'linkedin', label: 'LinkedIn', shortLabel: 'LI' },
  { id: 'tiktok', label: 'TikTok', shortLabel: 'TT' },
]

export const DEFAULT_SOCIAL_CONNECTIONS: SocialConnections = {
  x: { connected: false, handle: '' },
  instagram: { connected: false, handle: '' },
  facebook: { connected: false, handle: '' },
  linkedin: { connected: false, handle: '' },
  tiktok: { connected: false, handle: '' },
}

export const initialFilters: Filters = {
  minAge: 18,
  maxAge: 60,
  city: '',
  interest: '',
  // Default to 'any' so a brand-new user with no opposite-gender profiles
  // in the deck doesn't see an empty discover screen on first run.
  gender: 'any',
  relationshipGoal: 'any',
  maxDistanceKm: 60,
  verifiedOnly: false,
  sortBy: 'recommended',
  zodiacCompatibility: '',
  aiPreferencePrompt: '',
}

export const ZODIAC_COMPATIBILITY: Record<string, string[]> = {
  Aries: ['Leo', 'Sagittarius', 'Gemini', 'Aquarius', 'Libra'],
  Taurus: ['Virgo', 'Capricorn', 'Cancer', 'Pisces'],
  Gemini: ['Libra', 'Aquarius', 'Aries', 'Leo'],
  Cancer: ['Scorpio', 'Pisces', 'Taurus', 'Virgo'],
  Leo: ['Aries', 'Sagittarius', 'Gemini', 'Libra'],
  Virgo: ['Taurus', 'Capricorn', 'Cancer', 'Scorpio'],
  Libra: ['Gemini', 'Aquarius', 'Leo', 'Sagittarius'],
  Scorpio: ['Cancer', 'Pisces', 'Virgo', 'Capricorn'],
  Sagittarius: ['Aries', 'Leo', 'Libra', 'Aquarius'],
  Capricorn: ['Taurus', 'Virgo', 'Scorpio', 'Pisces'],
  Aquarius: ['Gemini', 'Libra', 'Sagittarius', 'Aries'],
  Pisces: ['Cancer', 'Scorpio', 'Taurus', 'Capricorn'],
}

export const DEFAULT_SELF_PROFILE: SelfProfile = {
  name: 'You',
  age: 28,
  city: 'Prague',
  vibe: 'Builder mode',
  bio: 'Product-minded creative who likes coffee walks, good playlists, and spontaneous city trips.',
  interests: ['Design', 'Travel', 'Coffee', 'Live music'],
  pronouns: 'They/Them',
  gender: 'Non-binary',
  orientation: 'Open',
  lookingFor: 'Long-term relationship',
  relationshipIntent: 'Serious with playful energy',
  heightCm: 172,
  jobTitle: 'Product Designer',
  company: 'Studio Nova',
  education: 'MSc Human-Computer Interaction',
  hometown: 'Brno',
  languages: ['English', 'Czech'],
  drinking: 'Socially',
  smoking: 'Never',
  workout: '3x per week',
  religion: 'Agnostic',
  politics: 'Moderate',
  zodiac: 'Libra',
  childrenPlan: 'Maybe someday',
  pets: 'Dog-friendly',
  promptOne: 'A sunday well spent: farmers market and espresso.',
  promptTwo: 'Most irrational fear: escalators with weird timing.',
  promptThree: 'Green flag I love: emotional maturity.',
  dealbreakers: ['Rudeness', 'Dishonesty'],
  instagram: '@you',
  anthem: 'Midnight City - M83',
  socialConnections: DEFAULT_SOCIAL_CONNECTIONS,
  socialPromotionOptIn: true,
  travelMode: false,
  photos: [
    'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  ],
  personalityAnswers: ['B', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
}

// Dropdown option lists. Some are gated by DB CHECK constraints (gender,
// relationshipIntent → public.profiles.relationship_goal); the rest are
// soft conventions to keep deck filters useful and free-text entropy down.
export const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary'] as const
export const ZODIAC_OPTIONS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const
export const RELATIONSHIP_INTENT_OPTIONS = ['Long-term', 'Short-term', 'Friends', 'Figuring it out'] as const
export const PRONOUNS_OPTIONS = ['She/Her', 'He/Him', 'They/Them', 'She/They', 'He/They', 'Other'] as const
export const ORIENTATION_OPTIONS = ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Asexual', 'Queer', 'Open', 'Other'] as const
export const LOOKING_FOR_OPTIONS = [
  'Long-term relationship',
  'Short-term, open to long',
  'Short-term fun',
  'New friends',
  'Figuring it out',
] as const
export const DRINKING_OPTIONS = ['Never', 'Rarely', 'Socially', 'Often', 'Prefer not to say'] as const
export const SMOKING_OPTIONS = ['Never', 'Socially', 'Regularly', 'Trying to quit', 'Prefer not to say'] as const
export const WORKOUT_OPTIONS = ['Never', 'Sometimes', '1-2x per week', '3x per week', '4-5x per week', 'Daily'] as const
export const CHILDREN_PLAN_OPTIONS = [
  'Want someday',
  'Maybe someday',
  'Don’t want',
  'Have and want more',
  'Have, don’t want more',
  'Prefer not to say',
] as const
export const PETS_OPTIONS = ['Dog person', 'Cat person', 'Both', 'Allergic', 'Want one', 'Prefer not to say'] as const
export const RELIGION_OPTIONS = [
  'Agnostic', 'Atheist', 'Buddhist', 'Christian', 'Hindu', 'Jewish',
  'Muslim', 'Spiritual', 'Other', 'Prefer not to say',
] as const
export const POLITICS_OPTIONS = ['Liberal', 'Moderate', 'Conservative', 'Apolitical', 'Other', 'Prefer not to say'] as const

export const EMPTY_SELF_PROFILE: SelfProfile = {
  name: '',
  age: 0,
  city: '',
  vibe: '',
  bio: '',
  interests: [],
  pronouns: '',
  gender: '',
  orientation: '',
  lookingFor: '',
  relationshipIntent: '',
  heightCm: 0,
  jobTitle: '',
  company: '',
  education: '',
  hometown: '',
  languages: [],
  drinking: '',
  smoking: '',
  workout: '',
  religion: '',
  politics: '',
  zodiac: '',
  childrenPlan: '',
  pets: '',
  promptOne: '',
  promptTwo: '',
  promptThree: '',
  dealbreakers: [],
  instagram: '',
  anthem: '',
  socialConnections: DEFAULT_SOCIAL_CONNECTIONS,
  socialPromotionOptIn: false,
  travelMode: false,
  photos: [],
  personalityAnswers: Array(PERSONALITY_QUESTIONS.length).fill(''),
}
