export type MatchAnalysis = {
  score: number
  personalityScore: number
  sharedInterests: string[]
  intentAligned: boolean
  zodiacAligned: boolean
  ageGap: number
  reasons: string[]
  caution: string | null
  pairCode: string
}

export type ChemistryInsights = {
  chemistryScore: number
  cognitiveOverlapScore: number
  zodiacAligned: boolean
  summary: string
}
