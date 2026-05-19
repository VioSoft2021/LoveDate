// LoveDate — AI Safety Triage (Phase #5)
//
// When a user submits a safety_report, the client fires this function
// fire-and-forget with the report id + content. The function:
//   1. Calls Claude Haiku 4.5 with the report category, free-text
//      details, and reported profile snapshot.
//   2. Gets structured output: {riskLevel, categories[], summary}.
//   3. Writes the verdict back to public.safety_reports using a
//      service-role Supabase client so the row update bypasses RLS.
//
// The Moderation Center UI then sorts the queue by risk_level DESC +
// created_at DESC so harassment / scam reports float to the top.

import Anthropic from 'npm:@anthropic-ai/sdk@0.40.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

type SafetyCategory =
  | 'spam'
  | 'scam'
  | 'harassment'
  | 'hate'
  | 'nudity'
  | 'underage'
  | 'impersonation'
  | 'other'

type RequestBody = {
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

const VALID_CATEGORIES: SafetyCategory[] = [
  'spam',
  'scam',
  'harassment',
  'hate',
  'nudity',
  'underage',
  'impersonation',
  'other',
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const baseRules = `You are a safety triage analyst for a dating app called LoveDate. A user has reported another profile. You read the report and the reported profile's public data, then classify risk for a human moderator's queue.

Output (JSON only):
- riskLevel: "low" | "medium" | "high". HIGH only when there is a credible signal of real harm — explicit harassment, scam patterns (asking for money/crypto, suspicious links, off-platform pressure), underage indication, impersonation, threats, or explicit hate. MEDIUM for content that's clearly wrong but doesn't rise to "act now" — spam, suggestive nudity outside policy, repeated low-effort. LOW for minor friction, taste mismatches, or reports that look retaliatory.
- categories: 1..3 from this exact set: ["spam","scam","harassment","hate","nudity","underage","impersonation","other"]. The reporter's chosen category is a hint, not a constraint — if the evidence actually points elsewhere, classify what's there.
- summary: ONE plain-language sentence (max ~180 chars) the human moderator reads to decide whether to escalate. Be specific to what the reporter wrote and what's in the profile. NEVER say "this report claims" — paraphrase to evidence.

Hard rules:
- NEVER comment on the reported user's appearance, body, age (other than underage suspicion), race, or other immutable traits.
- NEVER conclude HIGH risk on weak evidence (one ambiguous phrase). Reserve HIGH for real signals.
- If the reporter's details are empty or low-signal, lean LOW and say so in the summary.
- Output strict JSON matching the schema.`

  if (language === 'ro') {
    return `${baseRules}
- Write the summary in NATURAL ROMANIAN with diacritics. Keep categories array in English (they're keys, not display labels). Avoid Anglicisms where clean Romanian works.`
  }
  return `${baseRules}
- Write the summary in English.`
}

const buildUserPrompt = (body: RequestBody): string => {
  const lines: string[] = []
  lines.push(`Reporter-chosen category: ${body.category}`)
  lines.push(
    `Reporter details: ${body.details?.trim() ? `"${body.details.trim().slice(0, 800)}"` : '(empty)'}`,
  )
  const snap = body.profileSnapshot ?? {}
  const profileBits: string[] = []
  if (snap.name) profileBits.push(`name: ${snap.name}`)
  if (snap.age) profileBits.push(`age: ${snap.age}`)
  if (snap.city) profileBits.push(`city: ${snap.city}`)
  if (snap.vibe) profileBits.push(`vibe: "${snap.vibe.slice(0, 200)}"`)
  if (snap.relationshipGoal) profileBits.push(`looking for: ${snap.relationshipGoal}`)
  if (snap.bio) profileBits.push(`bio: "${snap.bio.slice(0, 500)}"`)
  if (profileBits.length) {
    lines.push(`Reported profile snapshot: ${profileBits.join('; ')}`)
  } else {
    lines.push('Reported profile snapshot: (none provided)')
  }
  lines.push(
    'Classify risk and write a one-sentence moderator summary. Output JSON only.',
  )
  return lines.join('\n')
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

  if (!body?.reportId || typeof body.reportId !== 'string') {
    return new Response(JSON.stringify({ error: 'reportId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({
        error: 'server missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    )
  }

  const anthropic = new Anthropic({ apiKey })
  const admin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const language = body.language === 'ro' ? 'ro' : 'en'
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: buildSystemPrompt(language),
      messages: [{ role: 'user', content: buildUserPrompt(body) }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              riskLevel: { type: 'string' },
              categories: { type: 'array', items: { type: 'string' } },
              summary: { type: 'string' },
            },
            required: ['riskLevel', 'categories', 'summary'],
            additionalProperties: false,
          },
        },
      },
    })

    const block = response.content.find((b) => b.type === 'text')
    const raw = block && 'text' in block ? block.text : ''
    let parsed: {
      riskLevel?: unknown
      categories?: unknown
      summary?: unknown
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

    const riskLevelRaw = typeof parsed.riskLevel === 'string' ? parsed.riskLevel.toLowerCase() : ''
    const riskLevel =
      riskLevelRaw === 'low' || riskLevelRaw === 'medium' || riskLevelRaw === 'high'
        ? riskLevelRaw
        : 'low'

    const categories = Array.isArray(parsed.categories)
      ? parsed.categories
          .filter((c): c is string => typeof c === 'string')
          .map((c) => c.toLowerCase().trim())
          .filter((c): c is SafetyCategory => VALID_CATEGORIES.includes(c as SafetyCategory))
          .slice(0, 3)
      : []

    const summary =
      typeof parsed.summary === 'string'
        ? parsed.summary.trim().slice(0, 240)
        : ''

    if (!summary) {
      return new Response(
        JSON.stringify({ error: 'model returned empty summary', raw }),
        {
          status: 502,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        },
      )
    }

    // Write verdict back via the service-role client — bypasses RLS so we
    // can update a row the requester doesn't own.
    const { error: updateError } = await admin
      .from('safety_reports')
      .update({
        ai_risk_level: riskLevel,
        ai_categories: categories.length > 0 ? categories : [body.category],
        ai_summary: summary,
        ai_triaged_at: new Date().toISOString(),
      })
      .eq('id', body.reportId)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `db update failed: ${updateError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({ riskLevel, categories, summary }),
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
