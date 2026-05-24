export type MatchAnalysis = {
  score: number
  personalityScore: number
  sharedInterests: string[]
  intentAligned: boolean
  zodiacAligned: boolean
  ageGap: number
  reasons: string[]
  caution: string | null
  // Populated by the AI match-score Edge Function (E3 + E6 deepening).
  // Empty arrays when only the heuristic baseline is available.
  frictionPoints?: string[]
  tips?: string[]
}

export type ChemistryInsights = {
  chemistryScore: number
  cognitiveOverlapScore: number
  zodiacAligned: boolean
  summary: string
}
