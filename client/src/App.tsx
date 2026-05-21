import { useCallback, useMemo, useState } from 'react'
import type { PhotoDisplayStatus } from './features/photos/components/photo-display/photo-display'
import { FrameMessage } from './features/photos/components/photo-frame/frame-message'
import { PhotoFrame } from './features/photos/components/photo-frame/photo-frame'
import { PhotoDisplay } from './features/photos/components/photo-display/photo-display'
import { usePhotoLibrary } from './features/photos/hooks/usePhotoLibrary'
import { useShuffleCursor } from './features/photos/hooks/useShuffleCursor'
import { useSlideshowTimer } from './features/photos/hooks/useSlideshowTimer'

function App() {
  const { status, photos, error, retry } = usePhotoLibrary()
  const photoIds = useMemo(() => photos?.map((p) => p.id) ?? [], [photos])
  const { currentId, goNext } = useShuffleCursor(photoIds)
  const [imageLoading, setImageLoading] = useState(true)

  const handlePhotoStatusChange = useCallback((s: PhotoDisplayStatus) => {
    setImageLoading(s === 'loading')
  }, [])

  const showSlideshow = status === 'ready' && photoIds.length > 0

  useSlideshowTimer({
    onTick: goNext,
    paused: imageLoading,
    enabled: showSlideshow,
    resetKey: currentId,
  })

  if (!showSlideshow) {
    const hasPhotos = (photos?.length ?? 0) > 0
    return (
      <FrameMessage
        loading={status === 'loading'}
        error={error}
        hasPhotos={hasPhotos}
        onRetry={retry}
      />
    )
  }

  return (
    <PhotoFrame>
      <PhotoDisplay
        key={currentId}
        photoId={currentId!}
        onStatusChange={handlePhotoStatusChange}
      />
    </PhotoFrame>
  )
}

export default App
