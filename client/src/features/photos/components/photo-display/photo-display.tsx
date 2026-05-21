import { useEffect, useRef, useState } from 'react'
import { LoadingSpinner } from '../../../../components/ui/loading-spinner/loading-spinner'
import { photoImageUrl } from '../../api/photos'
import './photo-display.css'

const PHOTO_LOAD_ERROR_MESSAGE = 'Could not load photo'

export type PhotoDisplayStatus = 'loading' | 'ready' | 'error'

type PhotoDisplayProps = {
  photoId: string
  onStatusChange?: (status: PhotoDisplayStatus) => void
}

export function PhotoDisplay({ photoId, onStatusChange }: PhotoDisplayProps) {
  const [status, setStatus] = useState<PhotoDisplayStatus>('loading')
  const [retryCount, setRetryCount] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const onStatusChangeRef = useRef(onStatusChange)
  onStatusChangeRef.current = onStatusChange

  useEffect(() => {
    setStatus('loading')
    setRetryCount(0)
    onStatusChangeRef.current?.('loading')
  }, [photoId])

  useEffect(() => {
    onStatusChange?.(status)
  }, [status, onStatusChange])

  const src =
    retryCount === 0
      ? photoImageUrl(photoId)
      : `${photoImageUrl(photoId)}?retry=${retryCount}`

  const handleRetry = () => {
    setRetryCount((n) => n + 1)
    setStatus('loading')
  }

  const handleImgRef = (node: HTMLImageElement | null) => {
    imgRef.current = node
    if (node?.complete && node.naturalWidth > 0) {
      setStatus('ready')
    }
  }

  return (
    <div className="photo-display" data-photo-id={photoId} data-status={status}>
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
        ref={handleImgRef}
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
