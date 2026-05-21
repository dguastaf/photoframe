import { useState } from 'react'
import { LoadingSpinner } from '../../../../components/ui/loading-spinner/loading-spinner'
import { photoImageUrl } from '../../api/photos'
import './photo-display.css'

const PHOTO_LOAD_ERROR_MESSAGE = 'Could not load photo'

type PhotoDisplayProps = {
  photoId: string
}

export function PhotoDisplay({ photoId }: PhotoDisplayProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retryCount, setRetryCount] = useState(0)

  const src =
    retryCount === 0
      ? photoImageUrl(photoId)
      : `${photoImageUrl(photoId)}?retry=${retryCount}`

  const handleRetry = () => {
    setRetryCount((n) => n + 1)
    setStatus('loading')
  }

  return (
    <div className="photo-display" data-status={status}>
      {status === 'loading' && (
        <LoadingSpinner aria-label="Loading photo" />
      )}
      {status === 'error' && (
        <div className="photo-display__error">
          <p>{PHOTO_LOAD_ERROR_MESSAGE}</p>
          <button type="button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}
      <img
        className="photo-display__img"
        src={src}
        alt=""
        hidden={status !== 'ready'}
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
      />
    </div>
  )
}
