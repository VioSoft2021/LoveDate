import React from 'react'
import { Logo } from './Logo'
import type { AppScreen } from '../domain'

export type TopBarNavItem = {
  key: AppScreen
  label: string
  badge?: number
}

export type TopBarProps = {
  navItems: TopBarNavItem[]
  currentScreen: AppScreen
  onNavigate: (key: AppScreen) => void
  exitToLoginLabel: string
  onSignOut: () => void
  showExitAppButton: boolean
  onExitApp: () => void
}

// LoveDate header: logo + nav tabs + exit-to-login + (native-only) quit
// button. Rendered above every screen in the app shell. Extracted from
// App.tsx to stop the god-file from owning chrome JSX. Pure presentation —
// the parent computes navItems and passes the handlers in.
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
        <button type="button" className="top-exit-btn" onClick={onSignOut}>
          {exitToLoginLabel}
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
