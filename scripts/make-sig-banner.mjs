// scripts/make-sig-banner.mjs — render the Privé email-signature banner crisply.
//
// Builds the horizontal brand lockup (crest + PRIVÉ wordmark + slogan) from the
// real logo CSS in scripts/sig-banner.html, rendered through system Edge at 2x
// for retina sharpness, and screenshots just the #banner element. Output PNG is
// then optimized to JPEG separately. Fonts (Bodoni Moda, Cormorant Garamond) and
// the crest are pulled live from Google Fonts + prive-app.club.
//
// Usage: node scripts/make-sig-banner.mjs

import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const htmlPath = path.resolve('scripts/sig-banner.html')
const out = path.resolve('scripts/.sig-banner.png')

const browser = await chromium.launch({ channel: 'msedge' })
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 })
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' })
  // Brand fonts must be loaded before the gold-clipped text renders correctly.
  await page.evaluate(async () => { await document.fonts.ready })
  // And the crest image must be fully decoded.
  await page.waitForFunction(() => {
    const img = document.querySelector('img.crest')
    return Boolean(img && img.complete && img.naturalWidth > 0)
  }, { timeout: 20000 })
  await page.waitForTimeout(400)
  const el = await page.$('#banner')
  const box = await el.boundingBox()
  await el.screenshot({ path: out })
  console.log(`Saved ${out}  (element ${Math.round(box.width)}x${Math.round(box.height)} @2x)`)
} finally {
  await browser.close()
}
