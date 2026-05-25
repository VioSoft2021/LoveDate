import React from 'react'
import { readAppLanguage } from '../persistence/language'
import { UI_TEXT } from '../constants'

type UpdateBannerHandle = {
  show: (onConfirm: () => void) => void
  hide: () => void
}

// Imperative singleton so main.tsx's registerSW callback can trigger the
// banner without prop drilling. The component registers itself on mount.
let handle: UpdateBannerHandle | null = null

// eslint-disable-next-line react-refresh/only-export-components -- imperative singleton co-located with its component; moving to a separate file would split coupled state
export const showUpdateBanner = (onConfirm: () => void) => {
  handle?.show(onConfirm)
}

export const UpdateBanner: React.FC = () => {
  const [visible, setVisible] = React.useState(false)
  const onConfirmRef = React.useRef<() => void>(() => {})

  React.useEffect(() => {
    handle = {
      show(onConfirm) {
        onConfirmRef.current = onConfirm
        setVisible(true)
      },
      hide() {
        setVisible(false)
      },
    }
    return () => {
      handle = null
    }
  }, [])

  if (!visible) return null

  // Banner is a global imperative component (no React context). Read
  // the user's saved language directly from localStorage so the banner
  // text matches the app shell. Falls back to 'en' for SSR / fresh installs.
  const lang = readAppLanguage()
  const t = UI_TEXT[lang].updateBanner

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 0.4rem)',
        left: '0.5rem',
        right: '0.5rem',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.7rem 0.85rem',
        borderRadius: '0.8rem',
        background:
          'linear-gradient(90deg, rgba(231, 178, 92, 0.95), rgba(247, 214, 139, 0.95))',
        color: '#1a1a2c',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}
    >
      <span style={{ flex: 1 }}>{t.message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false)
          onConfirmRef.current()
        }}
        style={{
          padding: '0.4rem 0.85rem',
          border: 'none',
          borderRadius: '0.55rem',
          background: '#1a1a2c',
          color: '#f7d68b',
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        {t.update}
      </button>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label={t.dismiss}
        style={{
          padding: '0.3rem 0.55rem',
          border: 'none',
          borderRadius: '0.55rem',
          background: 'rgba(26, 26, 44, 0.18)',
          color: '#1a1a2c',
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        {t.later}
      </button>
    </div>
  )
}
