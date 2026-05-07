# LoveDate Invite Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate private mobile admin app that generates long unbranded randomized invite codes and registers them in LoveDate's existing Supabase `beta_invites` table through a secure Edge Function.

**Architecture:** Create a new React/Vite/Capacitor project at `C:\LoveDateInviteAdmin`. Keep invite generation local in focused TypeScript modules, keep Supabase writes server-side in a `create-invite-code` Edge Function, and use Supabase Auth so only an allowlisted owner can register codes.

**Tech Stack:** React, TypeScript, Vite, Capacitor, Supabase JS client, Supabase Edge Functions, Deno test runner, Vitest.

---

## File Structure

Create a sibling project:

- `C:\LoveDateInviteAdmin\package.json`: scripts and dependencies.
- `C:\LoveDateInviteAdmin\index.html`: Vite entry HTML.
- `C:\LoveDateInviteAdmin\vite.config.ts`: React/Vite config.
- `C:\LoveDateInviteAdmin\tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: TypeScript config.
- `C:\LoveDateInviteAdmin\capacitor.config.ts`: mobile app config.
- `C:\LoveDateInviteAdmin\src\main.tsx`: React bootstrap.
- `C:\LoveDateInviteAdmin\src\App.tsx`: app shell, auth state, generator workflow.
- `C:\LoveDateInviteAdmin\src\App.css`: private admin UI styling.
- `C:\LoveDateInviteAdmin\src\services\supabaseClient.ts`: browser Supabase client.
- `C:\LoveDateInviteAdmin\src\services\inviteRegistration.ts`: Edge Function call and response mapping.
- `C:\LoveDateInviteAdmin\src\services\inviteGenerator.ts`: chained invite-code algorithm.
- `C:\LoveDateInviteAdmin\src\services\inviteGenerator.test.ts`: generator tests.
- `C:\LoveDateInviteAdmin\src\services\inviteRegistration.test.ts`: registration service tests with fetch mocking.
- `C:\LoveDateInviteAdmin\supabase\functions\create-invite-code\index.ts`: secure Edge Function.
- `C:\LoveDateInviteAdmin\supabase\functions\create-invite-code\index.test.ts`: Edge Function tests.
- `C:\LoveDateInviteAdmin\.env.example`: required public env vars for the admin app.
- `C:\LoveDateInviteAdmin\README.md`: setup, local dev, deployment, and mobile build notes.

The existing `C:\LoveDate` app is not modified during implementation except for optional final verification using an invite code registered by the new admin app.

## Task 1: Scaffold the Separate Admin App

**Files:**
- Create: `C:\LoveDateInviteAdmin\package.json`
- Create: `C:\LoveDateInviteAdmin\index.html`
- Create: `C:\LoveDateInviteAdmin\vite.config.ts`
- Create: `C:\LoveDateInviteAdmin\tsconfig.json`
- Create: `C:\LoveDateInviteAdmin\tsconfig.app.json`
- Create: `C:\LoveDateInviteAdmin\tsconfig.node.json`
- Create: `C:\LoveDateInviteAdmin\capacitor.config.ts`
- Create: `C:\LoveDateInviteAdmin\src\main.tsx`
- Create: `C:\LoveDateInviteAdmin\src\App.tsx`
- Create: `C:\LoveDateInviteAdmin\src\App.css`
- Create: `C:\LoveDateInviteAdmin\.env.example`

- [ ] **Step 1: Create the project directory**

Run:

```powershell
New-Item -ItemType Directory -Force C:\LoveDateInviteAdmin\src | Out-Null
```

Expected: directory exists at `C:\LoveDateInviteAdmin`.

- [ ] **Step 2: Create `package.json`**

Write `C:\LoveDateInviteAdmin\package.json`:

```json
{
  "name": "lovedate-invite-admin",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview",
    "cap:add:android": "cap add android",
    "cap:sync": "cap sync android"
  },
  "dependencies": {
    "@capacitor/android": "^8.3.1",
    "@capacitor/cli": "^8.3.1",
    "@capacitor/core": "^8.3.1",
    "@supabase/supabase-js": "^2.101.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.57.0",
    "vite": "^8.0.1",
    "jsdom": "^27.3.0",
    "vitest": "^4.0.16"
  }
}
```

- [ ] **Step 3: Create Vite HTML and config**

Write `C:\LoveDateInviteAdmin\index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>LoveDate Invite Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Write `C:\LoveDateInviteAdmin\vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Create TypeScript config files**

Write `C:\LoveDateInviteAdmin\tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Write `C:\LoveDateInviteAdmin\tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Write `C:\LoveDateInviteAdmin\tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts", "capacitor.config.ts"]
}
```

- [ ] **Step 5: Create Capacitor config**

Write `C:\LoveDateInviteAdmin\capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.lovedate.inviteadmin',
  appName: 'LoveDate Invite Admin',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
```

- [ ] **Step 6: Create the minimal React entry**

Write `C:\LoveDateInviteAdmin\src\main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Write `C:\LoveDateInviteAdmin\src\App.tsx`:

```tsx
export default function App() {
  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <p className="admin-kicker">Private admin</p>
        <h1>LoveDate Invite Admin</h1>
        <p>Secure invite generation and Supabase registration will be added in the next tasks.</p>
      </section>
    </main>
  )
}
```

Write `C:\LoveDateInviteAdmin\src\App.css`:

```css
:root {
  color: #edf5ff;
  background: #090d20;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 0%, rgba(201, 169, 97, 0.16), transparent 28rem),
    linear-gradient(160deg, #070a19 0%, #111735 54%, #070a19 100%);
}

button,
input,
select {
  font: inherit;
}

.admin-shell {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
}

.admin-panel {
  width: min(100%, 28rem);
  border: 1px solid rgba(201, 169, 97, 0.28);
  background: rgba(14, 20, 48, 0.82);
  border-radius: 1rem;
  padding: 1.2rem;
  box-shadow: 0 24px 54px rgba(2, 6, 22, 0.48);
}

.admin-kicker {
  margin: 0 0 0.55rem;
  color: #e8c77d;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 8vw, 3rem);
  line-height: 1;
}

p {
  color: rgba(237, 245, 255, 0.84);
  line-height: 1.5;
}
```

Write `C:\LoveDateInviteAdmin\.env.example`:

```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

- [ ] **Step 7: Install dependencies and verify the scaffold**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
npm install
npm run build
```

Expected: `npm run build` exits with code 0 and creates `dist`.

- [ ] **Step 8: Commit the scaffold**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
git init
git add .
git commit -m "feat: scaffold invite admin app"
```

Expected: commit succeeds in the new admin app repo.

## Task 2: Implement the Chained Invite Generator

**Files:**
- Create: `C:\LoveDateInviteAdmin\src\services\inviteGenerator.ts`
- Create: `C:\LoveDateInviteAdmin\src\services\inviteGenerator.test.ts`

- [ ] **Step 1: Write the failing generator tests**

Write `C:\LoveDateInviteAdmin\src\services\inviteGenerator.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  SAFE_ALPHABET,
  generateInviteCode,
  generateInviteCodeFromSeed,
  isValidInviteCode,
  stripInviteSeparators,
} from './inviteGenerator'

describe('invite generator', () => {
  it('uses a safe alphabet without confusing characters', () => {
    expect(SAFE_ALPHABET).not.toContain('0')
    expect(SAFE_ALPHABET).not.toContain('O')
    expect(SAFE_ALPHABET).not.toContain('1')
    expect(SAFE_ALPHABET).not.toContain('I')
  })

  it('creates a long unbranded uppercase code from a known seed', async () => {
    const result = await generateInviteCodeFromSeed({
      seed: new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88, 99, 111, 122, 133, 144, 155, 166, 177]),
      salt: 'owner-session',
      patternIndex: 0,
    })

    expect(result.code).toMatch(/^[A-Z2-9.-]+$/)
    expect(result.code.startsWith('LD')).toBe(false)
    expect(result.code.startsWith('LOVE')).toBe(false)
    expect(result.stages).toHaveLength(10)
    expect(stripInviteSeparators(result.code).length).toBeGreaterThanOrEqual(16)
    expect(isValidInviteCode(result.code)).toBe(true)
  })

  it('is deterministic when seed salt and pattern are fixed', async () => {
    const input = {
      seed: new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 44, 55, 66, 77, 88, 99, 111, 123]),
      salt: 'fixed-admin',
      patternIndex: 2,
    }

    const first = await generateInviteCodeFromSeed(input)
    const second = await generateInviteCodeFromSeed(input)

    expect(second.code).toBe(first.code)
    expect(second.stages.map((stage) => stage.value)).toEqual(first.stages.map((stage) => stage.value))
  })

  it('varies format patterns across generated codes', async () => {
    const generated = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        generateInviteCodeFromSeed({
          seed: new Uint8Array(crypto.getRandomValues(new Uint8Array(16))).map((value, itemIndex) => value ^ index ^ itemIndex),
          salt: 'format-check',
          patternIndex: index % 5,
        }),
      ),
    )

    const formats = new Set(generated.map((result) => result.pattern.name))
    expect(formats.size).toBeGreaterThanOrEqual(4)
  })

  it('generates valid codes through the public random API', async () => {
    const result = await generateInviteCode('owner-session')
    expect(isValidInviteCode(result.code)).toBe(true)
    expect(result.stages).toHaveLength(10)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
npm run test -- src/services/inviteGenerator.test.ts
```

Expected: FAIL because `inviteGenerator.ts` does not exist.

- [ ] **Step 3: Implement the generator**

Write `C:\LoveDateInviteAdmin\src\services\inviteGenerator.ts`:

```ts
export const SAFE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const FORBIDDEN_PREFIXES = ['LD', 'LOVE', 'LVD', 'DATE']
const HASH_ALGORITHM = 'SHA-256'

export type InviteGenerationStage = {
  name: string
  value: string
}

export type InviteFormatPattern = {
  name: string
  groups: number[]
  separator: '' | '-' | '.'
}

export type InviteGenerationResult = {
  code: string
  pattern: InviteFormatPattern
  stages: InviteGenerationStage[]
}

export type SeededInviteInput = {
  seed: Uint8Array
  salt: string
  patternIndex?: number
}

const FORMAT_PATTERNS: InviteFormatPattern[] = [
  { name: 'four-groups-dash', groups: [4, 4, 4, 4], separator: '-' },
  { name: 'mixed-groups-dash', groups: [5, 5, 5, 5], separator: '-' },
  { name: 'three-groups-dash', groups: [5, 5, 5], separator: '-' },
  { name: 'four-groups-dot', groups: [4, 4, 4, 4], separator: '.' },
  { name: 'split-body-dash', groups: [8, 8], separator: '-' },
]

const encoder = new TextEncoder()

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const hashBytes = async (input: Uint8Array | string): Promise<Uint8Array> => {
  const payload = typeof input === 'string' ? encoder.encode(input) : input
  const digest = await crypto.subtle.digest(HASH_ALGORITHM, payload)
  return new Uint8Array(digest)
}

const toSafeAlphabet = (bytes: Uint8Array, length: number): string => {
  let output = ''
  let cursor = 0

  while (output.length < length) {
    const byte = bytes[cursor % bytes.length]
    output += SAFE_ALPHABET[byte % SAFE_ALPHABET.length]
    cursor += 1
  }

  return output
}

const shuffleFromDigest = (value: string, digest: Uint8Array): string => {
  const chars = value.split('')

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = digest[index % digest.length] % (index + 1)
    const current = chars[index]
    chars[index] = chars[swapIndex]
    chars[swapIndex] = current
  }

  return chars.join('')
}

const checksumFor = async (value: string): Promise<string> => {
  const digest = await hashBytes(`checksum:${value}`)
  return toSafeAlphabet(digest, 2)
}

export const stripInviteSeparators = (code: string): string => code.replace(/[-.]/g, '')

const formatCode = (body: string, pattern: InviteFormatPattern): string => {
  const parts: string[] = []
  let cursor = 0

  for (const groupSize of pattern.groups) {
    parts.push(body.slice(cursor, cursor + groupSize))
    cursor += groupSize
  }

  return parts.join(pattern.separator)
}

const selectPattern = (digest: Uint8Array, override?: number): InviteFormatPattern => {
  if (typeof override === 'number') {
    return FORMAT_PATTERNS[((override % FORMAT_PATTERNS.length) + FORMAT_PATTERNS.length) % FORMAT_PATTERNS.length]
  }

  return FORMAT_PATTERNS[digest[0] % FORMAT_PATTERNS.length]
}

export const isValidInviteCode = (code: string): boolean => {
  const raw = stripInviteSeparators(code)

  if (raw.length < 16 || raw.length > 24) {
    return false
  }

  if (FORBIDDEN_PREFIXES.some((prefix) => code.startsWith(prefix))) {
    return false
  }

  return raw.split('').every((char) => SAFE_ALPHABET.includes(char))
}

export const generateInviteCodeFromSeed = async ({
  seed,
  salt,
  patternIndex,
}: SeededInviteInput): Promise<InviteGenerationResult> => {
  const stages: InviteGenerationStage[] = []

  const stage1 = bytesToHex(seed)
  stages.push({ name: 'Secure random seed', value: stage1 })

  const stage2 = toSafeAlphabet(seed, 24)
  stages.push({ name: 'Safe alphabet normalization', value: stage2 })

  const stage3Bytes = await hashBytes(stage2)
  const stage3 = bytesToHex(stage3Bytes)
  stages.push({ name: 'SHA-256 hash', value: stage3 })

  const stage4Bytes = await hashBytes(`${stage3}:${salt}`)
  const stage4 = bytesToHex(stage4Bytes)
  stages.push({ name: 'Admin salt mix', value: stage4 })

  const stage5Bytes = await hashBytes(`${salt}:${stage4}:${stage2}`)
  const stage5 = bytesToHex(stage5Bytes)
  stages.push({ name: 'HMAC-style digest', value: stage5 })

  const stage6 = toSafeAlphabet(stage5Bytes, 28)
  stages.push({ name: 'Base32-style encode', value: stage6 })

  const stage7Digest = await hashBytes(`shuffle:${stage6}:${salt}`)
  const stage7 = shuffleFromDigest(stage6, stage7Digest)
  stages.push({ name: 'Deterministic shuffle', value: stage7 })

  const stage8Bytes = await hashBytes(`rehash:${stage7}:${stage5}`)
  const stage8 = toSafeAlphabet(stage8Bytes, 24)
  stages.push({ name: 'Collision-resistant rehash', value: stage8 })

  const stage9 = `${stage8}${await checksumFor(stage8)}`
  stages.push({ name: 'Checksum append', value: stage9 })

  const formatDigest = await hashBytes(`format:${stage9}:${salt}`)
  const pattern = selectPattern(formatDigest, patternIndex)
  const bodyLength = pattern.groups.reduce((sum, group) => sum + group, 0)
  let body = stage9.slice(0, bodyLength)

  if (FORBIDDEN_PREFIXES.some((prefix) => body.startsWith(prefix))) {
    body = `${SAFE_ALPHABET[(formatDigest[1] + 7) % SAFE_ALPHABET.length]}${body.slice(1)}`
  }

  const code = formatCode(body, pattern)
  stages.push({ name: 'Randomized final format', value: code })

  if (!isValidInviteCode(code)) {
    throw new Error('Generated invite code failed validation')
  }

  return { code, pattern, stages }
}

export const generateInviteCode = async (salt: string): Promise<InviteGenerationResult> => {
  const seed = crypto.getRandomValues(new Uint8Array(32))
  return generateInviteCodeFromSeed({ seed, salt })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
npm run test -- src/services/inviteGenerator.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the generator**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
git add src/services/inviteGenerator.ts src/services/inviteGenerator.test.ts
git commit -m "feat: add chained invite generator"
```

Expected: commit succeeds.

## Task 3: Add Supabase Client and Registration Service

**Files:**
- Create: `C:\LoveDateInviteAdmin\src\services\supabaseClient.ts`
- Create: `C:\LoveDateInviteAdmin\src\services\inviteRegistration.ts`
- Create: `C:\LoveDateInviteAdmin\src\services\inviteRegistration.test.ts`

- [ ] **Step 1: Write failing registration tests**

Write `C:\LoveDateInviteAdmin\src\services\inviteRegistration.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerInviteCode } from './inviteRegistration'

describe('registerInviteCode', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('posts invite settings to the Edge Function', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        id: 'invite-id',
        code: 'A7KQ-M9VP-R4TX-Z8CN',
        active: true,
        usesLeft: 1,
        expiresAt: '2026-08-05T00:00:00.000Z',
        createdAt: '2026-05-07T00:00:00.000Z',
      },
      error: null,
    })

    const result = await registerInviteCode(
      {
        code: 'A7KQ-M9VP-R4TX-Z8CN',
        usesLeft: 1,
        expiresAt: '2026-08-05T00:00:00.000Z',
        label: 'Private beta',
      },
      { functions: { invoke } },
    )

    expect(invoke).toHaveBeenCalledWith('create-invite-code', {
      body: {
        code: 'A7KQ-M9VP-R4TX-Z8CN',
        usesLeft: 1,
        expiresAt: '2026-08-05T00:00:00.000Z',
        label: 'Private beta',
      },
    })
    expect(result.code).toBe('A7KQ-M9VP-R4TX-Z8CN')
  })

  it('throws the Edge Function error message', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Admin access required' },
    })

    await expect(
      registerInviteCode(
        {
          code: 'A7KQ-M9VP-R4TX-Z8CN',
          usesLeft: 1,
          expiresAt: null,
          label: '',
        },
        { functions: { invoke } },
      ),
    ).rejects.toThrow('Admin access required')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
npm run test -- src/services/inviteRegistration.test.ts
```

Expected: FAIL because `inviteRegistration.ts` does not exist.

- [ ] **Step 3: Implement Supabase client**

Write `C:\LoveDateInviteAdmin\src\services\supabaseClient.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  return supabase
}
```

- [ ] **Step 4: Implement registration service**

Write `C:\LoveDateInviteAdmin\src\services\inviteRegistration.ts`:

```ts
import { getSupabase } from './supabaseClient'

export type RegisterInvitePayload = {
  code: string
  usesLeft: number
  expiresAt: string | null
  label: string
}

export type RegisteredInvite = {
  id: string
  code: string
  active: boolean
  usesLeft: number
  expiresAt: string | null
  createdAt: string
}

type InvokeClient = {
  functions: {
    invoke: (
      functionName: string,
      options: { body: RegisterInvitePayload },
    ) => Promise<{ data: RegisteredInvite | null; error: { message: string } | null }>
  }
}

export const registerInviteCode = async (
  payload: RegisterInvitePayload,
  client?: InvokeClient,
): Promise<RegisteredInvite> => {
  const activeClient = client ?? getSupabase()
  const { data, error } = await activeClient.functions.invoke('create-invite-code', {
    body: payload,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Invite registration returned no data')
  }

  return data
}
```

- [ ] **Step 5: Run registration tests**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
npm run test -- src/services/inviteRegistration.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit registration service**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
git add src/services/supabaseClient.ts src/services/inviteRegistration.ts src/services/inviteRegistration.test.ts
git commit -m "feat: add invite registration service"
```

Expected: commit succeeds.

## Task 4: Build the Supabase Edge Function

**Files:**
- Create: `C:\LoveDateInviteAdmin\supabase\functions\create-invite-code\index.ts`
- Create: `C:\LoveDateInviteAdmin\supabase\functions\create-invite-code\index.test.ts`

- [ ] **Step 1: Create function directories**

Run:

```powershell
New-Item -ItemType Directory -Force C:\LoveDateInviteAdmin\supabase\functions\create-invite-code | Out-Null
```

Expected: function directory exists.

- [ ] **Step 2: Write failing Edge Function tests**

Write `C:\LoveDateInviteAdmin\supabase\functions\create-invite-code\index.test.ts`:

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { buildCreateInviteHandler } from './index.ts'

Deno.test('rejects requests without a bearer token', async () => {
  const handler = buildCreateInviteHandler({
    adminEmails: ['owner@example.com'],
    serviceRoleKey: 'service-role',
    supabaseUrl: 'https://example.supabase.co',
  })

  const response = await handler(new Request('https://fn.test', { method: 'POST' }))
  assertEquals(response.status, 401)
})

Deno.test('rejects non-admin users', async () => {
  const handler = buildCreateInviteHandler({
    adminEmails: ['owner@example.com'],
    serviceRoleKey: 'service-role',
    supabaseUrl: 'https://example.supabase.co',
    fetchImpl: async (url) => {
      if (String(url).includes('/auth/v1/user')) {
        return Response.json({ email: 'other@example.com', id: 'user-id' })
      }

      return Response.json({})
    },
  })

  const response = await handler(
    new Request('https://fn.test', {
      method: 'POST',
      headers: { Authorization: 'Bearer user-token' },
      body: JSON.stringify({ code: 'A7KQ-M9VP-R4TX-Z8CN', usesLeft: 1, expiresAt: null, label: '' }),
    }),
  )

  assertEquals(response.status, 403)
})

Deno.test('inserts valid invite for admin users', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const handler = buildCreateInviteHandler({
    adminEmails: ['owner@example.com'],
    serviceRoleKey: 'service-role',
    supabaseUrl: 'https://example.supabase.co',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init })

      if (String(url).includes('/auth/v1/user')) {
        return Response.json({ email: 'owner@example.com', id: 'owner-id' })
      }

      return Response.json([
        {
          id: 'invite-id',
          code: 'A7KQ-M9VP-R4TX-Z8CN',
          active: true,
          uses_left: 1,
          expires_at: null,
          created_at: '2026-05-07T00:00:00.000Z',
        },
      ])
    },
  })

  const response = await handler(
    new Request('https://fn.test', {
      method: 'POST',
      headers: { Authorization: 'Bearer user-token' },
      body: JSON.stringify({ code: 'A7KQ-M9VP-R4TX-Z8CN', usesLeft: 1, expiresAt: null, label: '' }),
    }),
  )
  const data = await response.json()

  assertEquals(response.status, 200)
  assertEquals(data.code, 'A7KQ-M9VP-R4TX-Z8CN')
  assertEquals(calls.some((call) => call.url.includes('/rest/v1/beta_invites')), true)
})
```

- [ ] **Step 3: Run Edge Function tests to verify they fail**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin\supabase\functions\create-invite-code
deno test --allow-net index.test.ts
```

Expected: FAIL because `index.ts` does not exist.

- [ ] **Step 4: Implement Edge Function**

Write `C:\LoveDateInviteAdmin\supabase\functions\create-invite-code\index.ts`:

```ts
const SAFE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const FORBIDDEN_PREFIXES = ['LD', 'LOVE', 'LVD', 'DATE']

type CreateInvitePayload = {
  code: string
  usesLeft: number
  expiresAt: string | null
  label: string
}

type HandlerConfig = {
  supabaseUrl: string
  serviceRoleKey: string
  adminEmails: string[]
  fetchImpl?: typeof fetch
}

const json = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    },
  })

const stripSeparators = (code: string): string => code.replace(/[-.]/g, '')

const isValidInviteCode = (code: string): boolean => {
  const raw = stripSeparators(code)

  if (raw.length < 16 || raw.length > 24) {
    return false
  }

  if (FORBIDDEN_PREFIXES.some((prefix) => code.startsWith(prefix))) {
    return false
  }

  return raw.split('').every((char) => SAFE_ALPHABET.includes(char))
}

const parsePayload = async (request: Request): Promise<CreateInvitePayload> => {
  const raw = await request.json()

  return {
    code: String(raw.code ?? '').trim().toUpperCase(),
    usesLeft: Number(raw.usesLeft ?? 1),
    expiresAt: raw.expiresAt ? String(raw.expiresAt) : null,
    label: String(raw.label ?? ''),
  }
}

export const buildCreateInviteHandler = (config: HandlerConfig) => {
  const fetcher = config.fetchImpl ?? fetch
  const adminEmails = new Set(config.adminEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))

  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
      return json({ ok: true })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return json({ error: 'Authentication required' }, 401)
    }

    const userResponse = await fetcher(`${config.supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authorization,
        apikey: config.serviceRoleKey,
      },
    })

    if (!userResponse.ok) {
      return json({ error: 'Authentication required' }, 401)
    }

    const user = await userResponse.json()
    const email = String(user.email ?? '').toLowerCase()

    if (!adminEmails.has(email)) {
      return json({ error: 'Admin access required' }, 403)
    }

    const payload = await parsePayload(request)

    if (!isValidInviteCode(payload.code)) {
      return json({ error: 'Invalid invite code format' }, 400)
    }

    if (!Number.isInteger(payload.usesLeft) || payload.usesLeft < 1 || payload.usesLeft > 1000) {
      return json({ error: 'usesLeft must be between 1 and 1000' }, 400)
    }

    if (payload.expiresAt && Number.isNaN(Date.parse(payload.expiresAt))) {
      return json({ error: 'expiresAt must be an ISO date string or null' }, 400)
    }

    const insertResponse = await fetcher(`${config.supabaseUrl}/rest/v1/beta_invites?select=id,code,active,uses_left,expires_at,created_at`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.serviceRoleKey}`,
        apikey: config.serviceRoleKey,
        'content-type': 'application/json',
        prefer: 'return=representation',
      },
      body: JSON.stringify({
        code: payload.code,
        active: true,
        uses_left: payload.usesLeft,
        expires_at: payload.expiresAt,
      }),
    })

    if (!insertResponse.ok) {
      const message = await insertResponse.text()
      return json({ error: message || 'Invite insert failed' }, insertResponse.status)
    }

    const rows = await insertResponse.json()
    const row = Array.isArray(rows) ? rows[0] : rows

    return json({
      id: row.id,
      code: row.code,
      active: row.active,
      usesLeft: row.uses_left,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    })
  }
}

if (import.meta.main) {
  const handler = buildCreateInviteHandler({
    supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    adminEmails: (Deno.env.get('ADMIN_EMAILS') ?? '').split(','),
  })

  Deno.serve(handler)
}
```

- [ ] **Step 5: Run Edge Function tests**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin\supabase\functions\create-invite-code
deno test --allow-net index.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Edge Function**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
git add supabase/functions/create-invite-code/index.ts supabase/functions/create-invite-code/index.test.ts
git commit -m "feat: add secure invite creation function"
```

Expected: commit succeeds.

## Task 5: Build the Mobile Admin UI

**Files:**
- Modify: `C:\LoveDateInviteAdmin\src\App.tsx`
- Modify: `C:\LoveDateInviteAdmin\src\App.css`

- [ ] **Step 1: Replace `App.tsx` with the complete workflow UI**

Write `C:\LoveDateInviteAdmin\src\App.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabase } from './services/supabaseClient'
import { generateInviteCode, type InviteGenerationResult } from './services/inviteGenerator'
import { registerInviteCode, type RegisteredInvite } from './services/inviteRegistration'

type SessionState = {
  email: string
}

type RecentInvite = RegisteredInvite & {
  label: string
}

const RECENT_INVITES_KEY = 'lovedate-invite-admin:recent'

const readRecentInvites = (): RecentInvite[] => {
  const raw = window.localStorage.getItem(RECENT_INVITES_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, 12) : []
  } catch {
    return []
  }
}

const saveRecentInvites = (invites: RecentInvite[]): void => {
  window.localStorage.setItem(RECENT_INVITES_KEY, JSON.stringify(invites.slice(0, 12)))
}

export default function App() {
  const supabase = useMemo(() => getSupabase(), [])
  const [session, setSession] = useState<SessionState | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [usesLeft, setUsesLeft] = useState(1)
  const [expiresInDays, setExpiresInDays] = useState(90)
  const [label, setLabel] = useState('Private beta')
  const [traceOpen, setTraceOpen] = useState(false)
  const [generated, setGenerated] = useState<InviteGenerationResult | null>(null)
  const [registered, setRegistered] = useState<RegisteredInvite | null>(null)
  const [recent, setRecent] = useState<RecentInvite[]>(() => readRecentInvites())

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return
      }

      setSession(data.session?.user.email ? { email: data.session.user.email } : null)
      setAuthBusy(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession?.user.email ? { email: nextSession.user.email } : null)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const expiresAt = useMemo(() => {
    if (expiresInDays <= 0) {
      return null
    }

    const date = new Date()
    date.setDate(date.getDate() + expiresInDays)
    return date.toISOString()
  }, [expiresInDays])

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        throw new Error(signInError.message)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setGenerated(null)
    setRegistered(null)
  }

  const generate = useCallback(async () => {
    setError('')
    setRegistered(null)
    setBusy(true)

    try {
      const result = await generateInviteCode(session?.email ?? 'local-admin')
      setGenerated(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Code generation failed')
    } finally {
      setBusy(false)
    }
  }, [session?.email])

  const register = async () => {
    if (!generated) {
      return
    }

    setError('')
    setBusy(true)

    try {
      const result = await registerInviteCode({
        code: generated.code,
        usesLeft,
        expiresAt,
        label,
      })
      const nextRecent = [{ ...result, label }, ...recent.filter((item) => item.code !== result.code)].slice(0, 12)
      setRegistered(result)
      setRecent(nextRecent)
      saveRecentInvites(nextRecent)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invite registration failed')
    } finally {
      setBusy(false)
    }
  }

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
  }

  const shareCode = async (code: string) => {
    if (navigator.share) {
      await navigator.share({ title: 'LoveDate invite code', text: code })
      return
    }

    await copyCode(code)
  }

  if (authBusy) {
    return (
      <main className="admin-shell">
        <section className="admin-panel">
          <p className="admin-kicker">Private admin</p>
          <h1>Loading</h1>
        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="admin-shell">
        <section className="admin-panel">
          <p className="admin-kicker">Private admin</p>
          <h1>Invite Admin</h1>
          <p className="soft">Sign in with your owner account before registering codes in Supabase.</p>
          <form className="admin-form" onSubmit={signIn}>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-shell admin-shell--dashboard">
      <section className="admin-header">
        <div>
          <p className="admin-kicker">Invite control</p>
          <h1>Generate access</h1>
          <p className="soft">Signed in as {session.email}</p>
        </div>
        <button type="button" className="ghost-btn" onClick={signOut}>
          Sign out
        </button>
      </section>

      <section className="admin-grid">
        <article className="admin-panel generator-panel">
          <div className="panel-head">
            <div>
              <h2>Generator</h2>
              <p className="soft">Ten chained stages, randomized final format, no branded prefix.</p>
            </div>
            <button type="button" className="primary-btn" onClick={generate} disabled={busy}>
              {busy ? 'Working...' : 'Generate'}
            </button>
          </div>

          <div className="settings-grid">
            <label>
              Uses left
              <input type="number" min={1} max={1000} value={usesLeft} onChange={(event) => setUsesLeft(Number(event.target.value))} />
            </label>
            <label>
              Expires in days
              <input type="number" min={0} max={730} value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))} />
            </label>
            <label className="wide-field">
              Internal label
              <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} />
            </label>
          </div>

          {generated ? (
            <div className="code-preview">
              <span>Final code</span>
              <strong>{generated.code}</strong>
              <small>{generated.pattern.name}</small>
              <div className="action-row">
                <button type="button" className="primary-btn" onClick={register} disabled={busy}>
                  Register in Supabase
                </button>
                <button type="button" className="ghost-btn" onClick={() => copyCode(generated.code)}>
                  Copy
                </button>
                <button type="button" className="ghost-btn" onClick={() => shareCode(generated.code)}>
                  Share
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">Tap Generate to create a private invite code.</div>
          )}

          {registered ? <p className="success-text">Registered {registered.code} in Supabase.</p> : null}
          {error ? <p className="error-text">{error}</p> : null}

          {generated ? (
            <div className="trace-panel">
              <button type="button" className="trace-toggle" onClick={() => setTraceOpen((value) => !value)}>
                {traceOpen ? 'Hide generation trace' : 'Show generation trace'}
              </button>
              {traceOpen ? (
                <ol>
                  {generated.stages.map((stage) => (
                    <li key={stage.name}>
                      <span>{stage.name}</span>
                      <code>{stage.value}</code>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}
        </article>

        <article className="admin-panel recent-panel">
          <h2>Recent codes</h2>
          {recent.length === 0 ? (
            <p className="soft">No registered codes on this device yet.</p>
          ) : (
            <div className="recent-list">
              {recent.map((invite) => (
                <div className="recent-item" key={invite.id}>
                  <div>
                    <strong>{invite.code}</strong>
                    <span>{invite.label || 'Invite'} · uses {invite.usesLeft}</span>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => copyCode(invite.code)}>
                    Copy
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Replace `App.css` with production UI styles**

Write `C:\LoveDateInviteAdmin\src\App.css`:

```css
:root {
  color: #edf5ff;
  background: #090d20;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 0%, rgba(201, 169, 97, 0.15), transparent 26rem),
    radial-gradient(circle at 90% 14%, rgba(0, 229, 255, 0.08), transparent 22rem),
    linear-gradient(160deg, #070a19 0%, #111735 54%, #070a19 100%);
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.64;
}

.admin-shell {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
}

.admin-shell--dashboard {
  align-content: start;
  place-items: stretch;
  gap: 1rem;
}

.admin-header,
.admin-grid {
  width: min(100%, 68rem);
  margin: 0 auto;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.admin-panel {
  width: min(100%, 28rem);
  border: 1px solid rgba(201, 169, 97, 0.28);
  background: rgba(14, 20, 48, 0.86);
  border-radius: 1rem;
  padding: 1.2rem;
  box-shadow: 0 24px 54px rgba(2, 6, 22, 0.48);
}

.admin-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.7fr);
  gap: 1rem;
  align-items: start;
}

.generator-panel,
.recent-panel {
  width: 100%;
}

.admin-kicker {
  margin: 0 0 0.55rem;
  color: #e8c77d;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
  line-height: 1;
}

h1 {
  font-size: clamp(2.2rem, 8vw, 4.2rem);
}

h2 {
  font-size: clamp(1.35rem, 4vw, 2rem);
}

.soft,
p {
  color: rgba(237, 245, 255, 0.84);
  line-height: 1.5;
}

.admin-form,
.settings-grid,
.trace-panel ol,
.recent-list {
  display: grid;
  gap: 0.75rem;
}

.admin-form {
  margin-top: 1rem;
}

label {
  display: grid;
  gap: 0.36rem;
  color: rgba(237, 245, 255, 0.86);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

input {
  width: 100%;
  border: 1px solid rgba(112, 130, 216, 0.34);
  border-radius: 0.72rem;
  background: rgba(9, 13, 32, 0.72);
  color: #edf5ff;
  padding: 0.74rem 0.82rem;
}

input:focus {
  outline: none;
  border-color: rgba(232, 199, 125, 0.72);
  box-shadow: 0 0 0 3px rgba(201, 169, 97, 0.18);
}

.panel-head,
.action-row,
.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.settings-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 1rem;
}

.wide-field {
  grid-column: 1 / -1;
}

.primary-btn,
.ghost-btn {
  border-radius: 0.72rem;
  min-height: 2.55rem;
  padding: 0.68rem 0.95rem;
  font-weight: 800;
  border: 1px solid transparent;
}

.primary-btn {
  background: linear-gradient(135deg, #c9a961, #f2d18a);
  color: #1b1305;
}

.ghost-btn {
  border-color: rgba(201, 169, 97, 0.32);
  background: rgba(21, 29, 69, 0.66);
  color: #f5dfaa;
}

.code-preview,
.empty-state {
  margin-top: 1rem;
  border: 1px solid rgba(201, 169, 97, 0.24);
  border-radius: 0.95rem;
  background: rgba(9, 13, 32, 0.52);
  padding: 1rem;
}

.code-preview {
  display: grid;
  gap: 0.65rem;
}

.code-preview span,
.code-preview small {
  color: rgba(237, 245, 255, 0.72);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.code-preview strong {
  display: block;
  overflow-wrap: anywhere;
  color: #ffffff;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: clamp(1.6rem, 7vw, 2.7rem);
  line-height: 1.05;
  letter-spacing: 0;
}

.empty-state {
  color: rgba(237, 245, 255, 0.68);
}

.success-text {
  color: #9ff0c5;
}

.error-text {
  color: #ffd4dc;
}

.trace-panel {
  margin-top: 1rem;
}

.trace-toggle {
  border: 0;
  background: transparent;
  color: #e8c77d;
  padding: 0;
  font-weight: 800;
}

.trace-panel ol {
  margin: 0.8rem 0 0;
  padding-left: 1.2rem;
}

.trace-panel li {
  color: rgba(237, 245, 255, 0.72);
}

.trace-panel code {
  display: block;
  margin-top: 0.2rem;
  overflow-wrap: anywhere;
  color: #edf5ff;
  font-size: 0.78rem;
}

.recent-item {
  border: 1px solid rgba(112, 130, 216, 0.24);
  border-radius: 0.82rem;
  background: rgba(9, 13, 32, 0.42);
  padding: 0.72rem;
}

.recent-item div {
  min-width: 0;
  display: grid;
  gap: 0.24rem;
}

.recent-item strong {
  overflow-wrap: anywhere;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}

.recent-item span {
  color: rgba(237, 245, 255, 0.66);
  font-size: 0.82rem;
}

@media (max-width: 780px) {
  .admin-header,
  .panel-head,
  .action-row {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-grid,
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .admin-header .ghost-btn,
  .panel-head .primary-btn,
  .action-row button {
    width: 100%;
  }
}
```

- [ ] **Step 3: Run build and tests**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
npm run test
npm run build
```

Expected: both commands pass.

- [ ] **Step 4: Start the dev server for browser verification**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 5: Verify the UI manually**

Open the local URL and verify:

- Sign-in screen renders without overflow at desktop width.
- Sign-in screen renders without overflow at mobile width.
- After signing in with a Supabase account, Generate produces a long unbranded code.
- Register calls the Edge Function and shows success.
- Copy writes the code to clipboard.
- Recent codes persist after refresh.

- [ ] **Step 6: Commit the UI**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
git add src/App.tsx src/App.css
git commit -m "feat: build invite admin workflow"
```

Expected: commit succeeds.

## Task 6: Add Setup Documentation and Deployment Notes

**Files:**
- Create: `C:\LoveDateInviteAdmin\README.md`

- [ ] **Step 1: Write README**

Write `C:\LoveDateInviteAdmin\README.md`:

```md
# LoveDate Invite Admin

Private mobile admin app for generating long unbranded LoveDate beta invite codes and registering them in Supabase.

## Security

The app uses the public Supabase anon key only. It never stores the Supabase service-role key. Invite inserts happen through the `create-invite-code` Supabase Edge Function, which checks the signed-in user against `ADMIN_EMAILS`.

## Environment

Create `.env` from `.env.example`:

```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Set Edge Function secrets:

```powershell
supabase secrets set ADMIN_EMAILS=owner@example.com
```

Supabase automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in deployed Edge Functions.

## Development

```powershell
npm install
npm run dev
```

## Tests

```powershell
npm run test
deno test --allow-net supabase/functions/create-invite-code/index.test.ts
```

## Build

```powershell
npm run build
```

## Deploy Edge Function

```powershell
supabase functions deploy create-invite-code
```

## Android

```powershell
npm run build
npm run cap:add:android
npm run cap:sync
```

Open the generated Android project in Android Studio and install it only on the owner's phone.

## Final Verification

1. Sign in as the allowlisted admin.
2. Generate a code.
3. Register it in Supabase.
4. Confirm the code exists in `public.beta_invites`.
5. Use the exact code in the public LoveDate app login/register flow.
```

- [ ] **Step 2: Run full verification**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
npm run test
npm run build
deno test --allow-net supabase/functions/create-invite-code/index.test.ts
```

Expected: all commands pass.

- [ ] **Step 3: Commit documentation**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
git add README.md .env.example
git commit -m "docs: add invite admin setup guide"
```

Expected: commit succeeds.

## Task 7: End-to-End Supabase Verification

**Files:**
- No required source changes.

- [ ] **Step 1: Configure local app environment**

Create `C:\LoveDateInviteAdmin\.env` from `.env.example` using the same Supabase project used by `C:\LoveDate`.

Expected: `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

- [ ] **Step 2: Configure Edge Function admin allowlist**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
supabase secrets set ADMIN_EMAILS=owner@example.com
```

Replace `owner@example.com` with the actual Supabase Auth email used on the phone.

Expected: Supabase CLI reports the secret was set.

- [ ] **Step 3: Deploy Edge Function**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
supabase functions deploy create-invite-code
```

Expected: deployment succeeds.

- [ ] **Step 4: Register one invite from the admin app**

Run:

```powershell
Set-Location C:\LoveDateInviteAdmin
npm run dev -- --host 127.0.0.1
```

Open the local URL, sign in as the allowlisted admin, generate a code, and click `Register in Supabase`.

Expected: UI shows `Registered <code> in Supabase.`

- [ ] **Step 5: Verify the invite exists in Supabase**

Run in Supabase SQL editor:

```sql
select code, active, uses_left, expires_at, created_at
from public.beta_invites
where code = '<generated-code>';
```

Expected: one row is returned with `active = true` and the selected `uses_left`.

- [ ] **Step 6: Verify the public LoveDate app accepts the code**

Run:

```powershell
Set-Location C:\LoveDate
npm run dev -- --host 127.0.0.1
```

Open the public LoveDate app, enter the generated invite code on login/register, and continue the auth flow.

Expected: LoveDate does not reject the invite code as invalid.

- [ ] **Step 7: Final commit if verification notes changed docs**

If README or notes were updated during verification, run:

```powershell
Set-Location C:\LoveDateInviteAdmin
git add README.md
git commit -m "docs: record invite admin verification"
```

Expected: commit succeeds only if documentation changed.
