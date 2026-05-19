import React from 'react'

// Tiny version pill in the bottom-right so the user (and I) can verify
// which build is actually rendering in their browser AND what the browser
// thinks the CSS viewport width is. If width > 768px on a phone, the
// "Desktop site" toggle is on in Chrome and every mobile media query is
// being skipped — diagnostic that explains a lot of "fix didn't work".
export const BuildChip: React.FC = () => {
  const [copied, setCopied] = React.useState(false)
  const [viewport, setViewport] = React.useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 0,
    h: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  React.useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const time = React.useMemo(() => {
    try {
      const d = new Date(__BUILD_TIME__)
      return d.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return __BUILD_TIME__
    }
  }, [])

  const isPhoneWidth = viewport.w > 0 && viewport.w <= 768
  const handleClick = () => {
    const text = `${__BUILD_HASH__} · ${time} · ${viewport.w}×${viewport.h}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {})
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Build version + viewport (tap to copy)"
      title="Build version + viewport (tap to copy)"
      style={{
        position: 'fixed',
        right: '0.5rem',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.4rem)',
        zIndex: 9999,
        padding: '0.2rem 0.45rem',
        fontSize: '0.62rem',
        fontFamily:
          "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
        lineHeight: 1.2,
        color: 'rgba(255, 255, 255, 0.65)',
        background: 'rgba(0, 0, 0, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '0.4rem',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        cursor: 'pointer',
        pointerEvents: 'auto',
        opacity: copied ? 0.95 : 0.55,
        transition: 'opacity 180ms ease',
      }}
    >
      {copied ? (
        'copied'
      ) : (
        <>
          {__BUILD_HASH__} · {time}{' '}
          <span style={{ color: isPhoneWidth ? 'rgba(180, 230, 180, 0.85)' : 'rgba(255, 150, 150, 0.9)' }}>
            · {viewport.w}px
          </span>
        </>
      )}
    </button>
  )
}
