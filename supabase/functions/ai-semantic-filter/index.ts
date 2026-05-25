// Privé — AI-First Semantic Filter (Phase E4)
//
// Takes a free-text preference from the viewer ("looking for serious, into
// hiking, not into clubs") and a list of candidate profiles. Returns, for
// each candidate, whether it matches the preference and a one-line reason.
//
// Mirrors the ai-icebreaker / ai-match-score Edge Function pattern:
// - Anthropic SDK via npm:@anthropic-ai/sdk
// - ANTHROPIC_API_KEY from Supabase function secrets (never shipped to client)
// - JSON-schema-constrained output for parse safety
// - Haiku model for speed + cost (semantic match is a routing decision, not
//   a reasoning-heavy task — Sonnet is overkill here)
//
// Designed so the client-side interface (prompt + candidates → filtered list)
// stays stable when a future pgvector-based implementation replaces the body.

import Anthropic from 'npm:@anthropic-ai/sdk@0.40.0'

type Candidate = {
  id: number
  name: string
  age?: number
  city?: string
  bio?: string
  interests?: string[]
  vibe?: string
  relationshipGoal?: string
}

type RequestBody = {
  viewerPrompt: string
  candidates: Candidate[]
  language?: 'en' | 'ro'
}

type FilterResult = {
  profileId: number
  matches: boolean
  reason: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MIN_PROMPT_LENGTH = 5
const MAX_CANDIDATES = 50

const candidateBlock = (i: number, c: Candidate): string => {
  const parts = [
    `#${i + 1} [id=${c.id}] ${c.name}`,
    c.age ? `age ${c.age}` : null,
    c.city ? `from ${c.city}` : null,
    c.vibe ? `vibe: ${c.vibe}` : null,
    c.relationshipGoal ? `looking for ${c.relationshipGoal}` : null,
    c.interests?.length ? `interests: ${c.interests.slice(0, 8).join(', ')}` : null,
    c.bio?.trim() ? `bio: "${c.bio.trim().slice(0, 320)}"` : null,
  ]
    .filter(Boolean)
    .join('; ')
  return parts
}

const buildUserPrompt = (body: RequestBody): string => {
  const lines = [
    `The user is looking for a romantic match. They typed this preference:`,
    `"${body.viewerPrompt.trim()}"`,
    ``,
    `Here are ${body.candidates.length} candidate profiles. For each one decide if it matches the preference, and write ONE short reason (max ~140 chars).`,
    ``,
  ]
  for (let i = 0; i < body.candidates.length; i += 1) {
    lines.push(candidateBlock(i, body.candidates[i]))
  }
  return lines.join('\n')
}

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const baseRules = `You are Privé's matchmaking judge. You read one user's preference text and a list of candidate profiles, and decide which candidates fit that preference.

CRITICAL — HARD CONSTRAINTS vs SOFT PREFERENCES:

A preference is split into two kinds of signals:

1. HARD CONSTRAINTS — explicit, factual requirements. When the user states one, treat it as a strict filter. Mark candidates that do NOT meet it as matches=false, even if they are otherwise compelling. The four hard constraints are:
   - AGE: phrases like "between 45 and 60", "over 50", "under 35", "in their 40s", "around 30". If the candidate's age is outside the stated range, reject.
   - GENDER: phrases like "looking for a woman / women", "a man / men", "non-binary". If the candidate's profile signals a different gender (via name, vibe, bio, pronouns), reject. When ambiguous, accept.
   - CITY / LOCATION: phrases like "from Bucharest", "in Cluj", "in Romania", "anywhere in Europe". The candidate's "from <city>" must match the stated city (or fall inside the stated region). Different city = reject. If the user says "anywhere" or specifies no city, do not apply a location constraint.
   - RELATIONSHIP INTENT: phrases like "long-term", "marriage", "casual", "friends only". If the candidate's "looking for" clearly contradicts (e.g., user wants long-term, candidate wants casual), reject.

2. SOFT PREFERENCES — descriptive qualities (interests, vibe, lifestyle, values, personality). Be generous here: align on overlaps, don't reject for missing details, a vague or empty bio is NOT a reason to reject on soft signals alone.

DECISION RULE:
- If the user states a HARD constraint and the candidate violates it → matches=false.
- Otherwise, if the candidate's soft signals are at least neutral on the preference → matches=true.
- Only reject on soft signals when the profile ACTIVELY CONTRADICTS the preference.

OUTPUT:
- For each candidate, exactly one result: profileId (the [id=N] number), matches (boolean), reason (one short sentence ≤140 chars).
- "reason" must cite ONE specific detail from the profile (the city, the age, an interest, the bio, the vibe) that justifies the decision. No generic phrases like "good fit" or "not a match".
- If rejecting on a hard constraint, the reason MUST name which constraint failed (e.g., "Lives in Cluj, you asked for Bucharest" / "Age 38, outside your 45–60 range").
- Never invent facts that are not in the candidate's profile data.
- Return EVERY candidate. Do not skip any.`

  if (language === 'ro') {
    return `${baseRules}
- Write all "reason" strings in NATURAL ROMANIAN — not literal English-to-Romanian translation. Use correct diacritics (ă, â, î, ș, ț). Avoid Anglicisms when a clean Romanian word exists.`
  }
  return `${baseRules}
- Write all "reason" strings in English.`
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

  if (typeof body?.viewerPrompt !== 'string' || body.viewerPrompt.trim().length < MIN_PROMPT_LENGTH) {
    return new Response(
      JSON.stringify({ error: `viewerPrompt must be at least ${MIN_PROMPT_LENGTH} characters` }),
      {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    )
  }

  if (!Array.isArray(body?.candidates) || body.candidates.length === 0) {
    return new Response(JSON.stringify({ error: 'candidates must be a non-empty array' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  // Cap candidates server-side so cost stays bounded even if a future client
  // accidentally sends a huge pool.
  const candidates = body.candidates.slice(0, MAX_CANDIDATES)

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

  const client = new Anthropic({ apiKey })

  try {
    const language = body.language === 'ro' ? 'ro' : 'en'
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      // Headroom: ~30 tokens per result × 50 candidates ≈ 1500. Add slack.
      max_tokens: 2200,
      system: buildSystemPrompt(language),
      messages: [{ role: 'user', content: buildUserPrompt({ ...body, candidates }) }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    profileId: { type: 'integer' },
                    matches: { type: 'boolean' },
                    reason: { type: 'string' },
                  },
                  required: ['profileId', 'matches', 'reason'],
                  additionalProperties: false,
                },
              },
            },
            required: ['results'],
            additionalProperties: false,
          },
        },
      },
    })

    const block = response.content.find((b) => b.type === 'text')
    const raw = block && 'text' in block ? block.text : ''
    let parsed: { results?: unknown }
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

    const results: FilterResult[] = Array.isArray(parsed.results)
      ? (parsed.results as unknown[])
          .map((r): FilterResult | null => {
            if (!r || typeof r !== 'object') return null
            const item = r as Record<string, unknown>
            const profileId = typeof item.profileId === 'number' ? item.profileId : null
            const matches = typeof item.matches === 'boolean' ? item.matches : null
            const reason = typeof item.reason === 'string' ? item.reason.trim().slice(0, 200) : ''
            if (profileId === null || matches === null) return null
            return { profileId, matches, reason }
          })
          .filter((r): r is FilterResult => r !== null)
      : []

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ error: 'model returned no valid results' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ results }), {
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
