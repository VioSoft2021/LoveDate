import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerSW } from 'virtual:pwa-register'
import { showUpdateBanner } from './components/UpdateBanner'

// Safety net: when control transfers to a freshly-activated SW the open
// page is still running OLD JS in memory, so reload to pick up the new
// bundle. Guarded so a misbehaving browser firing controllerchange twice
// can't loop.
if ('serviceWorker' in navigator) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}

// Register the SW with aggressive update polling. Without polling, the
// browser only checks for a new sw.js on full page navigations — which
// rarely happens in an installed PWA. We force a check on every page
// load, every 60 seconds the page is open, and whenever the tab regains
// focus. When a new SW finishes installing, onNeedRefresh fires and we
// show a banner with an explicit Update button.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    setInterval(() => {
      reg.update().catch(() => {})
    }, 60_000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        reg.update().catch(() => {})
      }
    })
  },
  onNeedRefresh() {
    showUpdateBanner(() => {
      void updateSW(true)
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
