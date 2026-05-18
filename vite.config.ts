import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icon-192.png', 'pwa-icon-512.png'],
      manifest: {
        name: 'LoveDate',
        short_name: 'LoveDate',
        description: 'Find your perfect match — AI-powered chat coach, real conversations, real dates.',
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
      workbox: {
        // Don't pre-cache images / fonts — keeps install fast on first run.
        // Network-first for HTML so the app can update; cache-first for JS/CSS.
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 80 } },
          },
        ],
        navigateFallback: 'index.html',
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
