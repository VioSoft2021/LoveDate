import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhotoLightbox } from './PhotoLightbox'

describe('PhotoLightbox', () => {
  it('returns null when photoUrl is null', () => {
    const { container } = render(
      <PhotoLightbox
        photoUrl={null}
        zoom={1}
        setZoom={vi.fn()}
        zoomBy={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(container.querySelector('.photo-lightbox')).toBeNull()
  })

  it('renders the modal with the provided photo URL', () => {
    render(
      <PhotoLightbox
        photoUrl="https://example.com/x.jpg"
        zoom={1.5}
        setZoom={vi.fn()}
        zoomBy={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const img = screen.getByAltText('Expanded profile') as HTMLImageElement
    expect(img.src).toBe('https://example.com/x.jpg')
    // Zoom value reflected in the CSS transform
    expect(img.style.transform).toBe('scale(1.5)')
  })

  it('clicking Close calls onClose', () => {
    const onClose = vi.fn()
    render(
      <PhotoLightbox
        photoUrl="https://example.com/x.jpg"
        zoom={1}
        setZoom={vi.fn()}
        zoomBy={vi.fn()}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('zoom slider change calls setZoom with the new numeric value', () => {
    const setZoom = vi.fn()
    render(
      <PhotoLightbox
        photoUrl="https://example.com/x.jpg"
        zoom={1}
        setZoom={setZoom}
        zoomBy={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const slider = screen.getByLabelText('Zoom level')
    fireEvent.change(slider, { target: { value: '2.3' } })
    expect(setZoom).toHaveBeenCalledWith(2.3)
  })

  it('+ and - buttons call zoomBy with +/- 0.2', () => {
    const zoomBy = vi.fn()
    render(
      <PhotoLightbox
        photoUrl="https://example.com/x.jpg"
        zoom={1}
        setZoom={vi.fn()}
        zoomBy={zoomBy}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }))
    expect(zoomBy).toHaveBeenLastCalledWith(0.2)
    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }))
    expect(zoomBy).toHaveBeenLastCalledWith(-0.2)
  })

  it('has the correct ARIA modal attributes', () => {
    const { container } = render(
      <PhotoLightbox
        photoUrl="https://example.com/x.jpg"
        zoom={1}
        setZoom={vi.fn()}
        zoomBy={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const dialog = container.querySelector('.photo-lightbox')
    expect(dialog?.getAttribute('role')).toBe('dialog')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('aria-label')).toBe('Photo lightbox')
  })
})
