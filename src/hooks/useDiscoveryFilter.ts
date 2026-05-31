import { useMemo } from 'react'
import { ZODIAC_COMPATIBILITY } from '../constants/profile'
import { toGenderKey } from '../utils/profile'
import type { Filters, HiddenEntry, HiddenReason, SwipeHistory } from '../domain'
import type { Profile } from '../services/priveApi'

type UseDiscoveryFilterInput = {
  allProfiles: Profile[]
  filters: Filters
  history: SwipeHistory
  blockedProfileIds: number[]
  getCompatibilityScore: (profile: Profile) => number
}

// The client-side discovery deck filter, extracted from App.tsx. Pure
// derivations: gender pre-filter → single-pass age/city/interest/goal/distance/
// verified/swiped/zodiac filter (recording WHY each profile was hidden) → sort.
// The AI semantic filter runs as a separate downstream pass in App, narrowing
// clientFilteredProfiles further; the final `filteredProfiles` lives there.
export const useDiscoveryFilter = ({
  allProfiles,
  filters,
  history,
  blockedProfileIds,
  getCompatibilityScore,
}: UseDiscoveryFilterInput) => {
  // Filter dropdown options — distinct values present in the current deck.
  const cityOptions = useMemo(
    () => Array.from(new Set(allProfiles.map((profile) => profile.city))).sort(),
    [allProfiles],
  )
  const genderOptions = useMemo(
    () => Array.from(new Set(allProfiles.map((profile) => profile.gender))),
    [allProfiles],
  )
  const relationshipGoalOptions = useMemo(
    () => Array.from(new Set(allProfiles.map((profile) => profile.relationshipGoal))),
    [allProfiles],
  )

  const swipedIds = useMemo(() => {
    return new Set([...history.likedIds, ...history.passedIds])
  }, [history.likedIds, history.passedIds])

  const genderFilteredProfiles = useMemo(() => {
    if (filters.gender === 'any') {
      return allProfiles
    }

    return allProfiles.filter((profile) => toGenderKey(profile.gender) === filters.gender)
  }, [allProfiles, filters.gender])

  // D4: single-pass filter that also records WHY each profile was hidden, so a
  // missing friend shows the reason inline (1 tap) instead of guessing.
  const { clientFilteredProfiles, hiddenBreakdown } = useMemo(() => {
    const interestFilter = filters.interest.trim().toLowerCase()
    const selectedGoal = filters.relationshipGoal.toLowerCase()

    const kept: Profile[] = []
    const hidden: HiddenEntry[] = []

    for (const profile of genderFilteredProfiles) {
      const reasons: HiddenReason[] = []
      if (blockedProfileIds.includes(profile.id)) {
        reasons.push('blocked')
      }
      if (!(profile.age >= filters.minAge && profile.age <= filters.maxAge)) {
        reasons.push('age')
      }
      if (!(filters.city.length === 0 || profile.city === filters.city)) {
        reasons.push('city')
      }
      if (
        !(
          interestFilter.length === 0 ||
          profile.interests.some((interest) => interest.toLowerCase().includes(interestFilter))
        )
      ) {
        reasons.push('interest')
      }
      if (!(selectedGoal === 'any' || profile.relationshipGoal.toLowerCase() === selectedGoal)) {
        reasons.push('goal')
      }
      if (!(profile.distanceKm <= filters.maxDistanceKm)) {
        reasons.push('distance')
      }
      if (filters.verifiedOnly && !profile.verified) {
        reasons.push('verified-only')
      }
      if (swipedIds.has(profile.id)) {
        reasons.push('already-swiped')
      }
      if (filters.zodiacCompatibility && filters.zodiacCompatibility !== 'any') {
        const compat = ZODIAC_COMPATIBILITY[filters.zodiacCompatibility] || []
        if (!compat.includes(profile.zodiac)) {
          reasons.push('zodiac')
        }
      }
      if (reasons.length === 0) {
        kept.push(profile)
      } else {
        hidden.push({ profile, reasons })
      }
    }

    let sorted = kept

    if (filters.sortBy === 'recommended') {
      sorted = kept.slice().sort((a, b) => getCompatibilityScore(b) - getCompatibilityScore(a))
    }

    if (filters.sortBy === 'nearest') {
      sorted = kept.slice().sort((a, b) => a.distanceKm - b.distanceKm)
    }

    if (filters.sortBy === 'youngest') {
      sorted = kept.slice().sort((a, b) => a.age - b.age)
    }

    if (filters.sortBy === 'oldest') {
      sorted = kept.slice().sort((a, b) => b.age - a.age)
    }

    return { clientFilteredProfiles: sorted, hiddenBreakdown: hidden }
  }, [genderFilteredProfiles, filters, swipedIds, blockedProfileIds, getCompatibilityScore])

  return { cityOptions, genderOptions, relationshipGoalOptions, clientFilteredProfiles, hiddenBreakdown }
}
