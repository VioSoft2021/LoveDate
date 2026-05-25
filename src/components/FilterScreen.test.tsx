import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterScreen } from './FilterScreen'
import type { Filters } from '../domain'

// AI-First filter redesign (2026-05-21). The previous form-style screen
// shipped zodiac/city/interest/sort-by/verified-only controls. Those are
// gone — Sonnet (E3) handles their work via the new aiPreferencePrompt.
// These tests cover the surviving + new controls:
//   - AI prompt textarea
//   - Looking-for segmented pills
//   - Gender segmented pills
//   - Age range (two stacked sliders)
//   - Distance slider
//   - Live match count
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

describe('FilterScreen — AI-first rendering', () => {
  it('renders the headline AI prompt input', () => {
    render(<Harness />)
    // New AI-First hero label (2026-05-25) — was "What are you looking for?"
    expect(screen.getByText(/tell us who you'?re looking for/i)).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/someone serious, into hiking/i),
    ).toBeInTheDocument()
  })

  it('renders the surviving filter labels (Looking For, Gender, Age, Max Distance)', () => {
    render(<Harness />)
    expect(screen.getByText('Looking For')).toBeInTheDocument()
    expect(screen.getByText('Gender')).toBeInTheDocument()
    expect(screen.getByText('Age')).toBeInTheDocument()
    expect(screen.getByText(/Max Distance/i)).toBeInTheDocument()
  })

  it('does NOT render the removed filters (zodiac, city, interest, sort, verified)', () => {
    render(<Harness />)
    expect(screen.queryByText('Zodiac Compatibility')).not.toBeInTheDocument()
    expect(screen.queryByText('City')).not.toBeInTheDocument()
    expect(screen.queryByText('Interest')).not.toBeInTheDocument()
    expect(screen.queryByText('Sort By')).not.toBeInTheDocument()
    expect(screen.queryByText('Verified Only')).not.toBeInTheDocument()
  })

  it('shows the live match count', () => {
    render(<Harness matchCount={7} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('matches')).toBeInTheDocument()
  })

  it('shows the singular "match" when matchCount is 1', () => {
    render(<Harness matchCount={1} />)
    expect(screen.getByText('match')).toBeInTheDocument()
  })

  it('shows the current age range value', () => {
    render(<Harness initial={{ minAge: 25, maxAge: 35 }} />)
    expect(screen.getByText('25 – 35')).toBeInTheDocument()
  })

  it('shows the current distance value', () => {
    render(<Harness initial={{ maxDistanceKm: 42 }} />)
    expect(screen.getByText('42 km')).toBeInTheDocument()
  })
})

describe('FilterScreen — AI-first handlers', () => {
  it('typing in the prompt updates aiPreferencePrompt', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/someone serious, into hiking/i), {
      target: { value: 'into hiking' },
    })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.aiPreferencePrompt).toBe('into hiking')
  })

  it('clicking a looking-for pill updates relationshipGoal', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Long-term' }))
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.relationshipGoal).toBe('Long-term')
  })

  it('clicking a gender pill updates gender', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Woman' }))
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.gender).toBe('woman')
  })

  it('distance slider updates maxDistanceKm', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/Max Distance/i), { target: { value: '38' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.maxDistanceKm).toBe(38)
  })

  it('Reset all returns every filter to defaults', () => {
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
    expect(last.gender).toBe('any')
    expect(last.relationshipGoal).toBe('any')
    expect(last.aiPreferencePrompt).toBe('')
  })
})

describe('FilterScreen — age bounds (dual-handle safety logic)', () => {
  it('min age cannot exceed current max age', () => {
    const onChange = vi.fn()
    render(<Harness initial={{ minAge: 22, maxAge: 30 }} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Min Age'), { target: { value: '50' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.minAge).toBe(30)
  })

  it('max age cannot drop below current min age', () => {
    const onChange = vi.fn()
    render(<Harness initial={{ minAge: 30, maxAge: 40 }} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Max Age'), { target: { value: '20' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.maxAge).toBe(30)
  })

  it('min age clamps to 18 when slider goes lower', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Min Age'), { target: { value: '10' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.minAge).toBe(18)
  })

  it('max age clamps to 99 when slider goes higher', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Max Age'), { target: { value: '200' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.maxAge).toBe(99)
  })
})
