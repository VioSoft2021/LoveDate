// Rasterize public/favicon.svg into the PWA PNG icons (192/512px) and
// also overwrite the legacy heart-icon files used by the app shell.
//
// Why this exists: SVG favicons cover modern browsers, but Android PWA
// installs + the home-screen launcher + the auto-generated splash
// screen all need PNG icons referenced in vite.config.ts's manifest
// (pwa-icon-192.png, pwa-icon-512.png). Master reported the old heart
// icon still showing as the installed app icon + splash on phone —
// this is the fix: regenerate those PNGs from the new Privé SVG mark.
//
// Run once after changes to public/favicon.svg:
//   node scripts/rasterize-favicon.mjs
//
// Output:
//   public/pwa-icon-192.png   (PWA manifest icon)
//   public/pwa-icon-512.png   (PWA manifest icon)
//   public/favicon.png        (legacy fallback)
//   src/assets/icon.png       (used by Logo's hero/login contexts —
//                              kept for backwards compat although the
//                              new Logo.tsx doesn't render it inline)

import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Privé brand colors — must match :root --prive-gold-grad in src/App.css.
const GOLD_STOPS = [
  { offset: 0, color: '#fceeb0' },
  { offset: 22, color: '#ead27a' },
  { offset: 48, color: '#d8b86d' },
  { offset: 72, color: '#b9974a' },
  { offset: 100, color: '#8b6b2c' },
]

// Compose a Privé icon SVG sized to fit a square canvas with the brand's
// navy background. The favicon.svg only paints the glyph; the PWA icons
// need a solid background so they read well on home screens.
const buildIconSvg = (size, options = {}) => {
  const { background = '#0a0e27', padding = 0.12 } = options
  const inner = Math.round(size * (1 - padding * 2))
  const offset = Math.round(size * padding)
  // The favicon's viewBox is 220x280 — letterbox the glyph inside the
  // square canvas, centered vertically.
  const aspect = 280 / 220
  const glyphHeight = Math.round(inner * (aspect / 1.1))
  const glyphWidth = Math.round(glyphHeight / aspect)
  const glyphX = Math.round((size - glyphWidth) / 2)
  const glyphY = Math.round((size - glyphHeight) / 2)
  const stops = GOLD_STOPS.map(
    (s) => `<stop offset="${s.offset}%" stop-color="${s.color}" />`,
  ).join('')
  // Scale stroke + font with icon size so the design holds at 192/512.
  const lineStroke = Math.max(4, Math.round(size * 0.018))
  const lineWidth = inner * 0.78
  const lineX1 = (size - lineWidth) / 2
  const lineX2 = (size + lineWidth) / 2
  const lineY = glyphY + glyphHeight * 0.14
  const textFontSize = Math.round(glyphHeight * 0.84)
  const textY = glyphY + glyphHeight * 0.84
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="priveGold" x1="0%" y1="0%" x2="0%" y2="100%">${stops}</linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" fill="${background}" />
  <line x1="${lineX1}" y1="${lineY}" x2="${lineX2}" y2="${lineY}" stroke="url(#priveGold)" stroke-width="${lineStroke}" stroke-linecap="round" />
  <text x="${size / 2}" y="${textY}" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${textFontSize}" fill="url(#priveGold)" text-anchor="middle">P</text>
</svg>`
}

const writePng = async (size, outRelativePath) => {
  const svg = buildIconSvg(size)
  const outPath = join(root, outRelativePath)
  await mkdir(dirname(outPath), { recursive: true })
  await sharp(Buffer.from(svg), { density: 384 }).png({ compressionLevel: 9 }).toFile(outPath)
  console.log(`wrote ${outRelativePath} (${size}x${size})`)
}

await writePng(192, 'public/pwa-icon-192.png')
await writePng(512, 'public/pwa-icon-512.png')
await writePng(180, 'public/apple-touch-icon.png')
await writePng(32, 'public/favicon.png')

// Also refresh src/assets/icon.png so any cached reference still points
// at the new brand mark instead of the legacy heart asset.
await writePng(512, 'src/assets/icon.png')

console.log('\n✓ Privé PWA icons regenerated. Rebuild and redeploy to ship them.')
