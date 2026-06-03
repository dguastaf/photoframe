import { Link } from 'react-router-dom'

import { DisplayDurationControl } from '../features/settings/components/display-duration-control'
import { SettingsBackIcon } from '../features/settings/components/settings-back-icon'
import { SyncNowSection } from '../features/settings/components/sync-now-section'
import { useDisplayDuration } from '../features/settings/settings-duration-context'
import { usePhotoLibraryContext } from '../features/photos/photo-library-context'

import './settings-page.css'

export function SettingsPage() {
  const { displayDurationMs, setDisplayDurationMs } = useDisplayDuration()
  const { syncNow, isSyncing, lastRefreshAt, status } = usePhotoLibraryContext()

  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <Link to="/" className="settings-page__back" aria-label="Back to slideshow">
          <SettingsBackIcon className="settings-page__back-icon" />
        </Link>
        <h1 className="settings-page__title">Settings</h1>
      </header>

      <DisplayDurationControl
        displayDurationMs={displayDurationMs}
        onDurationChange={setDisplayDurationMs}
      />

      <SyncNowSection
        lastRefreshAt={lastRefreshAt}
        isSyncing={isSyncing}
        syncDisabled={status === 'loading'}
        onSyncNow={syncNow}
      />
    </main>
  )
}
