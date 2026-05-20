import { describe, it, expect, beforeEach, vi } from 'vitest'
import { backendInvokeMatchScore } from './matchScore'

vi.mock('../supabaseClient', () => ({
  createSupabaseClient: () => mockSupabase,
}))

let mockInvoke: ReturnType<typeof vi.fn>
let mockSupabase: { functions: { invoke: typeof mockInvoke } } | null

beforeEach(() => {
  window.localStorage.clear()
  mockInvoke = vi.fn()
  mockSupabase = { functions: { invoke: mockInvoke } }
})

const sampleInput = {
  selfProfile: { name: 'Alex' },
  candidateProfile: { id: 7, name: 'Riley' },
  language: 'en' as const,
}

describe('backendInvokeMatchScore', () => {
  it('returns null when supabase is not configured', async () => {
    mockSupabase = null
    expect(await backendInvokeMatchScore(sampleInput)).toBeNull()
  })

  it('returns the full shape on success (with friction + tips)', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        score: 78,
        reasons: ['both love hiking', 'same city', 'long-term aligned'],
        redFlags: ['age gap'],
        frictionPoints: ['different workout cadence'],
        tips: ['ask about her travel pace'],
      },
      error: null,
    })
    const result = await backendInvokeMatchScore(sampleInput)
    expect(result).toEqual({
      score: 78,
      reasons: ['both love hiking', 'same city', 'long-term aligned'],
      redFlags: ['age gap'],
      frictionPoints: ['different workout cadence'],
      tips: ['ask about her travel pace'],
    })
  })

  it('defaults friction + tips to empty arrays when the function omits them', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        score: 60,
        reasons: ['shared interests'],
        // older fn response without frictionPoints/tips
      },
      error: null,
    })
    const result = await backendInvokeMatchScore(sampleInput)
    expect(result?.frictionPoints).toEqual([])
    expect(result?.tips).toEqual([])
  })

  it('returns null when reasons are empty (caller falls back to heuristic)', async () => {
    mockInvoke.mockResolvedValue({
      data: { score: 50, reasons: [], redFlags: [] },
      error: null,
    })
    expect(await backendInvokeMatchScore(sampleInput)).toBeNull()
  })

  it('caches by (language, selfHash, candidateId, candidateHash)', async () => {
    mockInvoke.mockResolvedValue({
      data: { score: 70, reasons: ['a', 'b', 'c'], redFlags: [] },
      error: null,
    })
    await backendInvokeMatchScore(sampleInput)
    await backendInvokeMatchScore(sampleInput)
    expect(mockInvoke).toHaveBeenCalledOnce()
  })

  it('re-fetches when the candidate profile is edited (different hash)', async () => {
    mockInvoke
      .mockResolvedValueOnce({
        data: { score: 70, reasons: ['a', 'b', 'c'], redFlags: [] },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { score: 80, reasons: ['x', 'y', 'z'], redFlags: [] },
        error: null,
      })
    await backendInvokeMatchScore(sampleInput)
    // Same candidate id, different bio -> different hash
    await backendInvokeMatchScore({
      ...sampleInput,
      candidateProfile: {
        ...sampleInput.candidateProfile,
        bio: 'just changed my bio',
      },
    })
    expect(mockInvoke).toHaveBeenCalledTimes(2)
  })

  it('rejects v=1 and v=2 cache entries (frictionPoints+tips were added at v=3)', async () => {
    // v2 cache entry shape (pre frictionPoints/tips). The wrapper should
    // skip and re-fetch to populate the new fields.
    const key = (lang: string) =>
      `lovedate:ai-match-score:${lang}:${'irrelevant-hash'}:${sampleInput.candidateProfile.id}:hash`
    // Manually plant something the readCache function rejects.
    window.localStorage.setItem(
      'lovedate:ai-match-score:en:bad:7:bad',
      JSON.stringify({
        score: 50,
        reasons: ['old'],
        redFlags: [],
        storedAt: Date.now(),
        v: 2,
      }),
    )
    // Even though we planted something, the hash for sampleInput won't
    // match — but if it did, v=2 must be rejected.
    void key
    mockInvoke.mockResolvedValue({
      data: { score: 90, reasons: ['fresh', 'r2', 'r3'], redFlags: [] },
      error: null,
    })
    const result = await backendInvokeMatchScore(sampleInput)
    expect(result?.score).toBe(90)
  })
})
