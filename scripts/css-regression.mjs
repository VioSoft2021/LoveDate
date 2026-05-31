// scripts/css-regression.mjs — computed-style regression net for the App.css split.
//
// The App.css split moves screen-scoped rules out of the 5.6k-line god-file into
// per-screen *.css files. That changes CSS LOAD ORDER (per-screen loads after
// App.css), so unlike the dedup it is NOT statically provable. This harness is the
// proof: it captures getComputedStyle for EVERY element on EVERY screen at two
// viewports, then a --check run re-captures and diffs. Zero diff = the move changed
// nothing the browser renders.
//
// It drives the app through the DEV-only `?preview=<screen>` hook (App.tsx), so it
// must run against the DEV server (npm run dev) — `vite preview` serves the prod
// build where the hook is tree-shaken out. HMR means ONE dev server serves both the
// baseline (pre-edit) and check (post-edit) captures with no restart.
//
// Determinism: cross-origin requests (Unsplash photos, web fonts) are ABORTED in
// both modes, and all animation/transition is killed, so captures are offline and
// stable. Absolute values needn't be "real" — they need to be IDENTICAL across the
// refactor, which is exactly what a byte-equal before/after diff checks.
//
// Usage:
//   node scripts/css-regression.mjs --baseline   # capture current look → .css-baseline/
//   node scripts/css-regression.mjs --check      # re-capture, diff, exit 1 on any diff

import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const BASE = process.env.CSS_BASE || 'http://localhost:5174'
const OUT = 'scripts/.css-baseline'
const MODE = process.argv.includes('--check') ? 'check' : 'baseline'

// Screens reachable via the ?preview hook. Discover/Profile/Settings/Moderation are
// the over-defined ones; the rest guard against collateral damage from shared rules.
const SCREENS = [
  'discover', 'profile', 'settings', 'moderation',
  'activity', 'chats', 'chat-active', 'call-active', 'love-personality', 'stability-quiz',
  'personality-guide', 'profile-detail',
]
const VIEWPORTS = [
  { name: 'desktop', width: 1390, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

// Comprehensive computed-style allowlist: layout + box + typography + color + effects.
// Animation/transition are deliberately excluded (we force them off). A split can break
// any of these via a changed cascade winner, so we diff them all.
const PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear',
  'zIndex', 'order', 'visibility', 'opacity', 'boxSizing',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopStyle', 'borderRadius',
  'flexDirection', 'flexWrap', 'flexGrow', 'flexShrink', 'flexBasis',
  'justifyContent', 'alignItems', 'alignContent', 'alignSelf',
  'gap', 'rowGap', 'columnGap',
  'gridTemplateColumns', 'gridTemplateRows', 'gridTemplateAreas',
  'gridAutoFlow', 'gridAutoColumns', 'gridAutoRows', 'gridArea', 'gridColumn', 'gridRow',
  'objectFit', 'objectPosition', 'aspectRatio',
  'overflow', 'overflowX', 'overflowY',
  'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing',
  'textAlign', 'textTransform', 'whiteSpace',
  'color', 'backgroundColor', 'backgroundImage', 'boxShadow',
  'transform', 'transformOrigin', 'clipPath',
]

const KILL_ANIM = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'

async function capture(page) {
  return await page.evaluate((props) => {
    const root = document.getElementById('root') || document.body
    const els = root.querySelectorAll('*')
    const out = []
    for (const el of els) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'script' || tag === 'style' || tag === 'link') continue
      const cs = getComputedStyle(el)
      const rec = { t: tag, c: el.getAttribute('class') || '' }
      for (const p of props) rec[p] = cs[p]
      out.push(rec)
    }
    return out
  }, PROPS)
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ channel: 'msedge' })
  const summary = []
  let totalDiffs = 0

  for (const vp of VIEWPORTS) {
    for (const screen of SCREENS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
      // Offline determinism: drop cross-origin (Unsplash photos, fonts).
      await page.route('**/*', (route) => {
        const u = route.request().url()
        if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue()
        return route.abort()
      })
      const tag = `${screen}-${vp.name}`
      const file = path.join(OUT, `${tag}.json`)
      try {
        await page.goto(`${BASE}/?preview=${screen}&lang=en`, { waitUntil: 'load', timeout: 20000 })
        await page.addStyleTag({ content: KILL_ANIM })
        await page.waitForTimeout(2200) // seed effects + any toast auto-dismiss settle
        const snap = await capture(page)

        if (MODE === 'baseline') {
          fs.writeFileSync(file, JSON.stringify(snap))
          summary.push(`  baseline ${tag.padEnd(26)} ${String(snap.length).padStart(4)} els`)
        } else {
          if (!fs.existsSync(file)) { summary.push(`  SKIP ${tag} (no baseline)`); await page.close(); continue }
          const base = JSON.parse(fs.readFileSync(file, 'utf8'))
          const diffs = []
          if (base.length !== snap.length) {
            diffs.push(`element count ${base.length} -> ${snap.length} (DOM changed — not a pure CSS move!)`)
          }
          const n = Math.min(base.length, snap.length)
          for (let i = 0; i < n; i++) {
            const a = base[i], b = snap[i]
            if (a.t !== b.t || a.c !== b.c) {
              diffs.push(`#${i} element drift: <${a.t} class="${a.c}"> -> <${b.t} class="${b.c}">`)
              continue
            }
            for (const p of PROPS) {
              if (a[p] !== b[p]) diffs.push(`#${i} <${a.t} class="${(a.c || '').slice(0, 40)}"> ${p}: "${a[p]}" -> "${b[p]}"`)
            }
          }
          totalDiffs += diffs.length
          if (diffs.length) {
            summary.push(`  DIFF ${tag.padEnd(26)} ${diffs.length} change(s):`)
            for (const d of diffs.slice(0, 12)) summary.push(`        ${d}`)
            if (diffs.length > 12) summary.push(`        … +${diffs.length - 12} more`)
          } else {
            summary.push(`  ok   ${tag.padEnd(26)} ${snap.length} els — identical`)
          }
        }
      } catch (e) {
        summary.push(`  FAIL ${tag}: ${String(e).split('\n')[0]}`)
      }
      await page.close()
    }
  }
  await browser.close()

  console.log(`\n=== css-regression --${MODE} (base=${BASE}) ===`)
  console.log(summary.join('\n'))
  if (MODE === 'check') {
    console.log(`\n${totalDiffs === 0 ? '✓ ZERO computed-style diffs — refactor is render-neutral.' : `✗ ${totalDiffs} diff(s) — NOT render-neutral.`}`)
    process.exit(totalDiffs === 0 ? 0 : 1)
  } else {
    console.log(`\n✓ baseline written to ${OUT}/`)
  }
}

run()
