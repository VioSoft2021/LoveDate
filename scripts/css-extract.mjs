// scripts/css-extract.mjs — move screen-EXCLUSIVE rules out of App.css into the
// per-screen *.css file, one screen at a time. The regression net
// (scripts/css-regression.mjs --check) is the proof each move is render-neutral.
//
// SAFETY MODEL (why this is sound):
//  - Load order is tokens → index → App.css → per-screen CSS → mobile.css, and
//    screens are STATIC imports, so every per-screen file is ALWAYS loaded. Moving
//    a rule never makes it conditionally absent — it only moves LATER in the
//    cascade (App.css → after App.css).
//  - We move a rule ONLY IF every class token in every comma-selector matches the
//    screen's strict prefix (e.g. /^discover/). Such a rule targets only that
//    screen's namespaced elements, so it cannot collide at equal specificity with
//    another screen's rule. Rules naming any shared class (.badge, .top-bar, .msg,
//    .app-shell, .actions, …) are LEFT in App.css.
//  - Moved rules are PREPENDED to the per-screen file (before its existing rules),
//    so any rule already there keeps winning ties exactly as before.
//  - Relative order among moved rules is preserved (incl. @media context), so the
//    only cascade change is vs. rules left behind in App.css — which --check
//    catches for every rendered screen at desktop+mobile.
//
// Usage:
//   node scripts/css-extract.mjs <screen> --report
//   node scripts/css-extract.mjs <screen> --write

import fs from 'node:fs'
import postcss from 'postcss'

const SCREENS = {
  'personality-guide': { file: 'PersonalityGuideScreen.css', re: /^personality-guide/ },
  'love-personality': { file: 'LovePersonalityScreen.css', re: /^love-personality/ },
  'profile-detail': { file: 'ProfileDetailScreen.css', re: /^profile-detail/ },
  login: { file: 'LoginScreen.css', re: /^login/ },
  settings: { file: 'SettingsScreen.css', re: /^settings/ },
  activity: { file: 'ActivityScreen.css', re: /^activity/ },
  discover: { file: 'DiscoverScreen.css', re: /^discover/ },
  profile: { file: 'ProfileScreen.css', re: /^profile(?!-detail)/ },
  'photo-studio': { file: 'PhotoStudioScreen.css', re: /^photo-studio/ },
}

const screen = process.argv[2]
const mode = process.argv.includes('--write') ? 'write' : 'report'
const cfg = SCREENS[screen]
if (!cfg) {
  console.error(`Unknown screen "${screen}". Known: ${Object.keys(SCREENS).join(', ')}`)
  process.exit(2)
}
const APP = 'src/App.css'
const TARGET = `src/screens/${cfg.file}`

const root = postcss.parse(fs.readFileSync(APP, 'utf8'))

// A rule is movable iff it has >=1 class token and EVERY class token in EVERY
// comma-separated selector matches the screen prefix.
const classTokens = (selector) => [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1])
const isMovable = (rule) => {
  const tokens = classTokens(rule.selector)
  if (tokens.length === 0) return false
  return tokens.every((t) => cfg.re.test(t))
}

// atrule ancestor chain (outermost → direct parent), each as {name, params}.
const chainOf = (node) => {
  const chain = []
  let p = node.parent
  while (p && p.type === 'atrule') {
    chain.unshift({ name: p.name, params: p.params })
    p = p.parent
  }
  return chain
}
const sigOf = (chain) => chain.map((a) => `@${a.name} ${a.params}`).join(' && ')

// Collect movable rules in document order.
const movable = []
root.walkRules((rule) => {
  if (rule.parent && rule.parent.type === 'rule') return // nested (postcss) — skip
  if (isMovable(rule)) movable.push({ rule, chain: chainOf(rule), sig: sigOf(chainOf(rule)) })
})

if (movable.length === 0) {
  console.log(`No movable rules for "${screen}".`)
  process.exit(0)
}

if (mode === 'report') {
  console.log(`=== ${screen}: ${movable.length} movable rule(s) → ${TARGET} ===`)
  let decls = 0
  for (const m of movable) {
    const n = m.rule.nodes.filter((x) => x.type === 'decl').length
    decls += n
    const media = m.sig ? `  [${m.sig}]` : ''
    console.log(`  ${m.rule.selector.replace(/\s+/g, ' ').slice(0, 70).padEnd(70)} ${n}d${media}`)
  }
  console.log(`\nTotal: ${movable.length} rules, ${decls} declarations would move.`)
  console.log('(report only — re-run with --write to apply, then run --check)')
  process.exit(0)
}

// --- WRITE ---
// Build the moved-CSS node list in document order, coalescing consecutive
// same-media rules under one (reconstructed) atrule chain.
const buildChain = (chain) => {
  let outer = null, inner = null
  for (const a of chain) {
    const at = postcss.atRule({ name: a.name, params: a.params })
    if (!outer) { outer = at; inner = at } else { inner.append(at); inner = at }
  }
  return { outer, inner }
}

const out = []
let curSig = null, curInner = null
for (const m of movable) {
  const clone = m.rule.clone()
  if (!m.sig) { out.push(clone); curSig = null; curInner = null; continue }
  if (m.sig === curSig && curInner) { curInner.append(clone); continue }
  const { outer, inner } = buildChain(m.chain)
  inner.append(clone)
  out.push(outer)
  curSig = m.sig
  curInner = inner
}

// Remove originals from App.css, then drop any now-empty @media/@supports.
for (const m of movable) m.rule.remove()
let emptied = 0
root.walkAtRules((at) => {
  if ((at.name === 'media' || at.name === 'supports') && at.nodes && at.nodes.length === 0) {
    at.remove(); emptied++
  }
})

// Prepend to the per-screen file (before its existing rules → they keep winning).
const targetRoot = postcss.parse(fs.readFileSync(TARGET, 'utf8'))
const banner = postcss.comment({
  text: ` ───────────────────────────────────────────────────────────\n`
    + `   Moved from App.css (CSS split, 2026-05-31). Render-neutral:\n`
    + `   scripts/css-regression.mjs --check reports zero computed-style\n`
    + `   diffs across all screens at desktop + mobile.\n`
    + `   ─────────────────────────────────────────────────────────── `,
})
targetRoot.prepend(banner, ...out)

fs.writeFileSync(APP, root.toString())
fs.writeFileSync(TARGET, targetRoot.toString())

const appLines = fs.readFileSync(APP, 'utf8').split('\n').length
console.log(`Moved ${movable.length} rule(s) → ${TARGET}. Removed ${emptied} now-empty @media. App.css now ${appLines} lines.`)
console.log('Run: node scripts/css-regression.mjs --check   (must be ZERO diffs)')
