// Privé — AI Love Personality Reveal (Tier A, Phase 3)
//
// Takes a user's Big Five (0..100 per dimension) + primary attachment
// style and writes a cinematic, per-user "Love Personality" reveal:
// an archetype name, a single resonant headline, three short
// paragraphs describing how they love, and small strengths /
// growth-edges chips.
//
// Mirrors the ai-semantic-filter pattern (Anthropic SDK, JSON-schema
// output, EN/RO branching, ANTHROPIC_API_KEY from function secrets).
// The model is Sonnet (this is the cinematic moment in onboarding —
// worth the tokens). Cost ≈ $0.02 per reveal.
//
// The reveal is cached client-side (localStorage, hash of inputs) so
// re-opening the profile after onboarding doesn't repeat the call.

import Anthropic from 'npm:@anthropic-ai/sdk@0.40.0'

type BigFiveScores = {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'disorganized'

type RequestBody = {
  bigFive: BigFiveScores
  attachment: AttachmentStyle
  attachmentRatings?: {
    secure: number
    anxious: number
    avoidant: number
    disorganized: number
  }
  language?: 'en' | 'ro'
  selfName?: string
}

type RevealResult = {
  archetypeName: string
  headline: string
  description: string
  strengths: string[]
  growthEdges: string[]
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_ATTACHMENTS: AttachmentStyle[] = ['secure', 'anxious', 'avoidant', 'disorganized']

const ATTACHMENT_PROSE_EN: Record<AttachmentStyle, string> = {
  secure: 'Secure (comfortable with both closeness and independence; tends to stabilise their partner).',
  anxious: 'Anxious-preoccupied (wants deep closeness; sometimes fears rejection or abandonment).',
  avoidant: 'Avoidant-dismissive (highly values independence; deep intimacy can feel suffocating).',
  disorganized: 'Disorganized-fearful (wants closeness but finds it hard to fully trust; intimacy is approached carefully).',
}

const ATTACHMENT_PROSE_RO: Record<AttachmentStyle, string> = {
  secure: 'Sigur (confortabil cu apropierea și cu independența; tinde să-și stabilizeze partenerul).',
  anxious: 'Anxios-preocupat (își dorește apropiere profundă; uneori se teme de respingere sau abandon).',
  avoidant: 'Evitant-detașat (independența contează enorm; intimitatea profundă poate părea sufocantă).',
  disorganized: 'Dezorganizat-temător (dorește apropiere dar îi e greu să aibă încredere deplină; intimitatea este abordată precaut).',
}

const buildUserPrompt = (body: RequestBody): string => {
  const lang = body.language === 'ro' ? 'ro' : 'en'
  const attachmentProse = lang === 'ro'
    ? ATTACHMENT_PROSE_RO[body.attachment]
    : ATTACHMENT_PROSE_EN[body.attachment]
  const name = body.selfName?.trim() || (lang === 'ro' ? 'utilizatorul' : 'the user')

  const lines = [
    lang === 'ro'
      ? `Scrie o dezvăluire „Personalitate în iubire" pentru ${name}, bazată pe datele validate de mai jos.`
      : `Write a "Love Personality" reveal for ${name}, grounded in the validated data below.`,
    ``,
    lang === 'ro' ? 'Scoruri Big Five (0..100):' : 'Big Five scores (0..100):',
    `- Openness:          ${Math.round(body.bigFive.openness)}`,
    `- Conscientiousness: ${Math.round(body.bigFive.conscientiousness)}`,
    `- Extraversion:      ${Math.round(body.bigFive.extraversion)}`,
    `- Agreeableness:     ${Math.round(body.bigFive.agreeableness)}`,
    `- Emotional Stability (100 - Neuroticism): ${Math.round(100 - body.bigFive.neuroticism)}`,
    ``,
    lang === 'ro' ? `Stil principal de atașament: ${attachmentProse}` : `Primary attachment style: ${attachmentProse}`,
  ]

  if (body.attachmentRatings) {
    lines.push(
      ``,
      lang === 'ro' ? 'Evaluări complete de atașament (1..5):' : 'Full attachment ratings (1..5):',
      `- secure: ${body.attachmentRatings.secure}`,
      `- anxious: ${body.attachmentRatings.anxious}`,
      `- avoidant: ${body.attachmentRatings.avoidant}`,
      `- disorganized: ${body.attachmentRatings.disorganized}`,
    )
  }

  return lines.join('\n')
}

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const base = `You are Privé's psychological author. You write short, cinematic "Love Personality" reveals for one user at a time, based on validated Big Five + Attachment data.

Your style: warm, specific, never clinical. Think The New Yorker relationship column meets a thoughtful friend's note. Avoid pseudoscience phrasing ("you ARE this", "this means you will..."). Use tentative-but-confident language ("you tend to...", "you often...", "you may find..."). Address the user in the second person.

Output rules:
- archetypeName: 2-3 words, a poetic noun phrase (e.g. "Curious Anchor", "Quiet Architect", "Open Tide"). Title Case. No MBTI letter codes, no clinical labels.
- headline: ONE resonant sentence, max ~120 chars. Should feel like the first line of a love letter to themselves.
- description: 3 short paragraphs (max ~600 chars total) covering, in this order: (1) how you love and what closeness looks like for you, (2) what energises you in connection, (3) what you offer a partner. Each paragraph is 2-3 sentences. Separate paragraphs with a single blank line ("\\n\\n").
- strengths: exactly 3 short phrases (max ~40 chars each), each a real, concrete strength tied to the scores. No vague flattery.
- growthEdges: exactly 2 short phrases (max ~50 chars each), framed compassionately as edges to lean into — NEVER as deficits or warnings.

Read the scores carefully:
- Very high or very low values (>70 or <30) deserve mention; middle values (40-60) deserve nuance, not exaggeration.
- Attachment style is the single highest-signal field. Reflect it accurately but never reduce the person to it.
- Do not list the scores back at the user — translate them into prose.`

  if (language === 'ro') {
    return `${base}
- Scrie TOT textul (archetypeName, headline, description, strengths, growthEdges) în ROMÂNĂ NATURALĂ — nu traducere literală din engleză. Folosește diacritice corecte (ă, â, î, ș, ț). Evită anglicismele când există un cuvânt românesc curat.`
  }
  return `${base}
- Write ALL text (archetypeName, headline, description, strengths, growthEdges) in English.`
}

const isValidBigFive = (raw: unknown): raw is BigFiveScores => {
  if (!raw || typeof raw !== 'object') return false
  const obj = raw as Record<string, unknown>
  const keys: (keyof BigFiveScores)[] = [
    'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism',
  ]
  return keys.every(
    (k) => typeof obj[k] === 'number' && Number.isFinite(obj[k] as number) && (obj[k] as number) >= 0 && (obj[k] as number) <= 100,
  )
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

  if (!isValidBigFive(body?.bigFive)) {
    return new Response(JSON.stringify({ error: 'bigFive must be {openness,conscientiousness,extraversion,agreeableness,neuroticism} with 0..100 values' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  if (!VALID_ATTACHMENTS.includes(body.attachment)) {
    return new Response(JSON.stringify({ error: 'attachment must be one of secure|anxious|avoidant|disorganized' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'server missing ANTHROPIC_API_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const client = new Anthropic({ apiKey })

  try {
    const language: 'en' | 'ro' = body.language === 'ro' ? 'ro' : 'en'
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: buildSystemPrompt(language),
      messages: [{ role: 'user', content: buildUserPrompt({ ...body, language }) }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            // Anthropic's structured-output validator rejects array
            // length constraints (minItems / maxItems) the same way it
            // rejects integer min/max. We trim/pad the arrays in the
            // parsing block below; the system prompt already tells the
            // model to produce exactly 3 strengths + 2 growth edges.
            type: 'object',
            properties: {
              archetypeName: { type: 'string' },
              headline: { type: 'string' },
              description: { type: 'string' },
              strengths: { type: 'array', items: { type: 'string' } },
              growthEdges: { type: 'array', items: { type: 'string' } },
            },
            required: ['archetypeName', 'headline', 'description', 'strengths', 'growthEdges'],
            additionalProperties: false,
          },
        },
      },
    })

    const block = response.content.find((b: { type: string }) => b.type === 'text')
    const raw = block && 'text' in block ? (block as { text: string }).text : ''
    let parsed: Partial<RevealResult>
    try {
      parsed = JSON.parse(raw)
    } catch {
      return new Response(JSON.stringify({ error: 'model returned non-json', raw }), {
        status: 502,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const archetypeName = typeof parsed.archetypeName === 'string' ? parsed.archetypeName.trim().slice(0, 60) : ''
    const headline = typeof parsed.headline === 'string' ? parsed.headline.trim().slice(0, 200) : ''
    const description = typeof parsed.description === 'string' ? parsed.description.trim().slice(0, 1200) : ''
    const strengths = Array.isArray(parsed.strengths)
      ? parsed.strengths.filter((s): s is string => typeof s === 'string').map((s) => s.trim().slice(0, 80)).slice(0, 3)
      : []
    const growthEdges = Array.isArray(parsed.growthEdges)
      ? parsed.growthEdges.filter((s): s is string => typeof s === 'string').map((s) => s.trim().slice(0, 100)).slice(0, 2)
      : []

    // The only hard requirements are archetype + headline + description.
    // Strengths and growth-edges are nice-to-have; a reveal with 2 strengths
    // instead of 3 still ships rather than failing the whole call.
    if (!archetypeName || !headline || !description) {
      return new Response(JSON.stringify({ error: 'model returned incomplete reveal', raw }), {
        status: 502,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ archetypeName, headline, description, strengths, growthEdges }), {
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
