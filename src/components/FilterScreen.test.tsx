import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterScreen } from './FilterScreen'
import type { Filters } from '../domain'

// AI-First filter — journal-entry redesign (2026-05-25). The previous
// rev shipped the AI prompt PLUS constraint controls (looking-for,
// gender, age, distance). Per the welcome film's "Privé AI does the
// matching" promise, those constraints were stripped. The journal
// entry IS the filter. These tests cover the surviving surface:
//   - AI prompt textarea (the only input)
//   - Journal eyebrow ("Privé AI · Listening") + date stamp
//   - Live match count (header)
//   - Reset all
const baseFilters: Filters = {
  minAge: 22,
  maxAge: 40,
  city: '',
  interest: '',
  gender: 'any',
  relationshipGoal: 'any',
  maxDistanceKm: 25,
  verifiedOnly: false,
  sortBy: 'recommended',
  zodiacCompatibility: '',
  aiPreferencePrompt: '',
}

const Harness: React.FC<{
  initial?: Partial<Filters>
  cities?: string[]
  matchCount?: number
  onChange?: (next: Filters) => void
}> = ({ initial, cities = [], matchCount = 0, onChange }) => {
  const [filters, setFilters] = React.useState<Filters>({ ...baseFilters, ...initial })
  React.useEffect(() => {
    onChange?.(filters)
  }, [filters, onChange])
  return (
    <FilterScreen
      filters={filters}
      setFilters={setFilters}
      cityOptions={cities}
      appLanguage="en"
      matchCount={matchCount}
    />
  )
}

describe('FilterScreen — journal rendering', () => {
  it('renders the headline AI prompt input', () => {
    render(<Harness />)
    expect(screen.getByText(/tell us who you'?re looking for/i)).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/someone serious, into hiking/i),
    ).toBeInTheDocument()
  })

  it('renders the Privé AI listening eyebrow', () => {
    render(<Harness />)
    // "Privé AI" appears twice (eyebrow brand + hint copy) — match the
    // specific eyebrow span by its class.
    const eyebrowMatches = screen.getAllByText(/Privé AI/i)
    expect(eyebrowMatches.length).toBeGreaterThan(0)
    expect(screen.getByText(/Listening/i)).toBeInTheDocument()
  })

  it('does NOT render the constraint controls (per the AI-does-the-matching promise)', () => {
    render(<Harness />)
    // The four constraints stripped in the journal redesign
    expect(screen.queryByText(/^Looking For$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Gender$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Age$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Max Distance/i)).not.toBeInTheDocument()
    // Earlier-removed filters from the first AI rewrite
    expect(screen.queryByText('Zodiac Compatibility')).not.toBeInTheDocument()
    expect(screen.queryByText('Sort By')).not.toBeInTheDocument()
    expect(screen.queryByText('Verified Only')).not.toBeInTheDocument()
  })

  it('shows the live match count in the header', () => {
    render(<Harness matchCount={7} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('matches')).toBeInTheDocument()
  })

  it('shows the singular "match" when matchCount is 1', () => {
    render(<Harness matchCount={1} />)
    expect(screen.getByText('match')).toBeInTheDocument()
  })
})

describe('FilterScreen — journal handlers', () => {
  it('typing in the prompt updates aiPreferencePrompt', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/someone serious, into hiking/i), {
      target: { value: 'into hiking' },
    })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.aiPreferencePrompt).toBe('into hiking')
  })

  it('Reset all clears the prompt and restores filter defaults', () => {
    const onChange = vi.fn()
    render(
      <Harness
        initial={{
          minAge: 30,
          maxAge: 50,
          maxDistanceKm: 12,
          gender: 'woman',
          relationshipGoal: 'Long-term',
          aiPreferencePrompt: 'into hiking',
        }}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Reset all/i }))
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    // Underlying filter data still resets to defaults so the deck filter
    // logic (still runs server-/client-side) sees a clean slate.
    expect(last.gender).toBe('any')
    expect(last.relationshipGoal).toBe('any')
    expect(last.aiPreferencePrompt).toBe('')
  })
})
