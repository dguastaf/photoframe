import { DateTime } from 'luxon'
import { Link } from 'react-router-dom'

import type { Photo } from '../../../../types/api'
import './photo-info-overlay.css'
import { SettingsGearIcon } from './settings-gear-icon'

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
      <div className="photo-info-overlay__top">
        <p className="photo-info-overlay__date">{takenAtLabel}</p>
        <Link
          to="/settings"
          className="photo-info-overlay__settings"
          aria-label="Settings"
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          <SettingsGearIcon className="photo-info-overlay__settings-icon" />
        </Link>
      </div>
      <p className="photo-info-overlay__folder">{folder}</p>
    </aside>
  )
}
