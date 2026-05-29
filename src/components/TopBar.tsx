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
  exitAppLabel: string
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

// Quit-app glyph: the universal power symbol (open ring + top stroke). Pure
// SVG (not the ⏻ character) so it renders on every device/font instead of a
// "missing glyph" box. Inherits stroke + the danger tint from TopBar.css.
const PowerIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <path d="M12 2v10" />
  </svg>
)

// Privé header: logo + nav tabs + icon-only sign-out + (native-only)
// quit button. Rendered above every screen in the app shell. Extracted
// from App.tsx; pure presentation — the parent computes navItems and
// passes the handlers in. Visual styling lives in TopBar.css.
export const TopBar: React.FC<TopBarProps> = ({
  navItems,
  currentScreen,
  onNavigate,
  exitToLoginLabel,
  exitAppLabel,
  onSignOut,
  showExitAppButton,
  onExitApp,
}) => {
  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        {/* House seal — appears in the header of every authenticated
            screen so the crest reads as the persistent brand mark, not
            something only the landing page sees. */}
        <img
          className="top-bar-crest"
          src="./crests/crest-3.png?v=2"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
        />
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
            aria-label={exitAppLabel}
            title={exitAppLabel}
          >
            <PowerIcon />
          </button>
        ) : null}
      </div>
    </header>
  )
}
