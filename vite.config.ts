import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Build identity: short git hash + ISO timestamp. Exposed to the app via
// the BuildChip in the corner so the user can verify which version they're
// seeing in their browser — no more "did my deploy actually land?" guesswork.
let buildHash = 'dev'
try {
  buildHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
} catch {
  // No git available (CI without history, etc.) — leave as 'dev'.
}
const buildTime = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.png',
        'apple-touch-icon.png',
        'pwa-icon-192.png',
        'pwa-icon-512.png',
      ],
      manifest: {
        name: 'Privé',
        short_name: 'Privé',
        description: 'Exclusive, AI-driven dating. Curated matches, real intent, intentional connection.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#141937',
        theme_color: '#141937',
        icons: [
          { src: 'pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
  server: {
    // Allow cloudflared quick tunnels (random *.trycloudflare.com hostnames)
    // so friends can hit the dev server through a public URL during testing.
    allowedHosts: ['.trycloudflare.com', '.vercel.app', '.netlify.app'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor'
          }
          if (id.includes('node_modules')) {
            return 'vendor'
          }
          return undefined
        },
      },
    },
  },
})
