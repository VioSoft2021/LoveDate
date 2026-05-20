import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopBar, type TopBarNavItem } from './TopBar'

const baseNavItems: TopBarNavItem[] = [
  { key: 'discover', label: 'Discover' },
  { key: 'activity', label: 'Activity' },
  { key: 'chats', label: 'Chats', badge: 3 },
  { key: 'profile', label: 'Profile' },
]

describe('TopBar — nav rendering', () => {
  it('renders one button per nav item plus an Exit-to-Login button', () => {
    render(
      <TopBar
        navItems={baseNavItems}
        currentScreen="discover"
        onNavigate={vi.fn()}
        exitToLoginLabel="Exit"
        onSignOut={vi.fn()}
        showExitAppButton={false}
        onExitApp={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /^Discover/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Activity/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Profile/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exit' })).toBeInTheDocument()
  })

  it('marks the current screen button as active', () => {
    const { container } = render(
      <TopBar
        navItems={baseNavItems}
        currentScreen="activity"
        onNavigate={vi.fn()}
        exitToLoginLabel="Exit"
        onSignOut={vi.fn()}
        showExitAppButton={false}
        onExitApp={vi.fn()}
      />,
    )
    const actives = container.querySelectorAll('button.active')
    expect(actives).toHaveLength(1)
    expect(actives[0].textContent).toContain('Activity')
  })

  it('renders the badge count on items with badge > 0 only', () => {
    render(
      <TopBar
        navItems={[
          { key: 'discover', label: 'Discover' },
          { key: 'chats', label: 'Chats', badge: 3 },
          { key: 'activity', label: 'Activity', badge: 0 },
        ]}
        currentScreen="discover"
        onNavigate={vi.fn()}
        exitToLoginLabel="Exit"
        onSignOut={vi.fn()}
        showExitAppButton={false}
        onExitApp={vi.fn()}
      />,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    // Badge=0 should NOT render a count chip — the only "0" anywhere
    // in the doc would be a false positive, so we assert there is none.
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})

describe('TopBar — handlers', () => {
  it('clicking a nav button calls onNavigate with the key', () => {
    const onNavigate = vi.fn()
    render(
      <TopBar
        navItems={baseNavItems}
        currentScreen="discover"
        onNavigate={onNavigate}
        exitToLoginLabel="Exit"
        onSignOut={vi.fn()}
        showExitAppButton={false}
        onExitApp={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Activity/ }))
    expect(onNavigate).toHaveBeenCalledWith('activity')
  })

  it('clicking Exit-to-Login calls onSignOut', () => {
    const onSignOut = vi.fn()
    render(
      <TopBar
        navItems={baseNavItems}
        currentScreen="discover"
        onNavigate={vi.fn()}
        exitToLoginLabel="Exit"
        onSignOut={onSignOut}
        showExitAppButton={false}
        onExitApp={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    expect(onSignOut).toHaveBeenCalled()
  })
})

describe('TopBar — Exit App button (native/electron only)', () => {
  it('does NOT render the quit button when showExitAppButton is false', () => {
    render(
      <TopBar
        navItems={baseNavItems}
        currentScreen="discover"
        onNavigate={vi.fn()}
        exitToLoginLabel="Exit"
        onSignOut={vi.fn()}
        showExitAppButton={false}
        onExitApp={vi.fn()}
      />,
    )
    expect(screen.queryByLabelText('Exit App')).not.toBeInTheDocument()
  })

  it('renders the quit button when showExitAppButton is true and wires onExitApp', () => {
    const onExitApp = vi.fn()
    render(
      <TopBar
        navItems={baseNavItems}
        currentScreen="discover"
        onNavigate={vi.fn()}
        exitToLoginLabel="Exit"
        onSignOut={vi.fn()}
        showExitAppButton={true}
        onExitApp={onExitApp}
      />,
    )
    const quitBtn = screen.getByLabelText('Exit App')
    expect(quitBtn).toBeInTheDocument()
    fireEvent.click(quitBtn)
    expect(onExitApp).toHaveBeenCalled()
  })
})
