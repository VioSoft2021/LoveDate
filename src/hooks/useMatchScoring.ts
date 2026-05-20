import { useCallback, useState } from 'react'
import {
  PERSONALITY_COGNITIVE_FUNCTIONS,
  ZODIAC_COMPATIBILITY,
} from '../constants'
import {
  compatibilityFromAnswers,
  compatibilityFromCodes,
  personalityCodeFromAnswers,
} from '../services/compatibility'
import { cognitiveFunctionTokens } from '../utils'
import {
  backendInvokeMatchScore,
  type AiMatchScoreResult,
} from '../services/ai/matchScore'
import type {
  AppLanguage,
  ChemistryInsights,
  MatchAnalysis,
  SelfProfile,
} from '../domain'
import type { Profile } from '../services/loveDateApi'

// Phase D2.3 — useMatchScoring
//
// Owns the heuristic baseline scoring functions PLUS the per-candidate
// AI overlay cache. The shape is deliberately a "sync read + async
// fetch" split because the consumer (App.tsx) needs the heuristic
// functions early (filter/sort uses getCompatibilityScore), while the
// AI fetch only runs for the two visible candidates and is fire-and-
// forget.
//
// Consumer calls the hook at the top of the component (just after
// selfProfile is available), uses getCompatibilityScore in filter
// sort, then later in render fires fetchAiScoreFor(topProfile) and
// fetchAiScoreFor(selectedDetailProfile) from a useEffect once those
// values exist. Per-candidate overlays are computed inline by the
// consumer because they're tiny (~10 lines each).

type UseMatchScoringInput = {
  selfProfile: SelfProfile
  isAuthenticated: boolean
  appLanguage: AppLanguage
}

export const useMatchScoring = ({
  selfProfile,
  isAuthenticated,
  appLanguage,
}: UseMatchScoringInput) => {
  const [aiMatchScores, setAiMatchScores] = useState<
    Record<number, AiMatchScoreResult>
  >({})

  // ── Heuristic baseline (synchronous, runs on every profile) ──────
  const getMatchAnalysis = useCallback(
    (profile: Profile): MatchAnalysis => {
      const myInterests = selfProfile.interests.map((interest) =>
        interest.toLowerCase(),
      )
      const sharedInterests = profile.interests.filter((interest) =>
        myInterests.some(
          (mine) =>
            mine.includes(interest.toLowerCase()) ||
            interest.toLowerCase().includes(mine),
        ),
      )
      const ageGap = Math.abs(selfProfile.age - profile.age)
      // Other users' raw answers are no longer publicly readable as of
      // the 2026-05-19 privacy migration. Fall back to the code-based
      // heuristic — lower fidelity but doesn't require their raw
      // answers. E3 AI scoring then overlays the real assessment on
      // the top card.
      const personalityScore = profile.personalityCode
        ? compatibilityFromCodes(
            selfProfile.personalityAnswers,
            profile.personalityCode,
          )
        : compatibilityFromAnswers(
            selfProfile.personalityAnswers,
            profile.personalityAnswers,
          )
      const myZodiacCompat = ZODIAC_COMPATIBILITY[selfProfile.zodiac] ?? []
      const zodiacAligned = myZodiacCompat.includes(profile.zodiac)
      const intentAligned =
        selfProfile.lookingFor.toLowerCase().includes('long') &&
        profile.relationshipGoal === 'Long-term'

      let score = 34
      score += Math.round(personalityScore * 0.32)
      score += Math.min(sharedInterests.length * 6, 18)
      score += Math.max(0, Math.round(8 - ageGap * 1.2))
      score +=
        selfProfile.city.toLowerCase() === profile.city.toLowerCase()
          ? 8
          : profile.distanceKm <= 12
            ? 6
            : profile.distanceKm <= 30
              ? 3
              : 0
      score += intentAligned ? 8 : 0
      score += zodiacAligned ? 5 : 0
      score += profile.verified ? 3 : 0
      const finalScore = Math.max(1, Math.min(99, Math.round(score)))

      const myCode = personalityCodeFromAnswers(selfProfile.personalityAnswers)
      const theirCode =
        profile.personalityCode ||
        personalityCodeFromAnswers(profile.personalityAnswers)
      const reasons: string[] = []
      if (personalityScore >= 82) {
        reasons.push('Your personality rhythm is strongly aligned.')
      } else if (personalityScore >= 68) {
        reasons.push(
          'Your personalities are compatible with a good balance of similarity and contrast.',
        )
      } else {
        reasons.push(
          'You have complementary personality differences that can create spark.',
        )
      }
      if (sharedInterests.length >= 2) {
        reasons.push(
          `Shared interests: ${sharedInterests.slice(0, 2).join(' and ')}.`,
        )
      }
      if (intentAligned) {
        reasons.push(
          'Both of you are clearly oriented toward long-term connection.',
        )
      }
      if (selfProfile.city.toLowerCase() === profile.city.toLowerCase()) {
        reasons.push('You are in the same city, which makes meeting easier.')
      } else if (profile.distanceKm <= 12) {
        reasons.push('You are close enough for spontaneous plans.')
      }
      if (zodiacAligned) {
        reasons.push(
          `Zodiac chemistry: ${selfProfile.zodiac} and ${profile.zodiac}.`,
        )
      }
      if (profile.verified) {
        reasons.push('Verified account adds trust signal.')
      }

      const caution =
        !intentAligned && personalityScore < 65
          ? 'Possible mismatch risk: different relationship pace and intent.'
          : null

      return {
        score: finalScore,
        personalityScore,
        sharedInterests,
        intentAligned,
        zodiacAligned,
        ageGap,
        reasons: reasons.slice(0, 4),
        caution,
        pairCode: `${myCode} x ${theirCode}`,
      }
    },
    [selfProfile],
  )

  const getCompatibilityScore = useCallback(
    (profile: Profile): number => getMatchAnalysis(profile).score,
    [getMatchAnalysis],
  )

  const getChemistryInsights = useCallback(
    (profile: Profile): ChemistryInsights => {
      const match = getMatchAnalysis(profile)
      const myCode = personalityCodeFromAnswers(selfProfile.personalityAnswers)
      const myStack = PERSONALITY_COGNITIVE_FUNCTIONS[myCode]
      const theirCode =
        profile.personalityCode ||
        personalityCodeFromAnswers(profile.personalityAnswers)
      const theirStack = PERSONALITY_COGNITIVE_FUNCTIONS[theirCode]

      let cognitiveOverlapScore = 48
      if (myStack && theirStack) {
        const mine = cognitiveFunctionTokens(myStack)
        const theirs = cognitiveFunctionTokens(theirStack)
        const overlapCount = mine.filter((token) => theirs.includes(token)).length
        const primaryMatch = mine[0] && theirs[0] && mine[0] === theirs[0]
        const supportMatch = mine[1] && theirs[1] && mine[1] === theirs[1]
        cognitiveOverlapScore = Math.min(
          98,
          36 + overlapCount * 14 + (primaryMatch ? 18 : 0) + (supportMatch ? 8 : 0),
        )
      }

      const chemistryScore = Math.max(
        1,
        Math.min(
          99,
          Math.round(
            match.score * 0.58 +
              cognitiveOverlapScore * 0.27 +
              (match.zodiacAligned ? 12 : 0) +
              (match.intentAligned ? 3 : 0),
          ),
        ),
      )

      const summary = match.zodiacAligned
        ? 'Strong chemistry signal from cognitive overlap and zodiac alignment.'
        : 'Good chemistry driven mostly by cognitive-function overlap and compatibility.'

      return {
        chemistryScore,
        cognitiveOverlapScore,
        zodiacAligned: match.zodiacAligned,
        summary,
      }
    },
    [getMatchAnalysis, selfProfile.personalityAnswers],
  )

  // ── AI overlay fetch ─────────────────────────────────────────────
  // Called by the consumer from a useEffect once topProfile +
  // selectedDetailProfile are known. Fire-and-forget; the matchScore
  // service caches results 7 days in localStorage, so even after a
  // reload we only pay the API cost once per profile pair.
  const fetchAiScoreFor = useCallback(
    async (profile: Profile): Promise<void> => {
      if (!isAuthenticated) return
      if (aiMatchScores[profile.id]) return
      const result = await backendInvokeMatchScore({
        selfProfile: {
          name: selfProfile.name,
          age: selfProfile.age,
          city: selfProfile.city,
          vibe: selfProfile.vibe,
          bio: selfProfile.bio,
          interests: selfProfile.interests,
          relationshipGoal: selfProfile.lookingFor,
          zodiac: selfProfile.zodiac,
          workout: selfProfile.workout,
          drinking: selfProfile.drinking,
          smoking: selfProfile.smoking,
          pets: selfProfile.pets,
          religion: selfProfile.religion,
          politics: selfProfile.politics,
          childrenPlan: selfProfile.childrenPlan,
        },
        candidateProfile: {
          id: profile.id,
          name: profile.name,
          age: profile.age,
          city: profile.city,
          vibe: profile.vibe,
          bio: profile.bio,
          interests: profile.interests,
          relationshipGoal: profile.relationshipGoal,
          zodiac: profile.zodiac,
        },
        language: appLanguage,
      })
      if (!result) return
      setAiMatchScores((prev) =>
        prev[profile.id] ? prev : { ...prev, [profile.id]: result },
      )
    },
    [isAuthenticated, aiMatchScores, selfProfile, appLanguage],
  )

  return {
    aiMatchScores,
    getMatchAnalysis,
    getCompatibilityScore,
    getChemistryInsights,
    fetchAiScoreFor,
  } as const
}
