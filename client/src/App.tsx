import { useCallback, useEffect, useState } from 'react'
import { getPhotos } from './features/photos/api/photos'
import { FrameMessage } from './features/photos/components/photo-frame/frame-message'
import { PhotoFrame } from './features/photos/components/photo-frame/photo-frame'
import { PhotoDisplay } from './features/photos/components/photo-display/photo-display'
import { ApiError } from './lib/api-client'
import type { PhotoMetadata } from './types/api'

function App() {
  const [photos, setPhotos] = useState<PhotoMetadata[] | null>(null)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const hasPhotos = (photos?.length ?? 0) > 0
  const showFrameMessage = loading || !!libraryError || !hasPhotos

  const loadPhotos = useCallback(() => {
    setPhotos(null)
    setLibraryError(null)
    setLoading(true)
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    const ac = new AbortController()

    getPhotos({ signal: ac.signal })
      .then((list) => {
        if (ac.signal.aborted) return
        setPhotos(list)
        setLibraryError(null)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        
        setPhotos(null)
        
        const message =
          err instanceof ApiError ? err.detail : 'Failed to load photo library'
        setLibraryError(message)
      })
      .finally(() => {
        if (ac.signal.aborted) return
        setLoading(false)
      })

    return () => ac.abort()
  }, [refreshKey])

  if (showFrameMessage) {
    return (
      <FrameMessage
        loading={loading}
        error={libraryError}
        hasPhotos={hasPhotos}
        onRetry={loadPhotos}
      />
    )
  }

  const photo = photos![0]
  return (
    <PhotoFrame>
      <PhotoDisplay key={photo.id} photoId={photo.id} />
    </PhotoFrame>
  )
}

export default App
