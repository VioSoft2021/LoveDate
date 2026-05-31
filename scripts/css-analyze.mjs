// scripts/css-analyze.mjs — read-only inventory of App.css to design the split safely.
// Lists, per rule, the leading class tokens, so we can see which screen namespaces
// dominate and which selectors are shared/generic (must NOT move).

import fs from 'node:fs'
import postcss from 'postcss'

const css = fs.readFileSync('src/App.css', 'utf8')
const root = postcss.parse(css)

// All class tokens already declared in each per-screen file (what it "owns").
const screenFiles = fs.readdirSync('src/screens').filter((f) => f.endsWith('.css'))
const ownedBy = {}
for (const f of screenFiles) {
  const r = postcss.parse(fs.readFileSync(`src/screens/${f}`, 'utf8'))
  const set = new Set()
  r.walkRules((rule) => {
    for (const m of rule.selector.matchAll(/\.([A-Za-z0-9_-]+)/g)) set.add(m[1])
  })
  ownedBy[f] = set
}

// Leading class of each selector in App.css → frequency + total decls.
const prefixCount = new Map()
let ruleCount = 0
let mediaRuleCount = 0
root.walkRules((rule) => {
  ruleCount++
  if (rule.parent && rule.parent.type === 'atrule') mediaRuleCount++
  // first class token of the (first) selector
  const firstSel = rule.selector.split(',')[0].trim()
  const m = firstSel.match(/\.([A-Za-z0-9_-]+)/)
  const lead = m ? m[1] : `(element:${firstSel.split(/[\s>:.[]/)[0] || '?'})`
  const cur = prefixCount.get(lead) || { rules: 0, decls: 0 }
  cur.rules++
  cur.decls += rule.nodes.filter((n) => n.type === 'decl').length
  prefixCount.set(lead, cur)
})

// Group leading classes by a guessed screen namespace.
const NS = {
  discover: /^discover/,
  profile: /^profile(?!-detail)/,
  'profile-detail': /^profile-detail/,
  settings: /^settings/,
  moderation: /^(moderation|verification-queue|crash-inbox|report)/,
  activity: /^activity/,
  chat: /^(chat|chats|conversation|message|thread)/,
  login: /^(login|auth|recovery|waitlist)/,
  onboarding: /^onboarding/,
  'love-personality': /^(love-personality|lovedna|love-dna)/,
  'personality-guide': /^(personality-guide|guide)/,
  'photo-studio': /^(photo-studio|photostudio|studio)/,
}
const nsTotals = {}
const generic = []
for (const [lead, c] of prefixCount) {
  let matched = null
  for (const [ns, re] of Object.entries(NS)) {
    if (re.test(lead)) { matched = ns; break }
  }
  if (matched) {
    if (!nsTotals[matched]) nsTotals[matched] = { rules: 0, decls: 0, leads: [] }
    nsTotals[matched].rules += c.rules
    nsTotals[matched].decls += c.decls
    nsTotals[matched].leads.push(lead)
  } else {
    generic.push([lead, c.rules])
  }
}

console.log(`App.css: ${ruleCount} style rules (${mediaRuleCount} inside @media), leading-class prefixes: ${prefixCount.size}`)
console.log('\n=== rules grouped by guessed screen namespace (leading class of selector) ===')
for (const [ns, t] of Object.entries(nsTotals).sort((a, b) => b[1].rules - a[1].rules)) {
  const ownFile = screenFiles.find((f) => f.toLowerCase().includes(ns.replace(/-/g, '')))
  console.log(`  ${ns.padEnd(18)} ${String(t.rules).padStart(4)} rules  ${String(t.decls).padStart(4)} decls  -> ${ownFile || '(no per-screen file!)'}`)
}
console.log('\n=== top NON-namespaced leading classes (likely SHARED — do NOT move) ===')
for (const [lead, n] of generic.sort((a, b) => b[1] - a[1]).slice(0, 40)) {
  console.log(`  ${String(n).padStart(3)}  .${lead}`)
}
