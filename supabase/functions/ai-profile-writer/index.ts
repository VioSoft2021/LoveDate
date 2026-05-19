// LoveDate — AI Profile Writer / Bio Coach (Phase E2)
//
// Reads the user's current bio + the rest of their profile context
// (interests, vibe, age, city, relationship intent) and returns:
//   - critiques: 0..4 short, specific notes on what's hurting the bio
//   - rewrites: exactly 3 alternative bios in the user's own voice
//
// Haiku 4.5 — bios are short, cheap, and high-frequency.
//
// Never auto-applied client-side. The user reads the suggestions and
// taps "Use this" to copy a rewrite into their draft bio.

import Anthropic from 'npm:@anthropic-ai/sdk@0.40.0'

type RequestBody = {
  currentBio?: string
  interests?: string[]
  vibe?: string
  age?: number
  city?: string
  relationshipGoal?: string
  language?: 'en' | 'ro'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const buildUserPrompt = (body: RequestBody): string => {
  const lines: string[] = []
  const currentBio = body.currentBio?.trim() ?? ''
  if (currentBio.length > 0) {
    lines.push(`Current bio: "${currentBio.slice(0, 800)}"`)
  } else {
    lines.push('Current bio: (empty — the user has not written anything yet)')
  }
  const ctx: string[] = []
  if (body.age) ctx.push(`age ${body.age}`)
  if (body.city) ctx.push(`from ${body.city}`)
  if (body.vibe) ctx.push(`vibe: "${body.vibe.slice(0, 160)}"`)
  if (body.relationshipGoal) ctx.push(`looking for ${body.relationshipGoal}`)
  if (body.interests?.length) ctx.push(`interests: ${body.interests.slice(0, 12).join(', ')}`)
  if (ctx.length) {
    lines.push(`Other profile context: ${ctx.join('; ')}.`)
  }
  lines.push(
    'Write 0-4 specific critiques of the current bio (only if there ARE real problems — never invent critiques to fill the list), then write 3 rewritten bios in the user\'s own voice. Each rewrite should be a different angle: one warm + personal, one playful, one direct + grounded. Each rewrite max 240 characters.',
  )
  return lines.join('\n')
}

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const baseRules = `You are an honest, practical bio coach for a dating app called LoveDate. The user is asking for help improving their profile bio. You speak directly, like a smart friend who has read a lot of profiles. You are NOT an AI hype machine.

Output rules (JSON only):
- critiques: 0..4 short strings, each one specific actionable note. Examples: "starts with 'I love adventure' which is the most-used opener on the app — too generic"; "lists hiking and coffee but tells me nothing about HOW you experience them"; "ends mid-thought, finish the sentence". If the bio is already strong, return an empty array. Don't critique to fill space.
- rewrites: exactly 3 rewritten bios. Each one is in the user's own voice (their language, their slang level, their tone — not yours). Each is max 240 characters. They differ in angle: 1) warm + personal, 2) playful, 3) direct + grounded. Each must be grounded in actual details from the profile context (interests, city, vibe). NEVER invent jobs, hobbies, or facts. NEVER use AI clichés: "passionate about", "looking for adventure", "fluent in sarcasm", "love to laugh", "live life to the fullest".

Hard rules:
- Never comment on the user's body, attractiveness, weight, age, race, or other immutable traits.
- Never write in the third person — the bio is FROM the user, written by them.
- Don't start with "Hi" / "Hello" — start with substance.
- No emoji unless the current bio already uses emoji.
- No questions at the end ("what's your story?") — bios are statements.`

  if (language === 'ro') {
    return `${baseRules}
- Write critiques AND rewrites in NATURAL ROMANIAN — not literal English-to-Romanian translation. Use diacritics (ă, â, î, ș, ț) correctly. Avoid Anglicisms when a clean Romanian equivalent exists. If the user's current bio is in English, the rewrites should still be in Romanian (they asked in Romanian). Keep place names and brand names verbatim.`
  }
  return `${baseRules}
- Write critiques and rewrites in English.`
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
      max_tokens: 900,
      system: buildSystemPrompt(language),
      messages: [{ role: 'user', content: buildUserPrompt(body) }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              critiques: { type: 'array', items: { type: 'string' } },
              rewrites: { type: 'array', items: { type: 'string' } },
            },
            required: ['critiques', 'rewrites'],
            additionalProperties: false,
          },
        },
      },
    })

    const block = response.content.find((b) => b.type === 'text')
    const raw = block && 'text' in block ? block.text : ''
    let parsed: { critiques?: unknown; rewrites?: unknown }
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

    const cleanString = (v: unknown, max: number): string =>
      typeof v === 'string' ? v.trim().slice(0, max) : ''

    const critiques = Array.isArray(parsed.critiques)
      ? parsed.critiques
          .map((c) => cleanString(c, 240))
          .filter((c) => c.length > 0)
          .slice(0, 4)
      : []

    const rewrites = Array.isArray(parsed.rewrites)
      ? parsed.rewrites
          .map((r) => cleanString(r, 280))
          .filter((r) => r.length > 0)
          .slice(0, 3)
      : []

    if (rewrites.length === 0) {
      return new Response(
        JSON.stringify({ error: 'model returned no usable rewrites', raw }),
        {
          status: 502,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ critiques, rewrites }), {
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
