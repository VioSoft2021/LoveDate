import type { Profile } from '../services/loveDateApi'
import type { Filters } from '../domain'

export const getProfilePhotos = (profile: Profile): string[] => profile.photos

export const getProfilePrompts = (profile: Profile): string[] => [
  `A perfect first date for ${profile.name}: ${profile.interests[0]} and great coffee.`,
  `${profile.name} is currently obsessed with: ${profile.interests[1]}.`,
  `Ask ${profile.name} about: ${profile.vibe.toLowerCase()}.`,
]

export const toGenderKey = (gender: Profile['gender']): Filters['gender'] => {
  if (gender === 'Woman') {
    return 'woman'
  }

  if (gender === 'Man') {
    return 'man'
  }

  return 'non-binary'
}
