import { useMemo } from 'react'
import type { AiMatchScoreResult } from '../services/ai/matchScore'
import type { ChemistryInsights, MatchAnalysis } from '../domain'
import type { Profile } from '../services/priveApi'

type UseMatchInsightsDeps = {
  getMatchAnalysis: (profile: Profile) => MatchAnalysis
  getChemistryInsights: (profile: Profile) => ChemistryInsights
  aiMatchScores: Record<number, AiMatchScoreResult>
}

// Match analysis + chemistry for ONE profile (the deck's top card or the open
// detail view). When an AI match score has resolved for that profile it's
// merged over the heuristic base. Extracted from App.tsx, where this exact
// logic was duplicated for topProfile and selectedDetailProfile — now called
// once per profile.
export const useMatchInsights = (
  profile: Profile | null | undefined,
  { getMatchAnalysis, getChemistryInsights, aiMatchScores }: UseMatchInsightsDeps,
) => {
  const matchAnalysis = useMemo(() => {
    if (!profile) return null
    const base = getMatchAnalysis(profile)
    const ai = aiMatchScores[profile.id]
    if (!ai) return base
    return {
      ...base,
      score: ai.score,
      reasons: ai.reasons,
      caution: ai.redFlags.length > 0 ? ai.redFlags.join(' · ') : base.caution,
      frictionPoints: ai.frictionPoints ?? [],
      tips: ai.tips ?? [],
    }
  }, [profile, getMatchAnalysis, aiMatchScores])

  const chemistry = useMemo(
    () => (profile ? getChemistryInsights(profile) : null),
    [profile, getChemistryInsights],
  )

  return { matchAnalysis, chemistry }
}
