// Privé — AI Stability Reveal (2026-05-30)
//
// Per-MATCH reveal for the optional Relationship Stability Assessment.
// Takes TWO users' stability profiles (three durability dimensions 0..100 +
// value stances on children/finances/pace) plus the pre-computed band, and
// writes an honest "how durable is this" reading:
//   - a 2-4 word stability archetype (e.g. "Steady Anchor", "Slow-Built Trust")
//   - one resonant headline
//   - three short paragraphs: what makes you durable, where the strain lives,
//     the work that pays off
//   - 3 strengths, 1-2 watch-points, 1 shared piece of work
//
// Mirrors ai-pair-dynamic-reveal (Anthropic SDK, json_schema output, EN/RO,
// 30-day server cache keyed per pair). NEVER predicts success/failure — it
// describes durability texture, not an outcome.

import Anthropic from 'npm:@anthropic-ai/sdk@0.40.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

type StabilityValues = {
  children: 'yes' | 'unsure' | 'no'
  finances: 'saver' | 'balanced' | 'spender'
  pace: 'fast' | 'balanced' | 'slow'
}

type StabilityPerson = {
  conflictRepair: number
  commitment: number
  communication: number
  values: StabilityValues
  name?: string
}

type StabilityBand = 'strong' | 'solid' | 'building' | 'fragile'

type RequestBody = {
  self: StabilityPerson
  other: StabilityPerson
  band?: StabilityBand
  language?: 'en' | 'ro'
  cacheKey?: string
}

type RevealResult = {
  archetype: string
  headline: string
  description: string
  strengths: string[]
  watchPoints: string[]
  sharedWork: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CHILDREN = ['yes', 'unsure', 'no']
const FINANCES = ['saver', 'balanced', 'spender']
const PACE = ['fast', 'balanced', 'slow']
const BANDS: StabilityBand[] = ['strong', 'solid', 'building', 'fragile']

const childrenProse: Record<string, { en: string; ro: string }> = {
  yes: { en: 'wants children', ro: 'își dorește copii' },
  unsure: { en: 'open / unsure about children', ro: 'deschis / nesigur privind copiii' },
  no: { en: "doesn't want children", ro: 'nu își dorește copii' },
}
const financeProse: Record<string, { en: string; ro: string }> = {
  saver: { en: 'a saver', ro: 'econom' },
  balanced: { en: 'balanced with money', ro: 'echilibrat cu banii' },
  spender: { en: 'a spender', ro: 'cheltuitor' },
}
const paceProse: Record<string, { en: string; ro: string }> = {
  fast: { en: 'fast-paced life', ro: 'viață alertă' },
  balanced: { en: 'balanced pace', ro: 'ritm echilibrat' },
  slow: { en: 'slow, steady life', ro: 'viață liniștită' },
}

const personBlock = (p: StabilityPerson, label: string, lang: 'en' | 'ro'): string => {
  const lines = [
    `${label} — ${p.name?.trim() || label}`,
    `- Conflict & repair: ${Math.round(p.conflictRepair)}`,
    `- Commitment:        ${Math.round(p.commitment)}`,
    `- Communication:     ${Math.round(p.communication)}`,
    lang === 'ro'
      ? `- Valori: ${childrenProse[p.values.children].ro}; ${financeProse[p.values.finances].ro}; ${paceProse[p.values.pace].ro}`
      : `- Values: ${childrenProse[p.values.children].en}; ${financeProse[p.values.finances].en}; ${paceProse[p.values.pace].en}`,
  ]
  return lines.join('\n')
}

const buildUserPrompt = (body: RequestBody): string => {
  const lang = body.language === 'ro' ? 'ro' : 'en'
  const selfLabel = lang === 'ro' ? 'PERSOANA A (cititorul)' : 'PERSON A (the reader)'
  const otherLabel = lang === 'ro' ? 'PERSOANA B (partenerul potențial)' : 'PERSON B (the potential partner)'
  const bandLine = body.band
    ? (lang === 'ro'
        ? `Banda de stabilitate calculată pentru această pereche: ${body.band}. Tonul tău trebuie să se potrivească onest cu această bandă.`
        : `The computed stability band for this pair is: ${body.band}. Your tone must honestly match this band.`)
    : ''
  const intro = lang === 'ro'
    ? 'Scrie o dezvăluire despre cât de DURABILĂ ar fi probabil această pereche, bazată pe datele de mai jos. Vorbește direct cu PERSOANA A.'
    : 'Write a reveal about how DURABLE this pairing is likely to be, grounded in the data below. Speak directly to PERSON A.'
  return [intro, bandLine, '', personBlock(body.self, selfLabel, lang), '', personBlock(body.other, otherLabel, lang)].join('\n')
}

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const base = `You are Privé's psychological author. You write short, cinematic "Stability" readings — one per match — based on a validated Relationship Stability Assessment of TWO people. The assessment measures durability predictors: Conflict & Repair (Gottman), Commitment (Rusbult investment model), Communication, and value alignment (children, finances, life pace).

Your style: warm, specific, never clinical. You address PERSON A in the second person ("you tend to..."), and refer to PERSON B by name (or "they"). You read the SCORES and VALUES carefully and reason about the PAIR, not isolated traits:
- High conflict-repair on BOTH sides → ruptures get mended; the relationship self-heals.
- A large gap on commitment → one invests more than the other; name it tenderly.
- Aligned values (especially children) → a quiet structural strength. A children mismatch (one wants, one doesn't) is the single biggest durability risk — never gloss over it.
- Different money styles or life pace → friction that's workable but worth naming.

Output rules:
- archetype: 2-4 words, an evocative noun phrase about DURABILITY (e.g. "Steady Anchor", "Slow-Built Trust", "Weatherproof"). Title Case. Never a clinical label.
- headline: ONE resonant sentence, max ~140 chars.
- description: 3 short paragraphs, max ~700 chars total, separated by "\\n\\n", in this order: (1) what makes you two durable — the structural strengths, (2) where the strain is most likely to live and why, (3) the work that would pay off most if you both lean in. 2-3 sentences each.
- strengths: exactly 3 short phrases (max ~50 chars) — concrete durability wins tied to the data.
- watchPoints: 1 or 2 short phrases (max ~60 chars) — durability risks to NAME, not a verdict. If there's a children mismatch, it MUST be the first watch-point.
- sharedWork: ONE short phrase (max ~70 chars) — the single most valuable thing to build together.

Critical: NEVER predict the relationship's success or failure, and NEVER output a percentage or guarantee. You describe durability texture, not an outcome. Use grounded-but-tentative language ("this pairing tends to...", "where it's most likely to strain is...").`

  if (language === 'ro') {
    return `${base}
- Scrie TOT textul în ROMÂNĂ NATURALĂ — nu traducere literală. Folosește diacritice corecte (ă, â, î, ș, ț). Evită anglicismele când există un cuvânt românesc curat.`
  }
  return `${base}
- Write ALL text in English.`
}

const isValidValues = (raw: unknown): raw is StabilityValues => {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return (
    CHILDREN.includes(o.children as string) &&
    FINANCES.includes(o.finances as string) &&
    PACE.includes(o.pace as string)
  )
}

const isValidPerson = (raw: unknown): raw is StabilityPerson => {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100
  return num(o.conflictRepair) && num(o.commitment) && num(o.communication) && isValidValues(o.values)
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

  if (!isValidPerson(body?.self) || !isValidPerson(body?.other)) {
    return new Response(JSON.stringify({ error: 'self and other must be {conflictRepair,commitment,communication (0..100), values:{children,finances,pace}}' }), {
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

  const language: 'en' | 'ro' = body.language === 'ro' ? 'ro' : 'en'
  const band: StabilityBand | undefined = BANDS.includes(body.band as StabilityBand) ? body.band : undefined
  const cacheKey = typeof body.cacheKey === 'string' ? body.cacheKey.trim() : ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const cacheClient = cacheKey && supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null

  if (cacheClient) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: cached } = await cacheClient
        .from('stability_reveal_cache')
        .select('reveal, created_at')
        .eq('cache_key', cacheKey)
        .eq('language', language)
        .gte('created_at', thirtyDaysAgo)
        .maybeSingle()
      if (cached?.reveal) {
        return new Response(JSON.stringify(cached.reveal), {
          status: 200,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        })
      }
    } catch (err) {
      console.warn('[stability-reveal] cache lookup failed:', err)
    }
  }

  const client = new Anthropic({ apiKey, maxRetries: 4 } as ConstructorParameters<typeof Anthropic>[0])

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1700,
      system: buildSystemPrompt(language),
      messages: [{ role: 'user', content: buildUserPrompt({ ...body, language, band }) }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              archetype: { type: 'string' },
              headline: { type: 'string' },
              description: { type: 'string' },
              strengths: { type: 'array', items: { type: 'string' } },
              watchPoints: { type: 'array', items: { type: 'string' } },
              sharedWork: { type: 'string' },
            },
            required: ['archetype', 'headline', 'description', 'strengths', 'watchPoints', 'sharedWork'],
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

    const archetype = typeof parsed.archetype === 'string' ? parsed.archetype.trim().slice(0, 80) : ''
    const headline = typeof parsed.headline === 'string' ? parsed.headline.trim().slice(0, 220) : ''
    const description = typeof parsed.description === 'string' ? parsed.description.trim().slice(0, 1400) : ''
    const strengths = Array.isArray(parsed.strengths)
      ? parsed.strengths.filter((s): s is string => typeof s === 'string').map((s) => s.trim().slice(0, 90)).slice(0, 3)
      : []
    const watchPoints = Array.isArray(parsed.watchPoints)
      ? parsed.watchPoints.filter((s): s is string => typeof s === 'string').map((s) => s.trim().slice(0, 100)).slice(0, 2)
      : []
    const sharedWork = typeof parsed.sharedWork === 'string' ? parsed.sharedWork.trim().slice(0, 140) : ''

    if (!archetype || !headline || !description) {
      return new Response(JSON.stringify({ error: 'model returned incomplete reveal', raw }), {
        status: 502,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const reveal = { archetype, headline, description, strengths, watchPoints, sharedWork }

    if (cacheClient && cacheKey) {
      try {
        await cacheClient
          .from('stability_reveal_cache')
          .upsert(
            { cache_key: cacheKey, language, reveal, created_at: new Date().toISOString() },
            { onConflict: 'cache_key' },
          )
      } catch (err) {
        console.warn('[stability-reveal] cache write failed:', err)
      }
    }

    return new Response(JSON.stringify(reveal), {
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
