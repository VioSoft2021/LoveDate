// Privé — AI Date Planner (Phase E4 — first-class date planning)
//
// Replaces the hand-rolled template plan generator in App.tsx
// (generateAiDatePlans). Given both profiles, produces 3 distinct,
// personalized date plans grounded in shared interests, the candidate's
// city, age, vibe, and bio. Each plan returns:
//   - title          one short evocative name (e.g. "Golden Hour
//                    Micro-Date", "Wine + Vinyl Night")
//   - placeType      short description of WHERE (e.g. "cozy cafe +
//                    riverside walk")
//   - budget         "$" / "$$" / "$$$"
//   - duration       e.g. "60-90 min"
//   - pitch          one-sentence summary the user reads to pick a plan
//   - message        a longer first-person message the user could send
//                    verbatim to the match suggesting this plan
//
// Sonnet 4.6 — date planning rewards more careful reasoning than the
// quick icebreakers (Haiku).

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
}

type RequestBody = {
  selfProfile: ProfileSummary
  otherProfile: ProfileSummary
  chemistryScore?: number
  language?: 'en' | 'ro'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const profileBlock = (label: string, p: ProfileSummary) => {
  return [
    `${label}: ${p.name}`,
    p.age ? `age ${p.age}` : null,
    p.city ? `from ${p.city}` : null,
    p.vibe ? `vibe: "${p.vibe.slice(0, 200)}"` : null,
    p.relationshipGoal ? `looking for ${p.relationshipGoal}` : null,
    p.zodiac ? `${p.zodiac}` : null,
    p.interests?.length ? `interests: ${p.interests.slice(0, 10).join(', ')}` : null,
    p.bio?.trim() ? `bio: "${p.bio.trim().slice(0, 400)}"` : null,
  ]
    .filter(Boolean)
    .join('; ')
}

const buildUserPrompt = (body: RequestBody): string => {
  const lines = [
    profileBlock('Sender', body.selfProfile),
    profileBlock('Recipient', body.otherProfile),
  ]
  if (typeof body.chemistryScore === 'number') {
    lines.push(`Chemistry score: ${body.chemistryScore}/100 (heuristic).`)
  }
  lines.push(
    'Generate exactly THREE distinct date plans the Sender could propose to the Recipient. Plans should differ meaningfully in price, intensity, and setting — one casual/cheap, one mid, one signature. Ground every plan in the Recipient\'s actual interests, city, vibe, and bio. Do not invent activities that wouldn\'t plausibly exist in the Recipient\'s city.',
  )
  return lines.join('\n')
}

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const baseRules = `You are a thoughtful date planner inside a dating app called Privé. You suggest specific, well-considered first-date plans for the Sender to propose to the Recipient.

Output rules:
- Exactly 3 plan objects in order: casual ("$"), mid ("$$"), signature ("$$$").
- title: one short evocative name, max 40 chars. NEVER generic ("First date", "Coffee date") — always specific to the pair.
- placeType: 4-10 words naming the kind of venue or activity. May reference the Recipient's city.
- budget: exactly "$", "$$", or "$$$" in that order.
- duration: short human label like "60-90 min", "2-3 hours".
- pitch: one full sentence summarizing the plan and why it fits THIS pair. Reference at least one specific shared interest, vibe, or bio detail.
- message: a longer first-person message (2-4 sentences) the Sender could literally send verbatim to the Recipient proposing this plan. Conversational, warm, no greetings. NEVER claim shared memories. Always end with a question or open invitation.
- Each plan must reference different facets of the profiles — do not repeat the same anchor interest three times.
- No emoji unless the Recipient already uses emoji in their bio.
- No pickup lines, no cheesy hooks. Specific, grounded, real.`

  if (language === 'ro') {
    return `${baseRules}
- Write ALL fields (title, placeType, pitch, message) in NATURAL ROMANIAN — not literal English-to-Romanian translation, but the way a native Romanian speaker would actually phrase it. Use diacritics (ă, â, î, ș, ț) correctly. Avoid Anglicisms when a clean Romanian equivalent exists. If the Recipient's bio includes English words for specific places, brand names, or proper nouns (e.g. "Some Happy days", a venue name), keep those exact words; everything else is Romanian.`
  }
  return `${baseRules}
- Write all fields in English.`
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

  if (!body?.selfProfile?.name || !body?.otherProfile?.name) {
    return new Response(
      JSON.stringify({ error: 'selfProfile.name and otherProfile.name are required' }),
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
              plans: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    placeType: { type: 'string' },
                    budget: { type: 'string' },
                    duration: { type: 'string' },
                    pitch: { type: 'string' },
                    message: { type: 'string' },
                  },
                  required: ['title', 'placeType', 'budget', 'duration', 'pitch', 'message'],
                  additionalProperties: false,
                },
              },
            },
            required: ['plans'],
            additionalProperties: false,
          },
        },
      },
    })

    const block = response.content.find((b) => b.type === 'text')
    const raw = block && 'text' in block ? block.text : ''
    let parsed: { plans?: unknown }
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

    const normaliseBudget = (b: unknown): '$' | '$$' | '$$$' => {
      const s = typeof b === 'string' ? b.trim() : ''
      if (s === '$' || s === '$$' || s === '$$$') return s
      // model occasionally returns "$$ - $$$" or similar — fall back by length
      if (s.startsWith('$$$')) return '$$$'
      if (s.startsWith('$$')) return '$$'
      return '$'
    }

    const cleanString = (v: unknown, max: number): string =>
      typeof v === 'string' ? v.trim().slice(0, max) : ''

    const plans = Array.isArray(parsed.plans)
      ? parsed.plans
          .map((p: Record<string, unknown>) => ({
            title: cleanString(p?.title, 80),
            placeType: cleanString(p?.placeType, 120),
            budget: normaliseBudget(p?.budget),
            duration: cleanString(p?.duration, 40),
            pitch: cleanString(p?.pitch, 360),
            message: cleanString(p?.message, 600),
          }))
          .filter((p) => p.title && p.pitch && p.message)
          .slice(0, 3)
      : []

    if (plans.length === 0) {
      return new Response(
        JSON.stringify({ error: 'model returned no usable plans', raw }),
        {
          status: 502,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ plans }), {
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
