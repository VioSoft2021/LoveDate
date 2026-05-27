// Privé — AI Pair Dynamic Reveal (Tier B, 2026-05-26)
//
// Takes TWO users' Big Five (0..100 per dimension) + primary attachment
// styles and writes a cinematic "your dynamic together" reveal:
//   - a 2-4 word pair archetype naming the dynamic (e.g. "Patient
//     Wildfire", "Quiet Symphony")
//   - a single resonant headline
//   - three short paragraphs describing how the connection feels, where
//     the friction may live, and what could grow between them
//   - 3 pair strengths, 1-2 friction points, 1 shared growth edge
//
// Mirrors ai-love-personality-reveal exactly (Anthropic SDK, JSON-schema
// output, EN/RO branching, ANTHROPIC_API_KEY from function secrets).
// Cost ≈ $0.02 per pair. The client wrapper caches the result for 30
// days keyed on the user-pair so re-opening the same match's profile
// doesn't repeat the call.

import Anthropic from 'npm:@anthropic-ai/sdk@0.40.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

type BigFiveScores = {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'disorganized'

type PersonProfile = {
  bigFive: BigFiveScores
  attachment: AttachmentStyle
  name?: string
}

type RequestBody = {
  self: PersonProfile
  other: PersonProfile
  language?: 'en' | 'ro'
  // Stable per-pair cache key computed client-side (sorted user IDs +
  // both users' rounded BigFive + attachment + language). When present,
  // we look up pair_dynamic_cache before invoking Claude — and write
  // the result back after a successful generation. Both members of the
  // pair compute the same key, so User B benefits from User A's reveal.
  cacheKey?: string
}

type RevealResult = {
  pairArchetype: string
  headline: string
  description: string
  strengths: string[]
  frictions: string[]
  sharedGrowthEdge: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_ATTACHMENTS: AttachmentStyle[] = ['secure', 'anxious', 'avoidant', 'disorganized']

const ATTACHMENT_PROSE_EN: Record<AttachmentStyle, string> = {
  secure: 'Secure (comfortable with both closeness and independence; tends to stabilise a partner).',
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

const personBlock = (
  person: PersonProfile,
  label: string,
  language: 'en' | 'ro',
): string => {
  const attachmentProse = language === 'ro'
    ? ATTACHMENT_PROSE_RO[person.attachment]
    : ATTACHMENT_PROSE_EN[person.attachment]
  const name = person.name?.trim() || (language === 'ro' ? label : label)
  const lines = [
    `${label} — ${name}`,
    `- Openness:          ${Math.round(person.bigFive.openness)}`,
    `- Conscientiousness: ${Math.round(person.bigFive.conscientiousness)}`,
    `- Extraversion:      ${Math.round(person.bigFive.extraversion)}`,
    `- Agreeableness:     ${Math.round(person.bigFive.agreeableness)}`,
    `- Emotional Stability (100 - Neuroticism): ${Math.round(100 - person.bigFive.neuroticism)}`,
    language === 'ro'
      ? `- Stil de atașament: ${attachmentProse}`
      : `- Attachment style: ${attachmentProse}`,
  ]
  return lines.join('\n')
}

const buildUserPrompt = (body: RequestBody): string => {
  const lang = body.language === 'ro' ? 'ro' : 'en'
  const selfLabel = lang === 'ro' ? 'PERSOANA A (cititorul)' : 'PERSON A (the reader)'
  const otherLabel = lang === 'ro' ? 'PERSOANA B (partenerul potențial)' : 'PERSON B (the potential partner)'
  const intro = lang === 'ro'
    ? 'Scrie o dezvăluire „Dinamica voastră" pentru aceste două persoane, bazată pe datele validate de mai jos. Vorbește direct cu PERSOANA A despre ce s-ar simți între ei.'
    : 'Write a "Your Dynamic Together" reveal for these two people, grounded in the validated data below. Speak directly to PERSON A about what this connection would feel like.'
  return [
    intro,
    '',
    personBlock(body.self, selfLabel, lang),
    '',
    personBlock(body.other, otherLabel, lang),
  ].join('\n')
}

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const base = `You are Privé's psychological author. You write short, cinematic "Pair Dynamic" reveals — one for each match — based on the validated Big Five + Attachment data of TWO people.

Your style: warm, specific, never clinical. Think a thoughtful friend describing what they see when these two get close. You address PERSON A in the second person ("you tend to..."), and refer to PERSON B by name (or "they" if no name). You never reduce either person to a label.

Read the SCORES carefully and think about INTERACTION, not isolated traits:
- High-Openness + Low-Openness → one is exploring, the other anchoring; can be complementary or frustrating depending on the rest.
- Secure + Anxious → secure stabilises; anxious's reassurance needs can be met or strained.
- Avoidant + Anxious → the classic chase-withdraw pattern; name it honestly but tenderly.
- Two Avoidants → space is plentiful but vulnerability is the hard work.
- Disorganized + anyone → trust is the cornerstone; pace matters.
- Two Highs on Extraversion → social energy compounds; risk of crowding out quiet time.
- Two Highs on Conscientiousness → reliable and structured; risk of rigidity.
- Pay special attention to wide gaps (>30 points) on any dimension — those are where dynamics emerge.

Output rules:
- pairArchetype: 2-4 words, an evocative noun phrase describing the DYNAMIC itself (e.g. "Patient Wildfire", "Quiet Symphony", "Slow Burn", "Open Tide & Steady Shore"). Title Case. NEVER a clinical label or MBTI-style code.
- headline: ONE resonant sentence, max ~140 chars. Should make Person A pause and think "yes, that's us." Avoid pure flattery.
- description: 3 short paragraphs, max ~700 chars total, separated by "\\n\\n". In this order: (1) what closeness feels like between you two — the texture of the connection, (2) where friction may live and why (honest but compassionate), (3) what could grow between you if you both lean in. Each paragraph 2-3 sentences.
- strengths: exactly 3 short phrases (max ~50 chars each) — concrete pair-level wins tied to the scores, not vague flattery.
- frictions: 1 or 2 short phrases (max ~60 chars each) — where you may rub on each other, framed as a pattern to NAME, not a verdict.
- sharedGrowthEdge: ONE short phrase (max ~70 chars) — the single most resonant thing you could grow together if you both lean in.

Critical: never predict the relationship's success or failure. You describe the texture, not the outcome. Use tentative-but-grounded language ("you'll likely find...", "the texture between you tends to be...", "where you may notice friction is...").`

  if (language === 'ro') {
    return `${base}
- Scrie TOT textul (pairArchetype, headline, description, strengths, frictions, sharedGrowthEdge) în ROMÂNĂ NATURALĂ — nu traducere literală din engleză. Folosește diacritice corecte (ă, â, î, ș, ț). Evită anglicismele când există un cuvânt românesc curat.`
  }
  return `${base}
- Write ALL text (pairArchetype, headline, description, strengths, frictions, sharedGrowthEdge) in English.`
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

const isValidPerson = (raw: unknown): raw is PersonProfile => {
  if (!raw || typeof raw !== 'object') return false
  const obj = raw as Record<string, unknown>
  if (!isValidBigFive(obj.bigFive)) return false
  if (!VALID_ATTACHMENTS.includes(obj.attachment as AttachmentStyle)) return false
  return true
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

  if (!isValidPerson(body?.self)) {
    return new Response(JSON.stringify({ error: 'self must be {bigFive,attachment,name?} with valid bigFive 0..100 + attachment in (secure|anxious|avoidant|disorganized)' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
  if (!isValidPerson(body?.other)) {
    return new Response(JSON.stringify({ error: 'other must be {bigFive,attachment,name?} with valid bigFive 0..100 + attachment in (secure|anxious|avoidant|disorganized)' }), {
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

  // Server-side cache (Tier B, 2026-05-26). When the client passes a
  // cacheKey, we first try pair_dynamic_cache before paying for a fresh
  // Claude call. Both members of a matched pair compute the same key
  // (sorted user IDs + scores + language), so once User A reveals their
  // dynamic, User B's view comes back in ~200ms instead of 2-3s.
  // TTL: 30 days. Cache entries older than that are treated as stale.
  const language: 'en' | 'ro' = body.language === 'ro' ? 'ro' : 'en'
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
        .from('pair_dynamic_cache')
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
      // Cache lookup failure is non-fatal — we just fall through to
      // Claude. Logged so we notice if the cache table is misconfigured.
      console.warn('[pair-dynamic-reveal] cache lookup failed:', err)
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
      max_tokens: 1700,
      system: buildSystemPrompt(language),
      messages: [{ role: 'user', content: buildUserPrompt({ ...body, language }) }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            // No minItems/maxItems on arrays — Anthropic's validator
            // rejects those. We trim/pad in the parse block. The system
            // prompt instructs the model on exact counts.
            type: 'object',
            properties: {
              pairArchetype: { type: 'string' },
              headline: { type: 'string' },
              description: { type: 'string' },
              strengths: { type: 'array', items: { type: 'string' } },
              frictions: { type: 'array', items: { type: 'string' } },
              sharedGrowthEdge: { type: 'string' },
            },
            required: ['pairArchetype', 'headline', 'description', 'strengths', 'frictions', 'sharedGrowthEdge'],
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

    const pairArchetype = typeof parsed.pairArchetype === 'string' ? parsed.pairArchetype.trim().slice(0, 80) : ''
    const headline = typeof parsed.headline === 'string' ? parsed.headline.trim().slice(0, 220) : ''
    const description = typeof parsed.description === 'string' ? parsed.description.trim().slice(0, 1400) : ''
    const strengths = Array.isArray(parsed.strengths)
      ? parsed.strengths.filter((s): s is string => typeof s === 'string').map((s) => s.trim().slice(0, 90)).slice(0, 3)
      : []
    const frictions = Array.isArray(parsed.frictions)
      ? parsed.frictions.filter((s): s is string => typeof s === 'string').map((s) => s.trim().slice(0, 100)).slice(0, 2)
      : []
    const sharedGrowthEdge = typeof parsed.sharedGrowthEdge === 'string' ? parsed.sharedGrowthEdge.trim().slice(0, 140) : ''

    // Hard requirements: pairArchetype + headline + description. The
    // arrays + sharedGrowthEdge can come back short and we still ship
    // rather than fail the whole call.
    if (!pairArchetype || !headline || !description) {
      return new Response(JSON.stringify({ error: 'model returned incomplete reveal', raw }), {
        status: 502,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const reveal = { pairArchetype, headline, description, strengths, frictions, sharedGrowthEdge }

    // Write to server-side cache so the matched partner gets the same
    // reveal back from cache (~200ms) instead of paying for another
    // Claude call. Failure is non-fatal — we already have the reveal
    // for the current caller, so we return it either way.
    if (cacheClient && cacheKey) {
      try {
        await cacheClient
          .from('pair_dynamic_cache')
          .upsert(
            { cache_key: cacheKey, language, reveal, created_at: new Date().toISOString() },
            { onConflict: 'cache_key' },
          )
      } catch (err) {
        console.warn('[pair-dynamic-reveal] cache write failed:', err)
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
