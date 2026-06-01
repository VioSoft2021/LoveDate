// IMPORTANT: this MUST be the first import. It snapshots
// window.location.hash before any other module gets a chance to run
// — specifically before services/backendApi.ts creates a Supabase
// client (a module-level side effect that consumes the URL fragment
// and clears `#access_token=...&type=recovery&...` via
// history.replaceState). The snapshot is read in useAuth to decide
// whether to surface the password-recovery card. See the file's
// own comment for the full diagnosis trail (2026-05-26).
import './services/initialHash'

import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
// Layout tokens MUST come first — every other stylesheet references them.
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'
// Mobile rules come LAST so they win the cascade for phone viewports.
// (App.tsx's import of App.css resolves before this side-effect import,
// so mobile.css cleanly overrides App.css's older @media (max-width: 768px)
// block during this transition phase.)
import './styles/mobile.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerSW } from 'virtual:pwa-register'
import { showUpdateBanner } from './components/UpdateBanner'
import { backendLogClientError } from './services/backendApi'

// MED-15 — global crash reporting. React render errors are caught by
// ErrorBoundary; this catches the two channels React can't:
//   1. window.onerror — synchronous errors outside the React tree
//      (async setTimeout callbacks, third-party scripts, event handlers
//      that throw without bubbling).
//   2. window.onunhandledrejection — promise rejections that nobody
//      .catch()'d. The most common silent failure source in a React app.
// Both are fire-and-forget. backendLogClientError swallows any throw.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const err = event.error as Error | undefined
    backendLogClientError({
      severity: 'window-error',
      message: err?.message ?? event.message ?? '(no message)',
      stack: err?.stack ?? null,
    })
  })
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as unknown
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : (() => {
              try {
                return JSON.stringify(reason)
              } catch {
                return String(reason)
              }
            })()
    const stack = reason instanceof Error ? (reason.stack ?? null) : null
    backendLogClientError({
      severity: 'unhandled-rejection',
      message,
      stack,
    })
  })
}

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

// DEV-only P2P-call test harness (?harness=webrtc). Tree-shaken out of prod:
// import.meta.env.DEV is statically false there, so the lazy import is dead.
// Rendered OUTSIDE StrictMode so the call lifecycle isn't double-mounted.
const DevWebRtcHarness = import.meta.env.DEV
  ? lazy(() => import('./components/dev/WebRtcTestHarness'))
  : null
const DevWebRtcCallHarness = import.meta.env.DEV
  ? lazy(() => import('./components/dev/WebRtcCallHarness'))
  : null
const harnessParam =
  import.meta.env.DEV && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('harness')
    : null

const harnessNode =
  harnessParam === 'webrtc' && DevWebRtcHarness ? (
    <Suspense fallback={null}>
      <DevWebRtcHarness />
    </Suspense>
  ) : harnessParam === 'webrtc-call' && DevWebRtcCallHarness ? (
    <Suspense fallback={null}>
      <DevWebRtcCallHarness />
    </Suspense>
  ) : null

createRoot(document.getElementById('root')!).render(
  harnessNode ?? (
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  ),
)
