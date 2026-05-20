import React from 'react'

export type PhotoLightboxProps = {
  photoUrl: string | null
  zoom: number
  setZoom: (value: number) => void
  zoomBy: (delta: number) => void
  onClose: () => void
}

// Full-screen image viewer with a zoom slider + (-/+) buttons.
// Returns null when photoUrl is null so the parent can render it
// unconditionally. The Escape-key dismiss lives in useKeyboardShortcuts
// (priority below match-celebration + above nothing).
export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photoUrl,
  zoom,
  setZoom,
  zoomBy,
  onClose,
}) => {
  if (!photoUrl) return null
  return (
    <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Photo lightbox">
      <article className="photo-lightbox-panel">
        <div className="photo-lightbox-toolbar">
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Zoom level"
          />
          <button type="button" className="ghost" onClick={() => zoomBy(-0.2)} aria-label="Zoom out">
            -
          </button>
          <button type="button" className="ghost" onClick={() => zoomBy(0.2)} aria-label="Zoom in">
            +
          </button>
        </div>
        <div className="photo-lightbox-canvas">
          <img
            src={photoUrl}
            alt="Expanded profile"
            decoding="async"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>
      </article>
    </div>
  )
}
