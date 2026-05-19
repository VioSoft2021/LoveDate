import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// When a new SW activates (after its install handler calls skipWaiting),
// the browser fires `controllerchange` on the page. The page is still
// running the OLD in-memory bundle at that point, so reload to pick up
// the new JS/CSS. Without this, users stay on the stale build until they
// manually refresh — and with the PWA cache that often means never.
if ('serviceWorker' in navigator) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
