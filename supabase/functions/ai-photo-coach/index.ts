// LoveDate — AI Photo Quality Coach (Phase E2.5)
//
// Reads the user's profile photos and returns specific, actionable
// feedback: per-photo score + strengths + improvements, an overall
// strategy note, and a recommended primary photo index.
//
// Uses Claude Haiku 4.5 with vision — cheap and fast for image
// reasoning. Accepts either:
//   - data URLs (base64-encoded; we split out media_type + data), or
//   - https URLs (Anthropic vision can fetch them directly).
//
// Photos beyond the first 6 are dropped to bound cost.

import Anthropic from 'npm:@anthropic-ai/sdk@0.40.0'

type RequestBody = {
  photos: string[]
  selfProfile?: {
    name?: string
    age?: number
    vibe?: string
  }
  language?: 'en' | 'ro'
}

const MAX_PHOTOS = 6

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ImageBlock =
  | {
      type: 'image'
      source: { type: 'base64'; media_type: string; data: string }
    }
  | {
      type: 'image'
      source: { type: 'url'; url: string }
    }

const isHttpsUrl = (value: string): boolean =>
  value.startsWith('http://') || value.startsWith('https://')

const parseDataUrl = (
  value: string,
): { media_type: string; data: string } | null => {
  if (!value.startsWith('data:')) return null
  const match = value.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  const media_type = match[1] || 'image/jpeg'
  const data = match[2] || ''
  if (!data) return null
  return { media_type, data }
}

const toImageBlock = (photo: string): ImageBlock | null => {
  if (isHttpsUrl(photo)) {
    return { type: 'image', source: { type: 'url', url: photo } }
  }
  const parsed = parseDataUrl(photo)
  if (!parsed) return null
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: parsed.media_type,
      data: parsed.data,
    },
  }
}

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const baseRules = `You are an honest, practical dating-app photo coach. You look at a person's profile photos and tell them what's working and what's hurting their chances. You are NOT a hype machine — you point out real problems so the user can fix them.

Output rules (JSON only, structured-schema):
- perPhoto: one object per photo in the order received.
  - index: zero-based index matching the input.
  - score: integer 1..10. Be honest. A blurry low-light selfie is a 3 or 4, not a 7. Reserve 9-10 for genuinely standout photos with great composition, light, and vibe.
  - strengths: 0..3 short bullet strings noting what works (composition, expression, light, framing, energy). Empty array if nothing notable works.
  - improvements: 0..3 short bullet strings naming concrete fixes (crop tighter, retake in daylight, ditch the sunglasses, smile with eyes, get a wide shot, no group photo as primary, etc.). Empty array if the photo is already strong.
- primaryPick: the index of the photo that should be the FIRST/primary photo. Pick based on: clear face, eye contact or warm expression, good light, no distractions. NOT necessarily the highest-scored photo if it's a wide shot or group.
- overall: one 2-3 sentence strategy summary covering variety (need a wide shot? all selfies?), photo order, and the single biggest fix to make. Be specific, actionable, no fluff.

Hard rules:
- NEVER comment on the person's body, attractiveness, weight, age, race, or other immutable traits. Only craft (composition, light, expression, variety, framing, distractions).
- NEVER hallucinate elements not visible (don't claim a "second person" if you only see one).
- If a photo is unusable (corrupt, all-black, mostly text), say so plainly in improvements and score it 1.`

  if (language === 'ro') {
    return `${baseRules}
- Write strengths, improvements, and overall in NATURAL ROMANIAN — not literal translation. Use diacritics (ă, â, î, ș, ț) correctly. Avoid Anglicisms when a clean Romanian equivalent exists. Keep universally-accepted English photo terms (e.g. "selfie", "crop") if no clean RO alternative.`
  }
  return `${baseRules}
- Write strengths, improvements, and overall in English.`
}

const buildPromptText = (body: RequestBody, photoCount: number): string => {
  const parts: string[] = []
  if (body.selfProfile?.name) {
    const nameLine = body.selfProfile.age
      ? `User: ${body.selfProfile.name}, age ${body.selfProfile.age}.`
      : `User: ${body.selfProfile.name}.`
    parts.push(nameLine)
  }
  if (body.selfProfile?.vibe) {
    parts.push(`Vibe they're going for: "${body.selfProfile.vibe.slice(0, 200)}".`)
  }
  parts.push(
    `Here are ${photoCount} profile photo${photoCount === 1 ? '' : 's'}, in the order they would appear on the user's profile. Photo 0 is currently their primary.`,
  )
  parts.push(
    `Score each photo honestly, recommend which one should be primary, and write a short overall strategy.`,
  )
  return parts.join(' ')
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

  if (!Array.isArray(body?.photos) || body.photos.length === 0) {
    return new Response(
      JSON.stringify({ error: 'photos array required (1..N items)' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    )
  }

  const photos = body.photos.slice(0, MAX_PHOTOS)
  const imageBlocks: ImageBlock[] = []
  const droppedIndices: number[] = []
  photos.forEach((photo, idx) => {
    const block = toImageBlock(photo)
    if (block) {
      imageBlocks.push(block)
    } else {
      droppedIndices.push(idx)
    }
  })

  if (imageBlocks.length === 0) {
    return new Response(
      JSON.stringify({
        error: 'no parseable photos — must be data URLs or https URLs',
      }),
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
    const promptText = buildPromptText(body, imageBlocks.length)

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      system: buildSystemPrompt(language),
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            { type: 'text', text: promptText },
          ],
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              perPhoto: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: { type: 'integer' },
                    score: { type: 'integer' },
                    strengths: { type: 'array', items: { type: 'string' } },
                    improvements: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['index', 'score', 'strengths', 'improvements'],
                  additionalProperties: false,
                },
              },
              primaryPick: { type: 'integer' },
              overall: { type: 'string' },
            },
            required: ['perPhoto', 'primaryPick', 'overall'],
            additionalProperties: false,
          },
        },
      },
    })

    const block = response.content.find((b) => b.type === 'text')
    const raw = block && 'text' in block ? block.text : ''
    let parsed: {
      perPhoto?: unknown
      primaryPick?: unknown
      overall?: unknown
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

    const cleanStringArray = (v: unknown, max: number): string[] =>
      Array.isArray(v)
        ? v
            .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
            .map((s) => s.trim().slice(0, 240))
            .slice(0, max)
        : []

    const perPhoto = Array.isArray(parsed.perPhoto)
      ? parsed.perPhoto
          .map((p: Record<string, unknown>) => ({
            index:
              typeof p?.index === 'number'
                ? Math.max(0, Math.min(imageBlocks.length - 1, Math.round(p.index)))
                : -1,
            score:
              typeof p?.score === 'number'
                ? Math.max(1, Math.min(10, Math.round(p.score)))
                : 5,
            strengths: cleanStringArray(p?.strengths, 3),
            improvements: cleanStringArray(p?.improvements, 3),
          }))
          .filter((p) => p.index >= 0)
      : []

    const primaryPick =
      typeof parsed.primaryPick === 'number'
        ? Math.max(0, Math.min(imageBlocks.length - 1, Math.round(parsed.primaryPick)))
        : 0

    const overall =
      typeof parsed.overall === 'string' ? parsed.overall.trim().slice(0, 600) : ''

    if (perPhoto.length === 0 || !overall) {
      return new Response(
        JSON.stringify({ error: 'model returned incomplete result', raw }),
        {
          status: 502,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({ perPhoto, primaryPick, overall, droppedIndices }),
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
