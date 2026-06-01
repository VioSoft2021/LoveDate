import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AudioPlayer } from './AudioPlayer'

// jsdom doesn't implement media playback — stub play/pause so the toggle wiring
// can be exercised.
beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  })
})

describe('AudioPlayer', () => {
  it('renders a play button and an <audio> with NO native controls', () => {
    const { container } = render(<AudioPlayer src="blob:test" />)
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
    const audio = container.querySelector('audio')
    expect(audio).not.toBeNull()
    // The whole point: no native control bar -> no native overflow menu.
    expect(audio?.hasAttribute('controls')).toBe(false)
    expect(audio?.getAttribute('src')).toBe('blob:test')
  })

  it('calls play() when the play button is clicked', () => {
    render(<AudioPlayer src="blob:test" />)
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })

  it('exposes a seek slider', () => {
    render(<AudioPlayer src="blob:test" />)
    expect(screen.getByRole('slider', { name: /seek/i })).toBeInTheDocument()
  })
})
