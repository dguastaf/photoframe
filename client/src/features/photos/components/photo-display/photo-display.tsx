import { useState } from 'react'
import { LoadingSpinner } from '../../../../components/ui/loading-spinner/loading-spinner'
import { photoImageUrl } from '../../api/photos'
import './photo-display.css'

type PhotoDisplayProps = {
  photoId: string
}

export function PhotoDisplay({ photoId }: PhotoDisplayProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('Could not load photo')
  const [retryCount, setRetryCount] = useState(0)

  const src =
    retryCount === 0
      ? photoImageUrl(photoId)
      : `${photoImageUrl(photoId)}?retry=${retryCount}`

  const handleRetry = () => {
    setRetryCount((n) => n + 1)
    setStatus('loading')
    setErrorMessage('Could not load photo')
  }

  return (
    <div className="photo-display" data-status={status}>
      {status === 'loading' && (
        <LoadingSpinner aria-label="Loading photo" />
      )}
      {status === 'error' && (
        <div className="photo-display__error">
          <p>{errorMessage}</p>
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
        onError={() => {
          setStatus('error')
          setErrorMessage('Could not load photo')
        }}
      />
    </div>
  )
}
