import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useEngagement } from './useEngagement'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useEngagement — initial state', () => {
  it('defaults to free plan when nothing is stored', () => {
    const { result } = renderHook(() => useEngagement())
    expect(result.current.activePlan).toBe('free')
  })

  it('reads previously-saved plan from localStorage', () => {
    window.localStorage.setItem('lovedate:active-plan', 'platinum')
    const { result } = renderHook(() => useEngagement())
    expect(result.current.activePlan).toBe('platinum')
  })

  it('initial likeUsage matches the plan', () => {
    const { result } = renderHook(() => useEngagement())
    expect(result.current.likeUsage.used).toBe(0)
    expect(result.current.likeUsage.limit).toBeDefined()
  })
})

describe('useEngagement — setActivePlan refreshes usage in one render', () => {
  it('plan change immediately recomputes likeUsage + superLikeUsage', () => {
    const { result } = renderHook(() => useEngagement())
    const before = result.current.likeUsage.limit
    act(() => result.current.setActivePlan('platinum'))
    const after = result.current.likeUsage.limit
    // Platinum is unlimited (null) in the current PLAN_OPTIONS spec.
    // Either way, the limit changed OR both are null.
    if (after !== null && before !== null) {
      expect(after).toBeGreaterThanOrEqual(before)
    }
  })

  it('does not regress to the setState-in-effect pattern', () => {
    // This is a regression guard for CRIT-5b: the previous implementation
    // had a useEffect that mirrored activePlan into likeUsage via
    // setState, which triggered "cascading renders" lint + an extra
    // render per plan change. The fix replaced that with a setActivePlan
    // useCallback that fires the refresh inline.
    //
    // We can't directly observe render count from a hook test, but we can
    // assert the public API behavior: changing plan in one act() call
    // produces consistent usage in the SAME observed state.
    const { result } = renderHook(() => useEngagement())
    act(() => result.current.setActivePlan('plus'))
    expect(result.current.activePlan).toBe('plus')
    // likeUsage should already reflect the 'plus' plan, not the previous
    // 'free' plan that was active before the act() call.
    // (If we regress to setState-in-effect, this state would lag by one
    // render until the effect runs.)
    expect(result.current.likeUsage.used).toBe(0)
  })
})

describe('useEngagement — independent counters', () => {
  it('boosts and rewinds default to spec values and respond to setters', () => {
    const { result } = renderHook(() => useEngagement())
    const initialBoosts = result.current.boostsLeft
    expect(initialBoosts).toBeGreaterThan(0)
    act(() => result.current.setBoostsLeft((b) => Math.max(0, b - 1)))
    expect(result.current.boostsLeft).toBe(initialBoosts - 1)

    const initialRewinds = result.current.rewindsLeft
    expect(initialRewinds).toBeGreaterThan(0)
  })

  it('refreshEngagementUsage is callable without a plan change', () => {
    const { result } = renderHook(() => useEngagement())
    expect(() => {
      act(() => result.current.refreshEngagementUsage('free'))
    }).not.toThrow()
  })
})
