import { useCallback, useEffect, useState } from 'react'
import { getPhotos } from '../api/photos'
import { ApiError } from '../../../lib/api-client'
import type { PhotoMetadata } from '../../../types/api'

export type LibraryStatus = 'loading' | 'ready' | 'error'

export function usePhotoLibrary() {
  const [status, setStatus] = useState<LibraryStatus>('loading')
  const [photos, setPhotos] = useState<PhotoMetadata[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const retry = useCallback(() => {
    setPhotos(null)
    setError(null)
    setStatus('loading')
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    const ac = new AbortController()

    getPhotos({ signal: ac.signal })
      .then((list) => {
        if (ac.signal.aborted) return
        setPhotos(list)
        setError(null)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setPhotos(null)
        const message =
          err instanceof ApiError ? err.detail : 'Failed to load photo library'
        setError(message)
        setStatus('error')
      })

    return () => ac.abort()
  }, [refreshKey])

  return { status, photos, error, retry }
}
