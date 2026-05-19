// LoveDate — AI Icebreaker / Chat Coach (Phase E1)
//
// Generates three short, personalized chat suggestions for the current user
// to send. When no prior messages exist, this acts as an icebreaker; when
// the thread has history, it acts as a conversation coach that reads the
// last few messages and writes in the user's voice.
//
// Deployed as a Supabase Edge Function. The Anthropic key lives as the
// function secret ANTHROPIC_API_KEY — it is never shipped to the client.

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

type ChatTurn = { sender: 'me' | 'them'; text: string }

type RequestBody = {
  selfProfile: ProfileSummary
  otherProfile: ProfileSummary
  chatExcerpt?: ChatTurn[]
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
    p.vibe ? `vibe: ${p.vibe}` : null,
    p.relationshipGoal ? `looking for ${p.relationshipGoal}` : null,
    p.zodiac ? `${p.zodiac}` : null,
    p.interests?.length ? `interests: ${p.interests.slice(0, 6).join(', ')}` : null,
    p.bio?.trim() ? `bio: "${p.bio.trim().slice(0, 320)}"` : null,
  ]
    .filter(Boolean)
    .join('; ')
  return parts
}

const buildUserPrompt = (body: RequestBody): string => {
  const lines = [
    profileBlock('Sender', body.selfProfile),
    profileBlock('Recipient', body.otherProfile),
  ]
  if (body.chatExcerpt?.length) {
    lines.push('Recent conversation (oldest first):')
    for (const turn of body.chatExcerpt.slice(-8)) {
      const who = turn.sender === 'me' ? 'Sender' : 'Recipient'
      lines.push(`${who}: ${turn.text.slice(0, 240)}`)
    }
    lines.push(
      'Write three replies the Sender could send next. Each should respond to or build on the latest Recipient turn.',
    )
  } else {
    lines.push(
      'No messages have been exchanged yet. Write three opening messages the Sender could send to start the conversation.',
    )
  }
  return lines.join('\n')
}

const buildSystemPrompt = (language: 'en' | 'ro'): string => {
  const baseRules = `You are a warm, witty chat coach inside a dating app called LoveDate.
You write short messages on behalf of the Sender to the Recipient.

Rules:
- Output exactly three suggestions.
- Each suggestion is one or two sentences, max ~240 characters.
- Voice: conversational, playful when fitting, never cheesy or pickup-line-y.
- Reference something specific from the Recipient's profile (an interest, vibe, bio detail, city).
- Vary the three: one warm/curious, one playful, one that proposes a next step (a question, a small plan, a vivid micro-detail).
- Never invent facts about the Sender or Recipient. Never claim shared memories.
- No emoji unless the Recipient used emoji first.
- No greeting like "Hi" or "Hello" — start with substance.`

  if (language === 'ro') {
    return `${baseRules}
- Write all three suggestions in NATURAL ROMANIAN — not literal English-to-Romanian translation, but the way a native Romanian speaker would actually phrase it in a flirty chat. Use diacritics (ă, â, î, ș, ț) correctly. Avoid Anglicisms when a clean Romanian equivalent exists. If the Recipient's bio includes English words for places, names, or specific interests (e.g. "Coffee", "Live music", "Some Happy days"), you may keep those exact words; everything else is Romanian.`
  }
  return `${baseRules}
- Write all three suggestions in English.`
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
      JSON.stringify({ error: 'selfProfile and otherProfile.name are required' }),
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
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: buildSystemPrompt(language),
      messages: [{ role: 'user', content: buildUserPrompt(body) }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              openers: { type: 'array', items: { type: 'string' } },
            },
            required: ['openers'],
            additionalProperties: false,
          },
        },
      },
    })

    const block = response.content.find((b) => b.type === 'text')
    const raw = block && 'text' in block ? block.text : ''
    let parsed: { openers?: unknown }
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

    const openers = Array.isArray(parsed.openers)
      ? parsed.openers.filter((o): o is string => typeof o === 'string' && o.trim().length > 0).slice(0, 3)
      : []

    if (openers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'model returned no openers' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ openers }), {
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
