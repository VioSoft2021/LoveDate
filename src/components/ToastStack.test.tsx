import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastStack } from './ToastStack'
import type { Toast } from '../domain'

describe('ToastStack', () => {
  it('renders nothing when toasts is empty', () => {
    const { container } = render(<ToastStack toasts={[]} />)
    // Empty render: no .toast-stack element at all (returns null).
    expect(container.querySelector('.toast-stack')).toBeNull()
  })

  it('renders one <p> per toast with the message text', () => {
    const toasts: Toast[] = [
      { id: 1, message: 'First', tone: 'info' },
      { id: 2, message: 'Second', tone: 'error' },
    ]
    render(<ToastStack toasts={toasts} />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('applies the tone as a CSS class', () => {
    const toasts: Toast[] = [
      { id: 1, message: 'OK', tone: 'success' },
      { id: 2, message: 'Bad', tone: 'error' },
      { id: 3, message: 'FYI', tone: 'info' },
    ]
    const { container } = render(<ToastStack toasts={toasts} />)
    expect(container.querySelector('.toast.success')).not.toBeNull()
    expect(container.querySelector('.toast.error')).not.toBeNull()
    expect(container.querySelector('.toast.info')).not.toBeNull()
  })

  it('marks the stack as aria-live="polite" for accessibility', () => {
    const toasts: Toast[] = [{ id: 1, message: 'hello', tone: 'info' }]
    const { container } = render(<ToastStack toasts={toasts} />)
    const stack = container.querySelector('.toast-stack')
    expect(stack?.getAttribute('aria-live')).toBe('polite')
  })

  it('renders an action button that fires its onClick', () => {
    const onClick = vi.fn()
    const toasts: Toast[] = [
      { id: 1, message: 'Mic off', tone: 'error', action: { label: 'Open Settings', onClick } },
    ]
    render(<ToastStack toasts={toasts} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
