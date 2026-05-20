import React from 'react'
import { Logo } from './Logo'
import type { AppScreen } from '../domain'
import './TopBar.css'

export type TopBarNavItem = {
  key: AppScreen
  label: string
  badge?: number
}

export type TopBarProps = {
  navItems: TopBarNavItem[]
  currentScreen: AppScreen
  onNavigate: (key: AppScreen) => void
  /**
   * Accessible label for the sign-out button (aria-label + title).
   * The button is now icon-only; the label is no longer visible text.
   */
  exitToLoginLabel: string
  onSignOut: () => void
  showExitAppButton: boolean
  onExitApp: () => void
}

// Sign-out glyph: door with an arrow pointing right. Pure SVG so the
// CSS can recolor it via currentColor on hover / focus.
const SignOutIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
  </svg>
)

// LoveDate header: logo + nav tabs + icon-only sign-out + (native-only)
// quit button. Rendered above every screen in the app shell. Extracted
// from App.tsx; pure presentation — the parent computes navItems and
// passes the handlers in. Visual styling lives in TopBar.css.
export const TopBar: React.FC<TopBarProps> = ({
  navItems,
  currentScreen,
  onNavigate,
  exitToLoginLabel,
  onSignOut,
  showExitAppButton,
  onExitApp,
}) => {
  return (
    <header className="top-bar">
      <div>
        <Logo variant="compact" size="md" />
      </div>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={currentScreen === item.key ? 'active' : ''}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
            {item.badge && item.badge > 0 ? (
              <span className="badge-count">{item.badge}</span>
            ) : null}
          </button>
        ))}
      </nav>
      <div className="top-exit-group">
        <button
          type="button"
          className="top-exit-btn"
          onClick={onSignOut}
          aria-label={exitToLoginLabel}
          title={exitToLoginLabel}
        >
          <SignOutIcon />
        </button>
        {showExitAppButton ? (
          <button
            type="button"
            className="top-exit-btn top-exit-btn--quit"
            onClick={onExitApp}
            aria-label="Exit App"
            title="Exit App"
          >
            ⏻
          </button>
        ) : null}
      </div>
    </header>
  )
}
