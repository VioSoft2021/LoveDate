# LoveDate — AI architecture

Snapshot as of 2026-05-20 (commit family ending `f8b0d3c`). Six AI features ship across two Anthropic models. All six follow the same shape: client wrapper → Supabase Edge Function → Claude → response → client cache. The Anthropic key never leaves the server.

> Open this file in VS Code 1.121+ or on GitHub — both render the Mermaid diagrams natively. No extra extension needed.

---

## The whole picture

```mermaid
flowchart LR
    subgraph Client["Client (PWA + Capacitor)"]
        UI[UI components<br/>Discover / Profile / Chat / Moderation]
        Wrappers[src/services/ai/*.ts<br/>backendInvoke* + localStorage cache]
        UI --> Wrappers
    end

    subgraph Supabase["Supabase (Edge Functions runtime)"]
        E1["ai-icebreaker<br/>Haiku 4.5"]
        E3["ai-match-score<br/>Sonnet 4.6"]
        E4["ai-date-planner<br/>Sonnet 4.6"]
        E2_5["ai-photo-coach<br/>Haiku 4.5 (vision)"]
        E2["ai-profile-writer<br/>Haiku 4.5"]
        E5["ai-safety-triage<br/>Haiku 4.5"]
    end

    Anthropic[(Anthropic API<br/>ANTHROPIC_API_KEY<br/>function secret)]

    Wrappers -->|invoke| E1
    Wrappers -->|invoke| E3
    Wrappers -->|invoke| E4
    Wrappers -->|invoke| E2_5
    Wrappers -->|invoke| E2
    Wrappers -->|invoke| E5

    E1 --> Anthropic
    E3 --> Anthropic
    E4 --> Anthropic
    E2_5 --> Anthropic
    E2 --> Anthropic
    E5 --> Anthropic

    subgraph DB["Postgres tables"]
        Profiles[(profiles)]
        Private[(profile_private)]
        Reports[(safety_reports)]
    end

    E5 -.->|service-role UPDATE<br/>ai_risk_level + summary| Reports

    classDef edge fill:#1f2937,stroke:#d8b86d,color:#f3e8c8;
    classDef anth fill:#3b2540,stroke:#c084fc,color:#ede4ff;
    classDef db fill:#1e293b,stroke:#7edff6,color:#cffafe;
    class E1,E3,E4,E2_5,E2,E5 edge;
    class Anthropic anth;
    class Profiles,Private,Reports db;
```

---

## Per-feature flows

### E1 — Icebreaker / chat coach

```mermaid
sequenceDiagram
    participant User
    participant Chat as ChatScreen
    participant Cache as localStorage<br/>v=2, key per lang+self+other+mode
    participant Fn as ai-icebreaker
    participant Claude as Haiku 4.5

    User->>Chat: tap "Generate suggestions"
    Chat->>Cache: check (sender,recipient,mode,lang)
    alt hit
        Cache-->>Chat: 3 openers
    else miss
        Chat->>Fn: selfProfile, otherProfile,<br/>chatExcerpt, language
        Fn->>Claude: language-aware system prompt
        Claude-->>Fn: {openers: string[3]}
        Fn-->>Chat: openers
        Chat->>Cache: write (24h TTL)
    end
    Chat-->>User: 3 tappable suggestions
```

- **Lives at:** [supabase/functions/ai-icebreaker/index.ts](../supabase/functions/ai-icebreaker/index.ts)
- **Client:** [src/services/ai/icebreaker.ts](../src/services/ai/icebreaker.ts)
- **Cache:** `lovedate:ai-icebreaker:{lang}:{senderName}:{otherId}:{mode}` — 24h TTL, version 2
- **Falls back to:** hand-coded templates in `generateAiCoachSuggestions` if the call fails

### E3 + E6 — Match scoring with friction & tips

```mermaid
sequenceDiagram
    participant Discover
    participant Cache as localStorage<br/>v=3, key per lang+selfHash+candId+candHash
    participant Fn as ai-match-score
    participant Claude as Sonnet 4.6

    Discover->>Cache: check (lang, selfHash, candidate)
    alt hit
        Cache-->>Discover: full result
    else miss
        Discover->>Fn: both profiles, language
        Fn->>Claude: thoughtful matchmaker prompt
        Claude-->>Fn: {score, reasons[3], redFlags[],<br/>frictionPoints[], tips[]}
        Fn-->>Discover: clamp 0-100, normalise lists
        Discover->>Cache: write (7d TTL)
    end
    Discover-->>Discover: overlay on heuristic baseline,<br/>"Show deeper why" disclosure
```

- **Lives at:** [supabase/functions/ai-match-score/index.ts](../supabase/functions/ai-match-score/index.ts)
- **Client:** [src/services/ai/matchScore.ts](../src/services/ai/matchScore.ts)
- **Cache:** profile-hash keyed — editing either profile invalidates automatically. CACHE_VERSION=3 (bumped when frictionPoints+tips added).
- **Falls back to:** heuristic `getMatchAnalysis` in App.tsx (interest overlap + intent + age gap + zodiac flavor)

### E4 — Date planner

```mermaid
sequenceDiagram
    participant Chat as ChatScreen
    participant Cache as localStorage<br/>v=1, key per lang+selfHash+otherId+otherHash
    participant Fn as ai-date-planner
    participant Claude as Sonnet 4.6

    Chat->>Cache: check (lang, both profile hashes)
    alt hit
        Cache-->>Chat: 3 plans
    else miss
        Chat->>Fn: both profiles, chemistryScore, language
        Fn->>Claude: 3 distinct plans (casual $ / mid $$ / signature $$$)
        Claude-->>Fn: {plans: [{title, placeType,<br/>budget, duration, pitch, message}]}
        Fn-->>Chat: normalise budget, clamp lengths
        Chat->>Cache: write (7d TTL)
    end
    Chat-->>Chat: 3 cards with "Use this message" → composer
```

- **Lives at:** [supabase/functions/ai-date-planner/index.ts](../supabase/functions/ai-date-planner/index.ts)
- **Client:** [src/services/ai/datePlanner.ts](../src/services/ai/datePlanner.ts)
- **Falls back to:** templated plan generator (the original pre-AI implementation) — kept as a fallback in `generateAiDatePlans`

### E2.5 — Photo quality coach

```mermaid
sequenceDiagram
    participant Editor as ProfileScreen
    participant Cache as localStorage<br/>v=1, key per lang+photoUrlHash
    participant Fn as ai-photo-coach
    participant Claude as Haiku 4.5 (vision)

    Editor->>Cache: check (lang, photo URLs)
    alt hit
        Cache-->>Editor: full result
    else miss
        Editor->>Fn: photos[] (≤6),<br/>selfProfile context, language
        Note over Fn: HTTPS URLs sent as {type:"url"};<br/>data URLs split to {type:"base64"}.
        Fn->>Claude: craft-only feedback prompt<br/>(no body/age/race commentary)
        Claude-->>Fn: {perPhoto: [{score, strengths,<br/>improvements}], primaryPick, overall}
        Fn-->>Editor: scores 1-10 clamped, lists trimmed
        Editor->>Cache: write (7d TTL)
    end
    Editor-->>Editor: per-photo cards + gold border<br/>on recommended primary
```

- **Lives at:** [supabase/functions/ai-photo-coach/index.ts](../supabase/functions/ai-photo-coach/index.ts)
- **Client:** [src/services/ai/photoCoach.ts](../src/services/ai/photoCoach.ts)
- **No fallback:** if it fails, the inline error message tells the user to retry. Photo coaching is an enhancement; no template alternative.

### E2 — Smart profile writer

```mermaid
sequenceDiagram
    participant Editor as ProfileScreen
    participant Cache as localStorage<br/>v=1, key per lang+inputHash
    participant Fn as ai-profile-writer
    participant Claude as Haiku 4.5

    Editor->>Cache: check (lang, bio+interests+vibe+...)
    alt hit
        Cache-->>Editor: result
    else miss
        Editor->>Fn: currentBio, interests, vibe,<br/>age, city, relationshipGoal, language
        Fn->>Claude: honest bio coach prompt<br/>(forbids AI clichés)
        Claude-->>Fn: {critiques[0-4], rewrites[3]}
        Fn-->>Editor: trim lengths, drop empties
        Editor->>Cache: write (7d TTL)
    end
    Editor-->>Editor: critiques as bullets +<br/>3 rewrite cards with "Use this"
    Note over Editor: NEVER auto-applied. User taps a<br/>card to copy into the bio field.
```

- **Lives at:** [supabase/functions/ai-profile-writer/index.ts](../supabase/functions/ai-profile-writer/index.ts)
- **Client:** [src/services/ai/profileWriter.ts](../src/services/ai/profileWriter.ts)
- **Trust surface:** writing FOR the user is high-risk; the result is always shown as a suggestion overlay with explicit confirmation before applying.

### E5 — Safety triage

```mermaid
sequenceDiagram
    participant Reporter as User submitting report
    participant App as App.tsx
    participant DB as safety_reports<br/>(anon-key INSERT)
    participant Fn as ai-safety-triage
    participant Claude as Haiku 4.5

    Reporter->>App: submit report
    App->>DB: insert row, get reportId
    DB-->>App: id
    App-)Fn: async fire-and-forget<br/>(reportId, category, details,<br/>profileSnapshot, language)
    Fn->>Claude: risk classification prompt
    Claude-->>Fn: {riskLevel, categories[], summary}
    Note over Fn,DB: Fn uses<br/>SUPABASE_SERVICE_ROLE_KEY<br/>to bypass RLS on UPDATE
    Fn->>DB: UPDATE safety_reports SET<br/>ai_risk_level, ai_categories,<br/>ai_summary, ai_triaged_at
    Fn-->>App: verdict (for immediate UI overlay)
    App-->>App: ModerationScreen sorts by<br/>risk DESC + createdAt DESC
```

- **Lives at:** [supabase/functions/ai-safety-triage/index.ts](../supabase/functions/ai-safety-triage/index.ts)
- **Client:** [src/services/ai/safetyTriage.ts](../src/services/ai/safetyTriage.ts)
- **Only function with DB writes** — needs the service-role key as a function secret. Every other AI function is read-only against Supabase.
- **No cache:** each report should be triaged exactly once.

---

## Security boundary

```mermaid
flowchart TB
    Client[Client / browser<br/>VITE_SUPABASE_ANON_KEY shipped publicly]
    Edge[Edge Function runtime<br/>function secrets:<br/>ANTHROPIC_API_KEY<br/>SUPABASE_SERVICE_ROLE_KEY]
    Anth[Anthropic API]
    DB[(Postgres + RLS)]

    Client -->|anon key — RLS enforces| DB
    Client -->|anon key| Edge
    Edge -->|Anthropic key| Anth
    Edge -->|service-role — bypasses RLS<br/>ONLY ai-safety-triage uses this| DB

    style Client fill:#1f2937,stroke:#7edff6,color:#cffafe
    style Edge fill:#1f2937,stroke:#d8b86d,color:#f3e8c8
    style Anth fill:#3b2540,stroke:#c084fc,color:#ede4ff
    style DB fill:#1e293b,stroke:#fca5a5,color:#fee2e2
```

- The **anon key** is meant to be public — its safety depends on Row Level Security policies. Every base table has RLS on (see [SECURITY.md](../SECURITY.md) and the post-migration verification on 2026-05-19).
- The **Anthropic key** lives only as a function secret. The client never sees it; the only way to call Anthropic is through one of the six Edge Functions, which are themselves protected by Supabase's function-invoke auth.
- The **service-role key** is needed by ai-safety-triage so it can UPDATE the safety_reports row a regular user doesn't own. Every other function reads only what the request body provides plus the Anthropic API — no privileged DB access.

---

## Shared conventions

| Concern | How it's done across all six |
| --- | --- |
| **Model selection** | Haiku 4.5 for short/high-frequency (icebreaker, photo coach, profile writer, safety triage). Sonnet 4.6 for richer reasoning (match scoring, date planning). |
| **Output shape** | Anthropic structured output via `output_config.format.schema` — the function defines the JSON shape and clamps/normalises in a parsing block. |
| **Anthropic gotcha** | Integer fields in `json_schema` do **not** support `minimum`/`maximum` — clamp in the parser, not the schema. Lesson from E3. |
| **Language switch** | Every function takes `language: 'en' \| 'ro'` and builds a different system prompt. RO prompts instruct natural Romanian with diacritics, not literal translation. |
| **Caching** | localStorage, language-keyed, version-bumped on input-shape changes. Profile-hash invalidation so edits propagate without a manual clear. |
| **Failure modes** | Every client wrapper returns `null` on any failure. Callers fall back to a templated alternative or show a retry-able error — UI never blocks on AI. |
| **Deploy** | `npx supabase functions deploy <name> --no-verify-jwt` from the project root. No Docker needed. |

---

## File index

| Feature | Edge Function | Client wrapper | Type |
| --- | --- | --- | --- |
| E1 Icebreaker | [`supabase/functions/ai-icebreaker/index.ts`](../supabase/functions/ai-icebreaker/index.ts) | [`src/services/ai/icebreaker.ts`](../src/services/ai/icebreaker.ts) | Haiku |
| E2 Profile writer | [`supabase/functions/ai-profile-writer/index.ts`](../supabase/functions/ai-profile-writer/index.ts) | [`src/services/ai/profileWriter.ts`](../src/services/ai/profileWriter.ts) | Haiku |
| E2.5 Photo coach | [`supabase/functions/ai-photo-coach/index.ts`](../supabase/functions/ai-photo-coach/index.ts) | [`src/services/ai/photoCoach.ts`](../src/services/ai/photoCoach.ts) | Haiku vision |
| E3 + E6 Match score | [`supabase/functions/ai-match-score/index.ts`](../supabase/functions/ai-match-score/index.ts) | [`src/services/ai/matchScore.ts`](../src/services/ai/matchScore.ts) | Sonnet |
| E4 Date planner | [`supabase/functions/ai-date-planner/index.ts`](../supabase/functions/ai-date-planner/index.ts) | [`src/services/ai/datePlanner.ts`](../src/services/ai/datePlanner.ts) | Sonnet |
| E5 Safety triage | [`supabase/functions/ai-safety-triage/index.ts`](../supabase/functions/ai-safety-triage/index.ts) | [`src/services/ai/safetyTriage.ts`](../src/services/ai/safetyTriage.ts) | Haiku |

---

## What's not on this map yet

Deferred per the original Phase E plan, not yet implemented:

- **#3 Conversation sentiment + pacing** — detect cooling-down chats. Opt-in toggle territory.
- **#7 Re-engagement nudges** — "best next message" for inactive matches. Risky UX (feels surveilled).
- **#8 Circle moderation** — same triage pattern as E5 but for circle posts. Defer until circles are load-bearing.
- **#10 Compatibility forecast** — predict friction points further ahead. Risk of being judgemental if wrong.
- **Semantic search** — pgvector + bio embeddings for the Filter screen's interest input. Lower priority.
- **E7 Personality from chat** — weekly reflection from user's chat history. Opt-in, requires meaningful message volume first.
