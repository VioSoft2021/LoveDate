import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getLikeUsage,
  getSuperLikeUsage,
  canLikeNow,
  canSuperLikeNow,
  recordLikeEvent,
  rollbackLastLikeEvent,
  recordSuperLikeEvent,
  rollbackLastSuperLikeEvent,
  pruneOldLikeEvents,
  pruneOldSuperLikeEvents,
} from './engagementLimits'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('like events: record / rollback / prune', () => {
  it('starts empty for a fresh user', () => {
    const usage = getLikeUsage('free')
    expect(usage.used).toBe(0)
  })

  it('records and rolls back one like at a time', () => {
    recordLikeEvent()
    recordLikeEvent()
    expect(getLikeUsage('free').used).toBe(2)
    rollbackLastLikeEvent()
    expect(getLikeUsage('free').used).toBe(1)
  })

  it('survives a junk localStorage payload (returns [] not a crash)', () => {
    window.localStorage.setItem('lovedate:like-events', 'not-json')
    expect(pruneOldLikeEvents()).toEqual([])
  })

  it('prunes likes older than 24h', () => {
    const now = Date.now()
    // Plant two timestamps: one from yesterday, one from now.
    window.localStorage.setItem(
      'lovedate:like-events',
      JSON.stringify([now - 25 * 60 * 60 * 1000, now]),
    )
    const remaining = pruneOldLikeEvents(now)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toBe(now)
  })
})

describe('getLikeUsage', () => {
  it('reports limit/remaining for a finite plan', () => {
    recordLikeEvent()
    const usage = getLikeUsage('free')
    expect(usage.used).toBe(1)
    expect(usage.limit).toBeTypeOf('number')
    if (usage.limit !== null) {
      expect(usage.remaining).toBe(Math.max(0, usage.limit - 1))
    }
  })

  it('reports null/null for an unlimited plan (if such exists)', () => {
    const usage = getLikeUsage('platinum')
    // platinum should be unlimited per planGate convention.
    if (usage.limit === null) {
      expect(usage.remaining).toBeNull()
    }
  })

  it('remaining never goes below zero even if used exceeds the cap', () => {
    // Plant many events to exceed any reasonable plan cap
    window.localStorage.setItem(
      'lovedate:like-events',
      JSON.stringify(Array(9999).fill(Date.now())),
    )
    const usage = getLikeUsage('free')
    if (usage.remaining !== null) {
      expect(usage.remaining).toBe(0)
    }
  })
})

describe('canLikeNow', () => {
  it('returns true for unlimited plans regardless of usage', () => {
    window.localStorage.setItem(
      'lovedate:like-events',
      JSON.stringify(Array(99999).fill(Date.now())),
    )
    // If platinum is unlimited (null limit), canLikeNow should still be true.
    const platinumUsage = getLikeUsage('platinum')
    if (platinumUsage.limit === null) {
      expect(canLikeNow('platinum')).toBe(true)
    }
  })

  it('returns false when the finite limit is exhausted', () => {
    // Plant a lot of events for free tier so we're definitely over.
    window.localStorage.setItem(
      'lovedate:like-events',
      JSON.stringify(Array(9999).fill(Date.now())),
    )
    expect(canLikeNow('free')).toBe(false)
  })

  it('returns true with one event left', () => {
    const usage = getLikeUsage('free')
    if (usage.limit !== null && usage.limit > 1) {
      // Plant (limit - 1) events; one remaining
      window.localStorage.setItem(
        'lovedate:like-events',
        JSON.stringify(Array(usage.limit - 1).fill(Date.now())),
      )
      expect(canLikeNow('free')).toBe(true)
    }
  })
})

describe('super-like events', () => {
  it('records + rolls back super-likes independently of likes', () => {
    recordLikeEvent()
    recordSuperLikeEvent()
    expect(getLikeUsage('free').used).toBe(1)
    expect(getSuperLikeUsage('free').used).toBe(1)
    rollbackLastLikeEvent()
    expect(getLikeUsage('free').used).toBe(0)
    expect(getSuperLikeUsage('free').used).toBe(1)
  })

  it('prunes super-likes older than 7d', () => {
    const now = Date.now()
    window.localStorage.setItem(
      'lovedate:super-like-events',
      JSON.stringify([now - 8 * 24 * 60 * 60 * 1000, now]),
    )
    expect(pruneOldSuperLikeEvents(now)).toHaveLength(1)
  })

  it('canSuperLikeNow returns false when the weekly cap is hit', () => {
    const usage = getSuperLikeUsage('free')
    // Plant `usage.limit` super-like events; weekly cap exhausted.
    window.localStorage.setItem(
      'lovedate:super-like-events',
      JSON.stringify(Array(usage.limit).fill(Date.now())),
    )
    expect(canSuperLikeNow('free')).toBe(false)
  })

  it('rollbackLastSuperLikeEvent pops one event', () => {
    recordSuperLikeEvent()
    recordSuperLikeEvent()
    rollbackLastSuperLikeEvent()
    expect(getSuperLikeUsage('free').used).toBe(1)
  })
})
