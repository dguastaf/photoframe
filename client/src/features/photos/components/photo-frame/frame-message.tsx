import { LoadingSpinner } from '../../../../components/ui/loading-spinner/loading-spinner'
import { PhotoFrame } from './photo-frame'
import './frame-message.css'

export type FrameMessageProps = {
  loading: boolean
  error: string | null
  hasPhotos: boolean
  onRetry: () => void
}

export function FrameMessage({ loading, error, hasPhotos, onRetry }: FrameMessageProps) {
  const showNoPhotos = !loading && !hasPhotos

  return (
    <PhotoFrame>
      <div className="frame-message">
        {loading && <LoadingSpinner aria-label="Loading photos" />}
        {loading && <p className="frame-message__status">Loading photos…</p>}

        {error && <p className="frame-message__error">{error}</p>}

        {showNoPhotos && (
          <>
            <p className="frame-message__status">No photos in library</p>
            <button type="button" className="frame-message__retry" onClick={onRetry}>
              Retry
            </button>
          </>
        )}
      </div>
    </PhotoFrame>
  )
}
