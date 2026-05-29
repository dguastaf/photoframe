import { DateTime } from 'luxon'

import type { Photo } from '../../../../types/api'
import './photo-info-overlay.css'

function formatTakenAt(takenAt: string): string {
  const capture = DateTime.fromISO(takenAt, { setZone: true })
  if (!capture.isValid) {
    return takenAt
  }

  const locale =
    typeof navigator !== 'undefined'
      ? navigator.language
      : Intl.DateTimeFormat().resolvedOptions().locale

  // Intl may insert U+202F before AM/PM on some runtimes; normalize for stable display/tests.
  return capture
    .setLocale(locale)
    .toLocaleString({
      dateStyle: 'long',
      timeStyle: 'short',
    })
    .replace(/\u202f/g, ' ')
}

type PhotoInfoOverlayProps = {
  visible: boolean
  photo: Photo
}

export function PhotoInfoOverlay({ visible, photo }: PhotoInfoOverlayProps) {
  const takenAtLabel = formatTakenAt(photo.taken_at)
  const folder = photo.folder

  return (
    <aside
      className="photo-info-overlay"
      role="region"
      aria-label="Photo information"
      aria-hidden={!visible}
      data-overlay-visible={visible ? 'true' : 'false'}
    >
      <p className="photo-info-overlay__date">{takenAtLabel}</p>
      <p className="photo-info-overlay__folder">{folder}</p>
    </aside>
  )
}
