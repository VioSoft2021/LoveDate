// LoveDate — AI Match Scoring (Phase E3)
//
// Replaces the hand-rolled match math in src/App.tsx getMatchAnalysis with
// real Claude Sonnet 4.6 reasoning. Given the viewer's profile and a single
// candidate profile, returns:
//   - score: 0..100, the overall compatibility number
//   - reasons: 3 short strings, specific to BOTH profiles (no generic platitudes)
//   - redFlags: 0..3 short strings flagging serious mismatches
//
// The client caches per (selfHash, candidateHash) for 7 days, so reopening
// the same card is free.

import Anthropic from 'npm:@anthropic-ai/sdk@0.40.0'

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
}

type RequestBody = {
  selfProfile: ProfileSummary
  candidateProfile: ProfileSummary & { id: number }
  language?: 'en' | 'ro'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const profileBlock = (label: string, p: ProfileSummary) => {
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
  ]
    .filter(Boolean)
    .join('; ')
  return parts
}

const buildUserPrompt = (body: RequestBody): string =>
  [
    profileBlock('Viewer', body.selfProfile),
    profileBlock('Candidate', body.candidateProfile),
    'Assess how compatible these two are as a potential dating match. Score 0..100 (50 = neutral, 70+ = strong, 85+ = exceptional). Give exactly 3 short, specific reasons tied to actual profile details. List 0..3 red flags ONLY if there is a real concrete mismatch (age gap >15 years, opposing children plans, opposing relationship goals, etc.) — never invent flags to fill the list. Then list 0..3 predicted FRICTION POINTS — soft tensions that are NOT dealbreakers but real friction the pair would likely hit (different paces, communication-style mismatches, hobby-time conflicts). Finally, list 0..3 ACTIONABLE TIPS the Viewer can use to navigate this match well — first-conversation moves grounded in the actual profiles (e.g. "ask about her travel pace early" / "share your weeknight rhythm upfront").',
  ].join('\n')

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const baseRules = `You are a thoughtful matchmaker for a dating app called LoveDate.

Rules:
- score: integer 0..100. 50 is genuinely neutral. Reserve 85+ for matches with multiple concrete points of alignment.
- reasons: exactly 3, each one short sentence (max ~120 chars), referencing at least one specific detail from BOTH profiles. Never use generic platitudes ("they could really hit it off"); name the specifics.
- redFlags: 0..3 entries. Only include real, concrete mismatches such as: age gap > 15 years, opposing relationship goals (one wants casual, the other long-term), opposing children plans, irreconcilable lifestyle (one strict vegetarian + one vocal hunter, etc.). Do NOT include speculative flags. An empty array is the correct answer when there are no real mismatches.
- frictionPoints: 0..3 entries. SOFT predicted tensions — NOT dealbreakers. Different paces, communication-style differences, hobby-time conflicts, energy mismatches, city-vs-distance issues, intensity differences. These should be REAL frictions you can point to in the profiles, not made up. An empty array is the correct answer when both profiles look frictionless.
- tips: 0..3 entries. Each is one short sentence the Viewer can act on in the first few messages or first date — grounded in the actual profiles. Examples: "ask about her weeknight rhythm before suggesting late plans"; "share your work-travel pattern upfront so it doesn't surprise her"; "her bio mentions hiking — propose a daytime walk for date #1, not a club". NEVER write generic platitudes ("be yourself", "be authentic").
- Output JSON only matching the supplied schema. No prose.`

  if (language === 'ro') {
    return `${baseRules}
- Write reasons, redFlags, frictionPoints, and tips in NATURAL ROMANIAN — not literal English-to-Romanian translation, but the way a native Romanian speaker would actually phrase it. Use diacritics (ă, â, î, ș, ț) correctly. Avoid Anglicisms when a clean Romanian equivalent exists. If a profile name or city is in English in the source bio, keep that name as written; everything else is Romanian.`
  }
  return `${baseRules}
- Write reasons, redFlags, frictionPoints, and tips in English.`
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

  const client = new Anthropic({ apiKey })

  try {
    const language = body.language === 'ro' ? 'ro' : 'en'
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

    const block = response.content.find((b) => b.type === 'text')
    const raw = block && 'text' in block ? block.text : ''
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

    return new Response(
      JSON.stringify({ score, reasons, redFlags, frictionPoints, tips }),
      {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
