// scripts/css-dedup.mjs — provably-safe App.css de-duplicator (2026-05-31)
//
// App.css grew through ~5 "design passes" that each re-declared the SAME
// selectors instead of editing the originals (.discover-deck ×9, etc.). This
// removes the resulting DEAD declarations.
//
// Soundness: a declaration D (selector S, media context M, property P) is
// removed ONLY IF a LATER rule (strictly later in source order) with the
// IDENTICAL selector string S and IDENTICAL media context M also declares P,
// with importance >= D's. Because S→S means identical specificity and the
// later one is later in source order, that later declaration ALWAYS wins the
// cascade over D for every element, in every other file, at every viewport
// where M applies. Therefore removing D changes no computed value anywhere.
// This is a no-op by CSS cascade semantics — no browser needed to prove it.
//
// Safety guards:
//  - Only cross-RULE shadowing (different rule nodes). Declarations repeated
//    WITHIN one rule are left alone (that's the progressive-enhancement
//    fallback pattern, e.g. `display:-webkit-box; display:flex`).
//  - Identical media-query string required (a @media(max-1024) decl and a
//    @media(max-768) decl apply at different viewports — never shadow them).
//  - !important respected (a later non-important never kills an earlier
//    !important).
//
// Usage:
//   node scripts/css-dedup.mjs --report      # dry run: list what would go
//   node scripts/css-dedup.mjs --write       # rewrite src/App.css in place

import fs from 'node:fs'
import postcss from 'postcss'

const FILE = 'src/App.css'
const mode = process.argv.includes('--write') ? 'write' : 'report'

const css = fs.readFileSync(FILE, 'utf8')
const root = postcss.parse(css)

// media context string for a node (walk up @media/@supports ancestors)
const mediaCtx = (node) => {
  const parts = []
  let p = node.parent
  while (p && p.type === 'atrule') {
    parts.unshift(`@${p.name} ${p.params}`)
    p = p.parent
  }
  return parts.join(' && ')
}

// Assign each rule a source-order index.
let ruleIdx = 0
const ruleOrder = new Map()
root.walkRules((rule) => {
  ruleOrder.set(rule, ruleIdx++)
})

// Collect every declaration that lives directly inside a style rule.
const decls = []
root.walkDecls((decl) => {
  const rule = decl.parent
  if (!rule || rule.type !== 'rule') return
  decls.push({
    decl,
    rule,
    order: ruleOrder.get(rule),
    key: `${mediaCtx(rule)} || ${rule.selector} || ${decl.prop.toLowerCase()}`,
    important: Boolean(decl.important),
  })
})

// Group by (media, selector, property).
const groups = new Map()
for (const d of decls) {
  if (!groups.has(d.key)) groups.set(d.key, [])
  groups.get(d.key).push(d)
}

// The winning declaration of a group = last (max source order) among the
// highest importance present. This is the value that actually renders.
const winnerValue = (group) => {
  const anyImportant = group.some((d) => d.important)
  const pool = anyImportant ? group.filter((d) => d.important) : group
  const w = pool.reduce((best, d) => (d.order >= best.order ? d : best), pool[0])
  return `${w.decl.value}|imp:${w.important}`
}

const toRemove = []
const toRemoveSet = new Set()
for (const [, group] of groups) {
  if (group.length < 2) continue
  for (const d of group) {
    // d dies if a strictly-later RULE in the same group dominates it.
    const dominated = group.some(
      (o) => o.order > d.order && (o.important || !d.important),
    )
    if (dominated) {
      toRemove.push(d)
      toRemoveSet.add(d)
    }
  }
}

// HARD GATE: prove the planned removal preserves the winning declaration of
// every group. Removing only dominated decls can't change a winner — this
// assertion catches any bug in that logic before we touch the file.
const mismatches = []
for (const [key, group] of groups) {
  if (group.length < 2) continue
  const before = winnerValue(group)
  const survivors = group.filter((d) => !toRemoveSet.has(d))
  if (survivors.length === 0) {
    mismatches.push(`${key} :: ALL removed (winner lost!)`)
    continue
  }
  const after = winnerValue(survivors)
  if (before !== after) mismatches.push(`${key} :: ${before}  ->  ${after}`)
}
if (mismatches.length > 0) {
  console.error(`ABORT — ${mismatches.length} group winner(s) would change (this is a script bug, NOT safe):`)
  for (const m of mismatches.slice(0, 20)) console.error(`  ${m}`)
  process.exit(1)
}
console.log('Self-check PASSED: every group winner is preserved (removal is render-neutral).\n')

// Report
const byKey = new Map()
for (const d of toRemove) {
  const k = `${mediaCtx(d.rule)} || ${d.rule.selector}`
  byKey.set(k, (byKey.get(k) || 0) + 1)
}
const topOffenders = [...byKey.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)

console.log(`Total declarations: ${decls.length}`)
console.log(`Dead (overridden by a later same-selector/same-media rule): ${toRemove.length}`)
console.log('\nTop selectors losing dead declarations:')
for (const [k, n] of topOffenders) console.log(`  ${n.toString().padStart(3)}  ${k}`)

if (mode === 'write') {
  for (const d of toRemove) d.decl.remove()
  // Drop rules that are now empty, then empty atrules.
  let removedRules = 0
  root.walkRules((rule) => {
    if (rule.nodes.length === 0) {
      rule.remove()
      removedRules++
    }
  })
  root.walkAtRules((at) => {
    if ((at.name === 'media' || at.name === 'supports') && at.nodes && at.nodes.length === 0) {
      at.remove()
    }
  })
  fs.writeFileSync(FILE, root.toString())
  const after = fs.readFileSync(FILE, 'utf8').split('\n').length
  console.log(`\nWROTE ${FILE}: removed ${toRemove.length} dead decls + ${removedRules} now-empty rules. New line count: ${after}`)
} else {
  console.log('\n(dry run — re-run with --write to apply)')
}
