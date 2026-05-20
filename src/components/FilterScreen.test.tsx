import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterScreen } from './FilterScreen'
import type { Filters } from '../domain'

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
}

const ZODIAC_EMOJI = {
  Leo: '♌',
  Aries: '♈',
  Pisces: '♓',
}

// Wraps FilterScreen with a real useState so updater functions resolve
// against current state — same way App.tsx wires it. The `onChange` spy
// fires after every state transition so tests can assert against the
// concrete next-state value.
const Harness: React.FC<{
  initial?: Partial<Filters>
  cities?: string[]
  onChange?: (next: Filters) => void
}> = ({ initial, cities = [], onChange }) => {
  const [filters, setFilters] = React.useState<Filters>({ ...baseFilters, ...initial })
  React.useEffect(() => {
    onChange?.(filters)
  }, [filters, onChange])
  return (
    <FilterScreen
      filters={filters}
      setFilters={setFilters}
      cityOptions={cities}
      ZODIAC_EMOJI={ZODIAC_EMOJI}
    />
  )
}

describe('FilterScreen — rendering', () => {
  it('renders all filter labels', () => {
    render(<Harness />)
    expect(screen.getByText('Zodiac Compatibility')).toBeInTheDocument()
    expect(screen.getByText('Min Age')).toBeInTheDocument()
    expect(screen.getByText('Max Age')).toBeInTheDocument()
    expect(screen.getByText('City')).toBeInTheDocument()
    expect(screen.getByText('Interest')).toBeInTheDocument()
    expect(screen.getByText('Gender')).toBeInTheDocument()
    expect(screen.getByText('Looking For')).toBeInTheDocument()
    expect(screen.getByText(/Max Distance/i)).toBeInTheDocument()
    expect(screen.getByText('Sort By')).toBeInTheDocument()
    expect(screen.getByText('Verified Only')).toBeInTheDocument()
  })

  it('zodiac select lists every key from the ZODIAC_EMOJI prop', () => {
    const { container } = render(<Harness />)
    const zodiacSelect = container.querySelector(
      'label:has(> select[value]):first-of-type select',
    )
    // Simpler: zodiac is the first select; its options include Leo + Aries + Pisces.
    const allOptionTexts = Array.from(container.querySelectorAll('option')).map(
      (o) => o.textContent || '',
    )
    expect(allOptionTexts.some((t) => t.includes('Leo'))).toBe(true)
    expect(allOptionTexts.some((t) => t.includes('Aries'))).toBe(true)
    expect(allOptionTexts.some((t) => t.includes('Pisces'))).toBe(true)
    // Sanity: at least one "Any" exists (multiple selects have an Any option)
    expect(allOptionTexts.filter((t) => t === 'Any').length).toBeGreaterThan(0)
    // Suppress unused-var lint for the selector experiment
    void zodiacSelect
  })

  it('distance slider displays the current km value', () => {
    render(<Harness initial={{ maxDistanceKm: 42 }} />)
    expect(screen.getByText('42 km')).toBeInTheDocument()
  })
})

describe('FilterScreen — controlled handlers', () => {
  it('zodiac select change updates state', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const zodiacSelect = screen.getByLabelText('Zodiac Compatibility')
    fireEvent.change(zodiacSelect, { target: { value: 'Leo' } })
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as Filters
    expect(lastCall.zodiacCompatibility).toBe('Leo')
  })

  it('city select updates state', () => {
    const onChange = vi.fn()
    render(<Harness cities={['Bucharest', 'Cluj']} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Cluj' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.city).toBe('Cluj')
  })

  it('interest input updates state', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Interest'), { target: { value: 'hiking' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.interest).toBe('hiking')
  })

  it('gender select updates state', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'woman' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.gender).toBe('woman')
  })

  it('Looking For select updates relationshipGoal', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Looking For'), { target: { value: 'Long-term' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.relationshipGoal).toBe('Long-term')
  })

  it('distance slider change updates maxDistanceKm', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/Max Distance/i), { target: { value: '38' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.maxDistanceKm).toBe(38)
  })

  it('Sort By select updates state', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Sort By'), { target: { value: 'nearest' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.sortBy).toBe('nearest')
  })

  it('Verified Only checkbox flips state', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Verified Only'))
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.verifiedOnly).toBe(true)
  })
})

describe('FilterScreen — age bounds (the safety logic)', () => {
  it('min age below 18 clamps to 18', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Min Age'), { target: { value: '10' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.minAge).toBe(18)
  })

  it('min age above 99 is clamped (then by current maxAge)', () => {
    const onChange = vi.fn()
    render(<Harness initial={{ maxAge: 99 }} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Min Age'), { target: { value: '200' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.minAge).toBe(99)
  })

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

  it('empty min age input falls back to 18', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Min Age'), { target: { value: '' } })
    const last = onChange.mock.calls.at(-1)?.[0] as Filters
    expect(last.minAge).toBe(18)
  })
})
