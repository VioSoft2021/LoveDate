import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReportProfileDialog } from './ReportProfileDialog'
import type { Profile } from '../services/loveDateApi'

const baseProfile: Profile = {
  id: 1,
  authUserId: 'auth-1',
  name: 'Riley',
  age: 28,
  city: 'Bucharest',
  vibe: 'curious',
  bio: 'bio',
  interests: ['coffee'],
  palette: ['#000', '#111'],
  photos: ['https://example.com/a.jpg'],
  gender: 'Woman',
  distanceKm: 2,
  verified: true,
  relationshipGoal: 'Long-term',
  zodiac: 'Leo',
  personalityAnswers: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
}

describe('ReportProfileDialog', () => {
  it('returns null when profile is null', () => {
    const { container } = render(
      <ReportProfileDialog
        profile={null}
        appLanguage="en"
        category="spam"
        setCategory={vi.fn()}
        details=""
        setDetails={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(container.querySelector('.match-modal')).toBeNull()
  })

  it('renders the report form with the profile name (EN)', () => {
    render(
      <ReportProfileDialog
        profile={baseProfile}
        appLanguage="en"
        category="spam"
        setCategory={vi.fn()}
        details=""
        setDetails={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByText('Report Riley')).toBeInTheDocument()
    expect(screen.getByText('Safety')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Submit report/i })).toBeInTheDocument()
  })

  it('renders the report form with the profile name (RO)', () => {
    render(
      <ReportProfileDialog
        profile={baseProfile}
        appLanguage="ro"
        category="spam"
        setCategory={vi.fn()}
        details=""
        setDetails={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByText('Raportează Riley')).toBeInTheDocument()
    expect(screen.getByText('Siguranță')).toBeInTheDocument()
  })

  it('category select calls setCategory with the picked value', () => {
    const setCategory = vi.fn()
    render(
      <ReportProfileDialog
        profile={baseProfile}
        appLanguage="en"
        category="spam"
        setCategory={setCategory}
        details=""
        setDetails={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'harassment' } })
    expect(setCategory).toHaveBeenCalledWith('harassment')
  })

  it('details textarea calls setDetails on change', () => {
    const setDetails = vi.fn()
    render(
      <ReportProfileDialog
        profile={baseProfile}
        appLanguage="en"
        category="spam"
        setCategory={vi.fn()}
        details=""
        setDetails={setDetails}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'they keep spamming me' } })
    expect(setDetails).toHaveBeenCalledWith('they keep spamming me')
  })

  it('Cancel calls onCancel; Submit calls onSubmit', () => {
    const onCancel = vi.fn()
    const onSubmit = vi.fn()
    render(
      <ReportProfileDialog
        profile={baseProfile}
        appLanguage="en"
        category="spam"
        setCategory={vi.fn()}
        details="bad behavior"
        setDetails={vi.fn()}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onCancel).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Submit report/i }))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('preserves the current details + category in the inputs', () => {
    render(
      <ReportProfileDialog
        profile={baseProfile}
        appLanguage="en"
        category="harassment"
        setCategory={vi.fn()}
        details="seed text"
        setDetails={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('harassment')
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('seed text')
  })
})
