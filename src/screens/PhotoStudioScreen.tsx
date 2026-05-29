import React from 'react'
import './PhotoStudioScreen.css'
import { Logo } from '../components/Logo'
import { UI_TEXT } from '../constants'
import { PhotoManager, type PhotoManagerProps } from '../components/PhotoManager'

// PhotoStudioScreen — dedicated full-screen home for photo management
// (2026-05-28). Replaces the cramped inline-in-ProfileScreen photo
// section. Opened from the profile's "Manage photos" button. The body
// is the PhotoManager (grid ↔ single-photo editor); this screen owns
// only the chrome: a crest header + a state-aware back/done control.

export type PhotoStudioScreenProps = PhotoManagerProps & {
  /** Return to the profile screen. */
  onBack: () => void
}

export const PhotoStudioScreen: React.FC<PhotoStudioScreenProps> = (props) => {
  const { appLanguage, onBack, photoStudioSource, closePhotoStudio } = props
  const copy = UI_TEXT[appLanguage].profile
  const editing = photoStudioSource != null

  // When editing a photo, "back" returns to the grid (cancels the edit);
  // from the grid, "back" returns to the profile.
  const handleBack = () => {
    if (editing) {
      closePhotoStudio()
    } else {
      onBack()
    }
  }

  return (
    <main className="photo-studio-screen">
      <header className="photo-studio-header">
        <button type="button" className="photo-studio-back" onClick={handleBack}>
          ‹ {editing ? copy.studioBackToPhotos : copy.studioDone}
        </button>
        <Logo variant="compact" size="sm" className="photo-studio-logo" />
        <h1 className="photo-studio-title">
          {editing ? copy.studioEditTitle : copy.managePhotosTitle}
        </h1>
      </header>

      <section className={`photo-studio-body${editing ? ' is-editing' : ''}`}>
        <PhotoManager {...props} />
      </section>
    </main>
  )
}
