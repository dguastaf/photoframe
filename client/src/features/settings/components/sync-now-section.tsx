import { formatLastRefreshAt } from '../lib/timing'

import './sync-now-section.css'

type SyncNowSectionProps = {
  lastRefreshAt: string | null
  isSyncing: boolean
  syncDisabled: boolean
  onSyncNow: () => void
}

export function SyncNowSection({
  lastRefreshAt,
  isSyncing,
  syncDisabled,
  onSyncNow,
}: SyncNowSectionProps) {
  return (
    <section className="sync-now-section" aria-labelledby="sync-now-heading">
      <h2 id="sync-now-heading" className="sync-now-section__title">
        Library sync
      </h2>
      <p className="sync-now-section__last-refresh">
        Last refreshed:{' '}
        <span className="sync-now-section__timestamp">
          {formatLastRefreshAt(lastRefreshAt)}
        </span>
      </p>
      <button
        type="button"
        className="sync-now-section__button"
        onClick={onSyncNow}
        disabled={syncDisabled || isSyncing}
      >
        {isSyncing ? 'Syncing…' : 'Sync now'}
      </button>
    </section>
  )
}
