// scripts/split-backend.mjs — one-shot: split src/services/backendApi.ts into
// per-domain modules under src/services/backend/, leaving backendApi.ts as a
// re-export barrel so every existing `from '../services/backendApi'` keeps working.
//
// Uses the TypeScript compiler for EXACT statement text (incl. leading comments)
// and precise reference analysis — no hand-transcription. Each module imports
// only the cross-module / shared-core symbols it actually references (word-boundary
// match on its own text → no unused imports). tsc + tests are the proof.
//
//   node scripts/split-backend.mjs --report   (show modules, sizes, cross-edges)
//   node scripts/split-backend.mjs --write

import ts from 'typescript'
import fs from 'node:fs'

const FILE = 'src/services/backendApi.ts'
const OUTDIR = 'src/services/backend'
const write = process.argv.includes('--write')
const src = fs.readFileSync(FILE, 'utf8')
const sf = ts.createSourceFile(FILE, src, ts.ScriptTarget.Latest, true)

// name → domain. Anything not listed lands in 'client' (the shared core).
const DOMAIN = {
  auth: ['backendLogin', 'backendRegister', 'backendGuestLogin', 'backendSignOut', 'backendValidateInviteCode', 'backendDeleteSelfAccount', 'normalizeInvite', 'getEnvInviteCodes', 'isInviteAlreadyValidated', 'rememberValidatedInvite', 'recordInviteRedemption', 'getRecentInviteAttempts', 'recordInviteAttempt', 'assertInviteAttemptLimit'],
  profile: ['SettingsPayload', 'backendReadSelfProfile', 'backendFetchSelfProfile', 'backendSaveSelfProfile', 'backendSetLocalSelfProfile', 'backendResetLocalSelfProfile', 'purgeOtherSelfProfileCaches', 'purgeAllSelfProfileCaches', 'backendUploadProfilePhoto', 'backendUploadDataUrlPhotos', 'backendEnsureDiscoverableProfile', 'backendRepairDiscoverableProfile', 'backendSaveSettings', 'backendLoadSettings', 'backendLoadPreferences', 'backendSavePreferences', 'readLocalSettings'],
  verification: ['VerificationStatus', 'AdminVerificationRequest', 'backendUploadVerificationSelfie', 'backendSubmitVerification', 'backendGetMyVerificationStatus', 'backendListVerifications', 'backendGetSelfieSignedUrl', 'backendReviewVerification'],
  social: ['backendLoadBlockedProfileIds', 'backendAddBlock', 'backendRemoveBlock', 'backendBackfillBlocks', 'backendSubmitReport', 'backendAdminSetProfileActive', 'backendRecordSwipe', 'backendLoadSwipeHistory'],
  telemetry: ['ClientErrorSeverity', 'ClientErrorRow', 'backendListClientErrors', 'backendLogClientError'],
  waitlist: ['WaitlistSubmission', 'backendSubmitWaitlist', 'backendGetWaitlistQuestion', 'backendSubmitWaitlistReply'],
  chat: ['CloudChatMessage', 'ChatMessageRow', 'mapChatMessageRow', 'backendSendChatMessage', 'LoadedChatMessage', 'backendLoadChatHistory', 'backendSubscribeToInbox'],
}
const homeOf = (name) => {
  for (const [d, names] of Object.entries(DOMAIN)) if (names.includes(name)) return d
  return 'client'
}

// Real identifier references in a node (AST-based → ignores comments + strings,
// excludes property-access member names and the declaration's own name).
const collectRefs = (node) => {
  const out = new Set()
  const visit = (n) => {
    if (ts.isIdentifier(n)) {
      const p = n.parent
      const isMember = p && ts.isPropertyAccessExpression(p) && p.name === n
      const isQual = p && ts.isQualifiedName(p) && p.right === n
      const isKey = p && (ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p)) && p.name === n
      if (!isMember && !isQual && !isKey) out.add(n.text)
    }
    ts.forEachChild(n, visit)
  }
  visit(node)
  return out
}

// Rewrite a relative import path for code moving one directory deeper
// (src/services → src/services/backend). Package imports are left alone.
const adjustPath = (p) => {
  if (p.startsWith('./')) return '../' + p.slice(2)
  if (p.startsWith('../')) return '../' + p
  return p
}

const declName = (st) => {
  if (ts.isVariableStatement(st)) return st.declarationList.declarations[0].name.getText(sf)
  if (ts.isFunctionDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) return st.name?.getText(sf)
  return null
}
const isExported = (st) => (ts.getCombinedModifierFlags(st) & ts.ModifierFlags.Export) !== 0
const isType = (st) => ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)

// External imports (redistribute to whichever module references each name).
const externalImports = [] // { name, module, typeOnly }
const statements = [] // { name, home, text, exported, type }
for (const st of sf.statements) {
  if (ts.isImportDeclaration(st)) {
    const mod = st.moduleSpecifier.getText(sf).slice(1, -1)
    const ic = st.importClause
    if (!ic) continue
    const blanketType = Boolean(ic.isTypeOnly)
    if (ic.namedBindings && ts.isNamedImports(ic.namedBindings)) {
      for (const el of ic.namedBindings.elements) {
        externalImports.push({ name: el.name.getText(sf), module: mod, typeOnly: blanketType || Boolean(el.isTypeOnly) })
      }
    }
    continue
  }
  const name = declName(st)
  if (!name) continue
  statements.push({ name, home: homeOf(name), text: src.slice(st.getFullStart(), st.getEnd()).replace(/^\s*\n/, ''), exported: isExported(st), type: isType(st), refs: collectRefs(st) })
}

// name → home module, for all declared names.
const nameHome = new Map(statements.map((s) => [s.name, s.home]))
const moduleNames = [...new Set(statements.map((s) => s.home))]

// Assemble each module's text + computed imports.
const modules = {}
for (const mod of moduleNames) {
  const body = statements.filter((s) => s.home === mod)
  const localNames = new Set(body.map((s) => s.name))
  const usedNames = new Set()
  for (const s of body) for (const r of s.refs) usedNames.add(r)

  // Cross-module symbol imports, grouped by source module.
  const crossByMod = {}
  for (const [name, home] of nameHome) {
    if (home === mod || localNames.has(name)) continue
    if (usedNames.has(name)) {
      ;(crossByMod[home] ||= []).push({ name, type: statements.find((s) => s.name === name).type })
    }
  }
  // External imports referenced here.
  const extByMod = {}
  for (const e of externalImports) {
    if (usedNames.has(e.name)) (extByMod[e.module] ||= []).push(e)
  }

  const lines = []
  for (const [m, arr] of Object.entries(extByMod)) {
    const vals = arr.filter((e) => !e.typeOnly).map((e) => e.name)
    const typs = arr.filter((e) => e.typeOnly).map((e) => `type ${e.name}`)
    lines.push(`import { ${[...typs, ...vals].join(', ')} } from '${adjustPath(m)}'`)
  }
  for (const [m, arr] of Object.entries(crossByMod)) {
    const spec = m === 'client' ? './client' : `./${m}`
    const parts = arr.map((x) => (x.type ? `type ${x.name}` : x.name))
    lines.push(`import { ${parts.join(', ')} } from '${spec}'`)
  }
  // client.ts must export its core symbols so domains can import them. Append
  // explicit export statements (robust to declarations with leading comments).
  let text = body.map((s) => s.text).join('\n')
  if (mod === 'client') {
    const vals = body.filter((s) => !s.exported && !s.type).map((s) => s.name)
    const typs = body.filter((s) => !s.exported && s.type).map((s) => s.name)
    if (typs.length) text += `\n\n// internal exports for ./backend/* domain modules\nexport type { ${typs.join(', ')} }`
    if (vals.length) text += `\n${typs.length ? '' : '\n// internal exports for ./backend/* domain modules\n'}export { ${vals.join(', ')} }`
  }
  modules[mod] = { header: lines.join('\n'), text, body }
}

// Barrel: re-export every originally-public symbol from its new home.
const publicByMod = {}
for (const s of statements) if (s.exported) (publicByMod[s.home] ||= []).push(s)
const barrelLines = ['// backendApi.ts — re-export barrel. The implementation now lives in', '// ./backend/* (split 2026-05-31); this preserves the public import path.', '']
for (const [m, arr] of Object.entries(publicByMod)) {
  const spec = m === 'client' ? './backend/client' : `./backend/${m}`
  const vals = arr.filter((s) => !s.type).map((s) => s.name)
  const typs = arr.filter((s) => s.type).map((s) => s.name)
  if (typs.length) barrelLines.push(`export type { ${typs.join(', ')} } from '${spec}'`)
  if (vals.length) barrelLines.push(`export { ${vals.join(', ')} } from '${spec}'`)
}
const barrel = barrelLines.join('\n') + '\n'

// Report
console.log('=== backendApi split plan ===')
for (const mod of moduleNames) {
  const m = modules[mod]
  const lines = m.text.split('\n').length
  console.log(`  backend/${mod}.ts`.padEnd(28) + `${m.body.length} decls, ~${lines} lines`)
}
// cross-module edges (cycle check)
const edges = []
for (const mod of moduleNames) {
  for (const line of modules[mod].header.split('\n')) {
    const mm = line.match(/from '\.\/(\w+)'/)
    if (mm) edges.push([mod, mm[1]])
  }
}
console.log('\nCross-module import edges:')
for (const [a, b] of edges) console.log(`  ${a} -> ${b}`)
const edgeSet = new Set(edges.map((e) => e.join('>')))
const cycles = edges.filter(([a, b]) => edgeSet.has(`${b}>${a}`))
if (cycles.length) console.log('\n⚠ CYCLES:', cycles.map((c) => c.join('<->')).join(', '))
else console.log('\n✓ no 2-node cycles')

if (write) {
  fs.mkdirSync(OUTDIR, { recursive: true })
  const HDR = (mod) => `// src/services/backend/${mod}.ts — split from backendApi.ts (2026-05-31).\n`
  for (const mod of moduleNames) {
    const m = modules[mod]
    const content = HDR(mod) + (m.header ? m.header + '\n\n' : '\n') + m.text.replace(/^\n+/, '') + '\n'
    fs.writeFileSync(`${OUTDIR}/${mod}.ts`, content)
  }
  fs.writeFileSync(FILE, barrel)
  console.log(`\nWROTE ${moduleNames.length} modules + barrel. Run: npx tsc -b && npx eslint . && npx vitest run`)
} else {
  console.log('\n(report only — re-run with --write)')
}
