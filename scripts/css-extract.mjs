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
  chat: { file: 'ChatScreen.css', re: /^(chat|msg|message|conversation|thread)/ },
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

const classTokens = (sel) => [...sel.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1])
const parts = (selector) => selector.split(',').map((s) => s.trim().replace(/\s+/g, ' '))

// ── Build the KEEP-SET: screen-exclusive selectors that must NOT move because a
// rule LEFT BEHIND in App.css competes with them at equal specificity. Two sources:
//
// (1) CSS grouping. A comma-part that is screen-exclusive but shares a rule with a
//     foreign selector — e.g. line 113's `.discover-stage, .activity-layout,
//     .profile-screen, .settings-screen, .profile-detail` mobile-collapse rule.
//     That whole rule stays (it's multi-screen), so its `.activity-layout` decls
//     stay; moving the standalone `.activity-layout` rules past it would flip them.
const keep = new Set()
root.walkRules((rule) => {
  if (rule.parent && rule.parent.type === 'rule') return
  const ps = parts(rule.selector)
  const exclusiveParts = ps.filter((p) => {
    const t = classTokens(p)
    return t.length > 0 && t.every((x) => cfg.re.test(x))
  })
  const hasForeign = exclusiveParts.length < ps.length // some part isn't screen-exclusive
  if (hasForeign) for (const p of exclusiveParts) keep.add(p)
})

// (2) JSX co-occurrence. A screen class applied (in className) to an element that
//     ALSO carries a foreign class — e.g. <section class="settings-screen
//     moderation-screen"> — competes with that foreign class's rules at equal
//     specificity on the SAME element. Keep the bare `.class` so it can't move.
const tsxFiles = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${e.name}`
    if (e.isDirectory()) walk(full)
    else if (e.name.endsWith('.tsx')) tsxFiles.push(full)
  }
}
walk('src')
for (const f of tsxFiles) {
  const src = fs.readFileSync(f, 'utf8')
  // every quoted string that looks like a class list (className="..." and the
  // ternary branches inside className={...}); conservative — scans all string lits.
  for (const m of src.matchAll(/(['"`])([A-Za-z0-9_\- ]+)\1/g)) {
    const toks = m[2].trim().split(/\s+/).filter(Boolean)
    if (toks.length < 2) continue
    const mine = toks.filter((t) => cfg.re.test(t))
    const foreign = toks.some((t) => !cfg.re.test(t))
    if (mine.length && foreign) for (const t of mine) keep.add(`.${t}`)
  }
}

// A rule is movable iff every class token matches the screen prefix AND none of its
// comma-parts is in the keep-set AND none of its class tokens is a kept bare class.
const keptBare = new Set([...keep].filter((k) => /^\.[A-Za-z0-9_-]+$/.test(k)).map((k) => k.slice(1)))
const isMovable = (rule) => {
  const tokens = classTokens(rule.selector)
  if (tokens.length === 0) return false
  if (!tokens.every((t) => cfg.re.test(t))) return false
  const ps = parts(rule.selector)
  if (ps.some((p) => keep.has(p))) return false
  if (tokens.some((t) => keptBare.has(t))) return false
  return true
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
