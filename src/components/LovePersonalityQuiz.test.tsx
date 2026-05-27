import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LovePersonalityQuiz } from './LovePersonalityQuiz'
import type { LikertAnswer } from '../services/compatibility'

// Smoke tests for the cinematic 17-step Love Personality quiz.
// Coverage is intentionally minimal — the deep psychometric logic
// lives in services/compatibility (already tested separately). What
// matters here is that the React carousel mounts, advances on intro
// tap, and forwards answers to the onChange callback.

// Mock the Claude reveal call so completing answers doesn't try to
// hit a real Edge Function during tests. Even though the smoke tests
// below don't reach the result step, the effect would fire on any
// completed-answer state we seed.
vi.mock('../services/ai/lovePersonalityReveal', () => ({
  backendInvokeLovePersonalityReveal: vi.fn(async () => null),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('<LovePersonalityQuiz />', () => {
  it('renders the intro card on mount', () => {
    render(<LovePersonalityQuiz appLanguage="en" />)
    // The intro has a Begin button (EN); pressing it advances to Q1.
    expect(screen.getByRole('button', { name: /begin/i })).toBeTruthy()
  })

  it('fires onChange with an intro-position snapshot at mount', () => {
    const onChange = vi.fn()
    render(<LovePersonalityQuiz appLanguage="en" onChange={onChange} />)
    expect(onChange).toHaveBeenCalled()
    const snapshot = onChange.mock.calls[0][0]
    expect(snapshot.position).toBe('intro')
    expect(snapshot.completed).toBe(false)
    expect(snapshot.answers).toHaveLength(14)
  })

  it('advances past the intro when Begin is tapped', () => {
    const onChange = vi.fn()
    render(<LovePersonalityQuiz appLanguage="en" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /begin/i }))
    // After Begin, the first question card shows a radiogroup with
    // five Likert pills. We don't depend on the exact prompt copy.
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBe(5)
    const latest = onChange.mock.calls.at(-1)?.[0]
    expect(latest.position).toBe('question')
  })

  it('records the selected Likert value in the snapshot when a pill is tapped', () => {
    const onChange = vi.fn()
    render(<LovePersonalityQuiz appLanguage="en" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /begin/i }))
    const radios = screen.getAllByRole('radio')
    // Tap pill #3 (Likert value 3 — neutral).
    fireEvent.click(radios[2])
    const latest = onChange.mock.calls.at(-1)?.[0]
    expect(latest.answers[0]).toBe(3 satisfies LikertAnswer)
  })

  it('shows the Skip link only when onSkip is provided', () => {
    const { rerender } = render(<LovePersonalityQuiz appLanguage="en" />)
    // No skip link on the intro card without onSkip prop.
    expect(screen.queryByRole('button', { name: /skip/i })).toBeNull()
    rerender(<LovePersonalityQuiz appLanguage="en" onSkip={() => {}} />)
    expect(screen.getByRole('button', { name: /skip/i })).toBeTruthy()
  })
})
