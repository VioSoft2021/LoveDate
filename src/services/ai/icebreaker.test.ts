import { describe, it, expect, beforeEach, vi } from 'vitest'
import { backendInvokeIcebreaker } from './icebreaker'

// Mock the Supabase client. The wrapper calls createSupabaseClient() and
// uses supabase.functions.invoke. We control both: vi.mock returns a
// factory whose return value we manipulate per-test.
vi.mock('../supabaseClient', () => {
  return {
    createSupabaseClient: () => mockSupabase,
  }
})

let mockInvoke: ReturnType<typeof vi.fn>
let mockSupabase: { functions: { invoke: typeof mockInvoke } } | null

beforeEach(() => {
  window.localStorage.clear()
  mockInvoke = vi.fn()
  mockSupabase = { functions: { invoke: mockInvoke } }
})

const sampleInput = {
  selfProfile: { name: 'Alex' },
  otherProfile: { id: 42, name: 'Riley' },
  chatExcerpt: [],
}

describe('backendInvokeIcebreaker', () => {
  it('returns null when supabase is not configured', async () => {
    mockSupabase = null
    const result = await backendInvokeIcebreaker(sampleInput)
    expect(result).toBeNull()
  })

  it('returns the openers from a successful call', async () => {
    mockInvoke.mockResolvedValue({
      data: { openers: ['Hi!', 'Hey there', 'What is up?'] },
      error: null,
    })
    const result = await backendInvokeIcebreaker(sampleInput)
    expect(result).toEqual(['Hi!', 'Hey there', 'What is up?'])
    expect(mockInvoke).toHaveBeenCalledOnce()
  })

  it('returns null when the function returns an error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'rate limited' },
    })
    const result = await backendInvokeIcebreaker(sampleInput)
    expect(result).toBeNull()
  })

  it('returns null on no openers', async () => {
    mockInvoke.mockResolvedValue({ data: { openers: [] }, error: null })
    const result = await backendInvokeIcebreaker(sampleInput)
    expect(result).toBeNull()
  })

  it('returns null when invoke throws', async () => {
    mockInvoke.mockRejectedValue(new Error('network down'))
    const result = await backendInvokeIcebreaker(sampleInput)
    expect(result).toBeNull()
  })

  it('hits cache on second call with same args + language', async () => {
    mockInvoke.mockResolvedValue({
      data: { openers: ['cached opener'] },
      error: null,
    })
    const first = await backendInvokeIcebreaker({ ...sampleInput, language: 'en' })
    const second = await backendInvokeIcebreaker({ ...sampleInput, language: 'en' })
    expect(first).toEqual(['cached opener'])
    expect(second).toEqual(['cached opener'])
    // Only one network call — second came from localStorage.
    expect(mockInvoke).toHaveBeenCalledOnce()
  })

  it('busts cache when language switches en -> ro', async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { openers: ['hello'] }, error: null })
      .mockResolvedValueOnce({ data: { openers: ['salut'] }, error: null })
    const en = await backendInvokeIcebreaker({ ...sampleInput, language: 'en' })
    const ro = await backendInvokeIcebreaker({ ...sampleInput, language: 'ro' })
    expect(en).toEqual(['hello'])
    expect(ro).toEqual(['salut'])
    expect(mockInvoke).toHaveBeenCalledTimes(2)
  })

  it('uses different cache slots for opener vs coach mode (history present)', async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { openers: ['first opener'] }, error: null })
      .mockResolvedValueOnce({ data: { openers: ['coach reply'] }, error: null })

    // No history -> opener mode
    await backendInvokeIcebreaker({ ...sampleInput, chatExcerpt: [] })
    // With history -> coach mode
    await backendInvokeIcebreaker({
      ...sampleInput,
      chatExcerpt: [{ sender: 'them', text: 'how are you' }],
    })
    expect(mockInvoke).toHaveBeenCalledTimes(2)
  })

  it('rejects v1 cache entries (forward-compat with CACHE_VERSION bump)', async () => {
    // Manually plant a v1-style entry (no `v` field), simulating a pre-
    // language-aware cache from an old release.
    const key = 'lovedate:ai-icebreaker:en:Alex:42:opener'
    window.localStorage.setItem(
      key,
      JSON.stringify({ openers: ['stale'], storedAt: Date.now() }),
    )
    mockInvoke.mockResolvedValue({
      data: { openers: ['fresh'] },
      error: null,
    })
    const result = await backendInvokeIcebreaker({ ...sampleInput, language: 'en' })
    expect(result).toEqual(['fresh'])
    expect(mockInvoke).toHaveBeenCalledOnce()
  })

  it('rejects expired cache entries (> 24h)', async () => {
    const key = 'lovedate:ai-icebreaker:en:Alex:42:opener'
    const longAgo = Date.now() - 1000 * 60 * 60 * 25 // 25h ago
    window.localStorage.setItem(
      key,
      JSON.stringify({ openers: ['stale'], storedAt: longAgo, v: 2 }),
    )
    mockInvoke.mockResolvedValue({
      data: { openers: ['fresh'] },
      error: null,
    })
    const result = await backendInvokeIcebreaker({ ...sampleInput, language: 'en' })
    expect(result).toEqual(['fresh'])
  })
})
