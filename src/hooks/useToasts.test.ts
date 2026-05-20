import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useToasts } from './useToasts'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useToasts — toasts auto-dismiss after 2.6s', () => {
  it('pushToast appends to the toasts array immediately', () => {
    const { result } = renderHook(() => useToasts())
    expect(result.current.toasts).toEqual([])
    act(() => result.current.pushToast('Hello'))
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Hello')
    expect(result.current.toasts[0].tone).toBe('info') // default
  })

  it('respects an explicit tone', () => {
    const { result } = renderHook(() => useToasts())
    act(() => result.current.pushToast('Boom', 'error'))
    expect(result.current.toasts[0].tone).toBe('error')
  })

  it('drops the toast 2.6s later', () => {
    const { result } = renderHook(() => useToasts())
    act(() => result.current.pushToast('Hello'))
    expect(result.current.toasts).toHaveLength(1)
    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('multiple toasts each dismiss on their own timer', () => {
    const { result } = renderHook(() => useToasts())
    act(() => result.current.pushToast('First'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    act(() => result.current.pushToast('Second'))
    expect(result.current.toasts).toHaveLength(2)
    // First clears at t=2600 from its own push (i.e. 1600ms from now)
    act(() => {
      vi.advanceTimersByTime(1600)
    })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Second')
    // Second clears at its t=2600 (1000ms more)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.toasts).toHaveLength(0)
  })
})

describe('useToasts — notifications (persistent)', () => {
  it('pushNotification appends to the notifications feed', () => {
    const { result } = renderHook(() => useToasts())
    act(() => result.current.pushNotification({
      title: 'New match',
      body: 'with Riley',
      category: 'match',
    }))
    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0].title).toBe('New match')
    expect(result.current.notifications[0].read).toBe(false)
  })

  it('caps the feed at 30 entries (newest first)', () => {
    const { result } = renderHook(() => useToasts())
    // Push 35 notifications
    for (let i = 0; i < 35; i++) {
      act(() => result.current.pushNotification({
        title: `n${i}`,
        body: '',
        category: 'system',
      }))
    }
    expect(result.current.notifications).toHaveLength(30)
    // Newest first: n34 is at index 0, n5 is at index 29
    expect(result.current.notifications[0].title).toBe('n34')
    expect(result.current.notifications[29].title).toBe('n5')
  })

  it('markAllNotificationsRead flips every entry to read=true', () => {
    const { result } = renderHook(() => useToasts())
    act(() => result.current.pushNotification({
      title: 'one',
      body: '',
      category: 'system',
    }))
    act(() => result.current.pushNotification({
      title: 'two',
      body: '',
      category: 'system',
    }))
    expect(result.current.notifications.every((n) => !n.read)).toBe(true)
    act(() => result.current.markAllNotificationsRead())
    expect(result.current.notifications.every((n) => n.read)).toBe(true)
  })
})
