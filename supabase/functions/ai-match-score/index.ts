// LoveDate — AI Match Scoring (Phase E3 + 2026-05-27 hardening)
//
// Replaces the hand-rolled match math in src/App.tsx getMatchAnalysis with
// real Claude Sonnet 4.6 reasoning. Given the viewer's profile and a single
// candidate profile, returns:
//   - score: 0..100, the overall compatibility number
//   - reasons: 3 short strings, specific to BOTH profiles (no generic platitudes)
//   - redFlags: 0..3 short strings flagging serious mismatches
//   - frictionPoints / tips: predicted soft tensions + actionable first moves
//
// Caching (2026-05-27):
//   - Client side: localStorage cache per (selfHash, candidateId, candidateHash,
//     viewerPreferenceHash, language) for 7 days — see src/services/ai/matchScore.ts.
//   - Server side (this file): match_score_cache table keyed on SHA-256 of the
//     same request subset, 30-day TTL. Stays warm across rebuilds and devices,
//     so the cache hit rate is much higher than client-only.
//
// Rate-limit resilience (2026-05-27): Anthropic SDK constructed with
// maxRetries=4 so transient 429s during dev test bursts get exponential
// backoff (1s, 2s, 4s, 8s with jitter) instead of failing immediately.

import Anthropic from 'npm:@anthropic-ai/sdk@0.40.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

type ProfileSummary = {
  name: string
  age?: number
  city?: string
  vibe?: string
  bio?: string
  interests?: string[]
  relationshipGoal?: string
  zodiac?: string
  workout?: string
  drinking?: string
  smoking?: string
  pets?: string
  religion?: string
  politics?: string
  childrenPlan?: string
  // Tier A (2026-05-24) — Big Five + Attachment data when the user has
  // taken the new assessment. Optional because beta users without the
  // new quiz still need to score.
  bigFive?: {
    openness: number
    conscientiousness: number
    extraversion: number
    agreeableness: number
    neuroticism: number
  }
  attachmentStyle?: 'secure' | 'anxious' | 'avoidant' | 'disorganized'
}

type RequestBody = {
  selfProfile: ProfileSummary
  candidateProfile: ProfileSummary & { id: number }
  language?: 'en' | 'ro'
  /**
   * AI-first filter prompt the viewer typed in (e.g. "serious, into
   * hiking, not into clubs"). When present, Sonnet weights the score
   * toward candidates that match this preference and uses it as
   * additional context for the reasons/friction/tips lists.
   */
  viewerPreference?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const profileBlock = (label: string, p: ProfileSummary) => {
  // Tier A personality block. Surface Big Five + Attachment when present
  // so Claude can write reasons like "secure-secure pairing offsets her
  // mild extraversion gap" instead of pretending the data doesn't exist.
  const personalityBits: string[] = []
  if (p.bigFive) {
    personalityBits.push(
      `Big Five (0..100): O=${Math.round(p.bigFive.openness)} C=${Math.round(p.bigFive.conscientiousness)} E=${Math.round(p.bigFive.extraversion)} A=${Math.round(p.bigFive.agreeableness)} S=${Math.round(100 - p.bigFive.neuroticism)} (Emotional Stability)`,
    )
  }
  if (p.attachmentStyle) {
    personalityBits.push(`attachment: ${p.attachmentStyle}`)
  }

  const parts = [
    `${label}: ${p.name}`,
    p.age ? `age ${p.age}` : null,
    p.city ? `from ${p.city}` : null,
    p.vibe ? `vibe: "${p.vibe.slice(0, 200)}"` : null,
    p.relationshipGoal ? `looking for ${p.relationshipGoal}` : null,
    p.zodiac ? `${p.zodiac}` : null,
    p.workout ? `workout: ${p.workout}` : null,
    p.drinking ? `drinking: ${p.drinking}` : null,
    p.smoking ? `smoking: ${p.smoking}` : null,
    p.pets ? `pets: ${p.pets}` : null,
    p.religion ? `religion: ${p.religion}` : null,
    p.politics ? `politics: ${p.politics}` : null,
    p.childrenPlan ? `children: ${p.childrenPlan}` : null,
    p.interests?.length ? `interests: ${p.interests.slice(0, 10).join(', ')}` : null,
    p.bio?.trim() ? `bio: "${p.bio.trim().slice(0, 500)}"` : null,
    ...personalityBits,
  ]
    .filter(Boolean)
    .join('; ')
  return parts
}

const buildUserPrompt = (body: RequestBody): string => {
  const viewerPref = body.viewerPreference?.trim()
  const blocks = [profileBlock('Viewer', body.selfProfile), profileBlock('Candidate', body.candidateProfile)]
  if (viewerPref) {
    blocks.push(
      `Viewer's stated preference (treat as a meaningful signal — weight the score and shape the reasoning/friction/tips to reflect how well the Candidate matches this preference; do NOT use it as a hard filter): "${viewerPref.slice(0, 400)}"`,
    )
  }
  blocks.push(
    'Assess how compatible these two are as a potential dating match. Score 0..100 (50 = neutral, 70+ = strong, 85+ = exceptional). Give exactly 3 short, specific reasons tied to actual profile details. List 0..3 red flags ONLY if there is a real concrete mismatch (age gap >15 years, opposing children plans, opposing relationship goals, etc.) — never invent flags to fill the list. Then list 0..3 predicted FRICTION POINTS — soft tensions that are NOT dealbreakers but real friction the pair would likely hit (different paces, communication-style mismatches, hobby-time conflicts). Finally, list 0..3 ACTIONABLE TIPS the Viewer can use to navigate this match well — first-conversation moves grounded in the actual profiles (e.g. "ask about her travel pace early" / "share your weeknight rhythm upfront").',
  )
  return blocks.join('\n')
}

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const baseRules = `You are a thoughtful matchmaker for a dating app called LoveDate.

Rules:
- score: integer 0..100. 50 is genuinely neutral. Reserve 85+ for matches with multiple concrete points of alignment.
- reasons: exactly 3, each one short sentence (max ~120 chars), referencing at least one specific detail from BOTH profiles. Never use generic platitudes ("they could really hit it off"); name the specifics.
- redFlags: 0..3 entries. Only include real, concrete mismatches such as: age gap > 15 years, opposing relationship goals (one wants casual, the other long-term), opposing children plans, irreconcilable lifestyle (one strict vegetarian + one vocal hunter, etc.). Do NOT include speculative flags. An empty array is the correct answer when there are no real mismatches.
- frictionPoints: 0..3 entries. SOFT predicted tensions — NOT dealbreakers. Different paces, communication-style differences, hobby-time conflicts, energy mismatches, city-vs-distance issues, intensity differences. These should be REAL frictions you can point to in the profiles, not made up. An empty array is the correct answer when both profiles look frictionless.
- tips: 0..3 entries. Each is one short sentence the Viewer can act on in the first few messages or first date — grounded in the actual profiles. Examples: "ask about her weeknight rhythm before suggesting late plans"; "share your work-travel pattern upfront so it doesn't surprise her"; "her bio mentions hiking — propose a daytime walk for date #1, not a club". NEVER write generic platitudes ("be yourself", "be authentic").
- When BOTH profiles include Big Five scores (O, C, E, A, S) and attachment style, USE those signals in your reasoning. They are validated psychometric data (BFI-10 + Bartholomew RQ), not vibes. Mention them by their plain-language meaning, not the letters:
  - High Openness (>70) = curious, novelty-seeking; low (<30) = prefers familiar.
  - High Conscientiousness (>70) = organised, planner; low (<30) = spontaneous.
  - High Extraversion (>70) = energised by people; low (<30) = recharges in quiet.
  - High Agreeableness (>70) = warm, cooperative; low (<30) = direct, competitive.
  - High Emotional Stability (>70) = calm under stress; low (<30) = feels stress intensely.
  - Attachment: secure×secure is the strongest dyad; anxious×avoidant is the most-studied painful pairing; a secure partner stabilises any insecure style.
- Output JSON only matching the supplied schema. No prose.`

  if (language === 'ro') {
    return `${baseRules}
- Write reasons, redFlags, frictionPoints, and tips in NATURAL ROMANIAN — not literal English-to-Romanian translation, but the way a native Romanian speaker would actually phrase it. Use diacritics (ă, â, î, ș, ț) correctly. Avoid Anglicisms when a clean Romanian equivalent exists. If a profile name or city is in English in the source bio, keep that name as written; everything else is Romanian.`
  }
  return `${baseRules}
- Write reasons, redFlags, frictionPoints, and tips in English.`
}

// Deterministic cache key. SHA-256 hex of a JSON subset containing
// exactly the fields the model sees in the prompt. Identical inputs →
// identical key → cache hit, regardless of device or build.
const profileCacheFields = (p: ProfileSummary) => ({
  name: p.name,
  age: p.age ?? null,
  city: p.city ?? null,
  vibe: p.vibe ?? null,
  bio: p.bio ?? null,
  interests: p.interests ?? [],
  relationshipGoal: p.relationshipGoal ?? null,
  zodiac: p.zodiac ?? null,
  workout: p.workout ?? null,
  drinking: p.drinking ?? null,
  smoking: p.smoking ?? null,
  pets: p.pets ?? null,
  religion: p.religion ?? null,
  politics: p.politics ?? null,
  childrenPlan: p.childrenPlan ?? null,
  bigFive: p.bigFive
    ? {
        openness: Math.round(p.bigFive.openness),
        conscientiousness: Math.round(p.bigFive.conscientiousness),
        extraversion: Math.round(p.bigFive.extraversion),
        agreeableness: Math.round(p.bigFive.agreeableness),
        neuroticism: Math.round(p.bigFive.neuroticism),
      }
    : null,
  attachmentStyle: p.attachmentStyle ?? null,
})

async function computeCacheKey(body: RequestBody, language: 'en' | 'ro'): Promise<string> {
  const subset = {
    self: profileCacheFields(body.selfProfile),
    candidate: {
      id: body.candidateProfile.id,
      ...profileCacheFields(body.candidateProfile),
    },
    language,
    viewerPreference: (body.viewerPreference ?? '').trim(),
  }
  const json = JSON.stringify(subset)
  const buf = new TextEncoder().encode(json)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  if (!body?.selfProfile?.name || !body?.candidateProfile?.name) {
    return new Response(
      JSON.stringify({ error: 'selfProfile.name and candidateProfile.name are required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    )
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'server missing ANTHROPIC_API_KEY' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    )
  }

  // Server-side cache lookup (2026-05-27). Deterministic SHA-256 of the
  // request subset that affects the score. Stays warm across rebuilds
  // and across both members of a matched pair (User B viewing User A
  // hits the same cache row).
  const language: 'en' | 'ro' = body.language === 'ro' ? 'ro' : 'en'
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const cacheClient = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null

  const cacheKey = await computeCacheKey(body, language)

  if (cacheClient) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: cached } = await cacheClient
        .from('match_score_cache')
        .select('payload, created_at')
        .eq('cache_key', cacheKey)
        .eq('language', language)
        .gte('created_at', thirtyDaysAgo)
        .maybeSingle()
      if (cached?.payload) {
        return new Response(JSON.stringify(cached.payload), {
          status: 200,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        })
      }
    } catch (err) {
      console.warn('[ai-match-score] cache lookup failed:', err)
    }
  }

  // maxRetries=4 → SDK does exponential backoff with jitter on 429 +
  // network errors. Default is 2; bumping to 4 absorbs short bursts
  // during dev testing without bubbling errors up to the user. The
  // npm: type shim doesn't expose maxRetries publicly, so cast through
  // the constructor-args tuple — runtime accepts it.
  const client = new Anthropic({ apiKey, maxRetries: 4 } as ConstructorParameters<typeof Anthropic>[0])

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1400,
      system: buildSystemPrompt(language),
      messages: [{ role: 'user', content: buildUserPrompt(body) }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              // No minimum/maximum here — Anthropic's structured-output
              // schema validator rejects them on integer type. We clamp
              // to 0..100 in the parsing block below.
              score: { type: 'integer' },
              reasons: { type: 'array', items: { type: 'string' } },
              redFlags: { type: 'array', items: { type: 'string' } },
              frictionPoints: { type: 'array', items: { type: 'string' } },
              tips: { type: 'array', items: { type: 'string' } },
            },
            required: ['score', 'reasons', 'redFlags', 'frictionPoints', 'tips'],
            additionalProperties: false,
          },
        },
      },
    })

    const block = response.content.find((b: { type: string }) => b.type === 'text')
    const raw = block && 'text' in block ? (block as { text: string }).text : ''
    let parsed: {
      score?: unknown
      reasons?: unknown
      redFlags?: unknown
      frictionPoints?: unknown
      tips?: unknown
    }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return new Response(
        JSON.stringify({ error: 'model returned non-json', raw }),
        {
          status: 502,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        },
      )
    }

    const score =
      typeof parsed.score === 'number'
        ? Math.max(0, Math.min(100, Math.round(parsed.score)))
        : NaN
    const reasons = Array.isArray(parsed.reasons)
      ? parsed.reasons
          .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
          .slice(0, 3)
      : []
    const cleanList = (raw: unknown, max: number, maxLen: number): string[] =>
      Array.isArray(raw)
        ? raw
            .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
            .map((s) => s.trim().slice(0, maxLen))
            .slice(0, max)
        : []

    const redFlags = cleanList(parsed.redFlags, 3, 240)
    const frictionPoints = cleanList(parsed.frictionPoints, 3, 240)
    const tips = cleanList(parsed.tips, 3, 240)

    if (!Number.isFinite(score) || reasons.length === 0) {
      return new Response(
        JSON.stringify({ error: 'model returned incomplete result', raw }),
        {
          status: 502,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        },
      )
    }

    const payload = { score, reasons, redFlags, frictionPoints, tips }

    // Cache write — best-effort, non-fatal if it fails. Next identical
    // request returns from cache in ~200ms instead of paying for Claude.
    if (cacheClient) {
      try {
        await cacheClient
          .from('match_score_cache')
          .upsert(
            { cache_key: cacheKey, language, payload, created_at: new Date().toISOString() },
            { onConflict: 'cache_key' },
          )
      } catch (err) {
        console.warn('[ai-match-score] cache write failed:', err)
      }
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
