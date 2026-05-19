/// <reference lib="webworker" />
// LoveDate service worker (injectManifest mode).
//
// Responsibilities:
//   1. App-shell caching via Workbox precaching (manifest injected at build).
//   2. Network-first navigation with index.html fallback so deep links work
//      and updates land fast.
//   3. Push event handling — shows a notification when send-push fires.
//   4. Notification click — focuses an existing tab or opens a new one.
//   5. Background sync — queues failed POSTs from the chat/swipe paths and
//      retries when the browser comes back online.

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { BackgroundSyncPlugin } from 'workbox-background-sync'

declare const self: ServiceWorkerGlobalScope

// Injected at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST)

// Navigation requests fall through to index.html (SPA routing).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Image runtime cache — same as the generateSW config we had before.
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)

// Network-first for any same-origin GET (so the app gets fresh data when
// online but still works offline).
registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin && request.method === 'GET',
  new NetworkFirst({ cacheName: 'pages' }),
)

// Background sync queue for mutating Supabase calls — used by the client
// via the X-Use-Bg-Sync request header. workbox-background-sync stores
// failed requests in IndexedDB and retries when the network returns.
const bgSyncPlugin = new BackgroundSyncPlugin('lovedate-mutations', {
  maxRetentionTime: 24 * 60, // 24h in minutes
})

registerRoute(
  ({ request }) =>
    request.method === 'POST' && request.headers.get('X-Use-Bg-Sync') === 'true',
  new NetworkFirst({ cacheName: 'mutations', plugins: [bgSyncPlugin] }),
  'POST',
)

// --- Push handling ---

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; senderId?: string; messageId?: string } = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { title: 'LoveDate', body: event.data.text() }
    }
  }

  const title = data.title ?? 'LoveDate'
  const options: NotificationOptions = {
    body: data.body ?? 'You have a new message',
    icon: 'pwa-icon-192.png',
    badge: 'pwa-icon-192.png',
    tag: data.senderId ?? 'lovedate-message',
    data: { senderId: data.senderId, messageId: data.messageId },
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = self.registration.scope + '#/chats'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus an existing tab if there is one.
      for (const client of clients) {
        if ('focus' in client && client.url.startsWith(self.registration.scope)) {
          ;(client as WindowClient).navigate(url).catch(() => {})
          return (client as WindowClient).focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})

// Jump the "waiting" queue the instant we install. Without this, the new SW
// sits idle until every open tab/PWA window of the site closes — a stuck
// PWA never picks up new deploys. With injectManifest we own the lifecycle,
// so we have to call skipWaiting ourselves (registerType: 'autoUpdate' in
// vite.config only handles registration, not SW lifecycle).
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Take control of open pages as soon as we activate. Pairs with the
// controllerchange listener in main.tsx, which reloads the page so the
// fresh JS/CSS actually renders instead of the in-memory old bundle.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
