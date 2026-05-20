import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileTabBar, type MobileTabBarItem } from './MobileTabBar'

const baseItems: MobileTabBarItem[] = [
  { key: 'discover', label: 'Discover' },
  { key: 'activity', label: 'Activity', badge: 4 },
  { key: 'chats', label: 'Chats', badge: 0 },
  { key: 'profile', label: 'Profile' },
]

describe('MobileTabBar — rendering', () => {
  it('renders one button per item', () => {
    render(
      <MobileTabBar
        items={baseItems}
        currentScreen="discover"
        onNavigate={vi.fn()}
      />,
    )
    // Each item label appears as a visually-hidden span; the buttons
    // themselves are queryable by accessible name.
    expect(screen.getByRole('button', { name: /Discover/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Activity/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chats/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Profile/ })).toBeInTheDocument()
  })

  it('marks only the current screen button as active', () => {
    const { container } = render(
      <MobileTabBar
        items={baseItems}
        currentScreen="activity"
        onNavigate={vi.fn()}
      />,
    )
    const actives = container.querySelectorAll('button.active')
    expect(actives).toHaveLength(1)
    expect(actives[0].textContent).toContain('Activity')
  })

  it('renders the badge for items with badge > 0 only', () => {
    render(
      <MobileTabBar
        items={baseItems}
        currentScreen="discover"
        onNavigate={vi.fn()}
      />,
    )
    // Activity has badge: 4 — visible
    expect(screen.getByText('4')).toBeInTheDocument()
    // Chats has badge: 0 — must NOT render a chip
    const allText = screen.queryByText('0')
    expect(allText).not.toBeInTheDocument()
  })
})

describe('MobileTabBar — handlers', () => {
  it('calls onNavigate with the tapped key', () => {
    const onNavigate = vi.fn()
    render(
      <MobileTabBar
        items={baseItems}
        currentScreen="discover"
        onNavigate={onNavigate}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Profile/ }))
    expect(onNavigate).toHaveBeenCalledWith('profile')
  })
})

describe('MobileTabBar — icon registry', () => {
  it('renders an SVG inside each known-key button', () => {
    const { container } = render(
      <MobileTabBar
        items={baseItems}
        currentScreen="discover"
        onNavigate={vi.fn()}
      />,
    )
    const svgs = container.querySelectorAll('button > svg')
    // 4 items → 4 known icons. If a key were unknown, ICON_BY_KEY
    // would return undefined and the SVG count would drop.
    expect(svgs.length).toBe(4)
  })
})
