import { createSupabaseClient } from '../supabaseClient'
import type { AiRiskLevel, SafetyCategory } from '../moderation'

export type AiSafetyTriageInput = {
  reportId: string
  category: SafetyCategory
  details: string
  profileSnapshot?: {
    name?: string
    age?: number
    city?: string
    vibe?: string
    bio?: string
    relationshipGoal?: string
  }
  language?: 'en' | 'ro'
}

export type AiSafetyTriageResult = {
  riskLevel: AiRiskLevel
  categories: SafetyCategory[]
  summary: string
}

/**
 * Calls the ai-safety-triage Edge Function. The function ALSO writes the
 * verdict directly to public.safety_reports via the service role, so a
 * separate UPDATE from the client is not necessary. Returns the verdict
 * for the caller to use locally (e.g. to update an in-memory queue) or
 * null on any failure.
 *
 * Fire-and-forget at the caller; the report row is already persisted by
 * the time this runs. Triage failure just leaves ai_* columns null and
 * the operator queue falls back to chronological sort.
 *
 * Not cached: each report should be triaged exactly once.
 */
export const backendInvokeSafetyTriage = async (
  input: AiSafetyTriageInput,
): Promise<AiSafetyTriageResult | null> => {
  const supabase = createSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase.functions.invoke<{
      riskLevel?: string
      categories?: string[]
      summary?: string
      error?: string
    }>('ai-safety-triage', {
      body: {
        reportId: input.reportId,
        category: input.category,
        details: input.details,
        profileSnapshot: input.profileSnapshot,
        language: input.language ?? 'en',
      },
    })
    if (
      error ||
      !data ||
      typeof data.summary !== 'string' ||
      !data.summary
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        'ai-safety-triage failed:',
        error?.message ?? data?.error ?? 'no result',
      )
      return null
    }
    const risk =
      data.riskLevel === 'high' || data.riskLevel === 'medium' || data.riskLevel === 'low'
        ? (data.riskLevel as AiRiskLevel)
        : 'low'
    return {
      riskLevel: risk,
      categories: Array.isArray(data.categories)
        ? (data.categories.filter((c): c is SafetyCategory =>
            typeof c === 'string',
          ) as SafetyCategory[])
        : [],
      summary: data.summary,
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('ai-safety-triage threw:', error)
    return null
  }
}
