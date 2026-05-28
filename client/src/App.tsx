import { useCallback, useState } from 'react'
import type { PhotoDisplayStatus } from './features/photos/components/photo-display/photo-display'
import { FrameMessage } from './features/photos/components/photo-frame/frame-message'
import { PhotoFrame } from './features/photos/components/photo-frame/photo-frame'
import { PhotoDisplay } from './features/photos/components/photo-display/photo-display'
import { usePhotoLibrary } from './features/photos/hooks/usePhotoLibrary'
import { useSlideshowTimer } from './features/photos/hooks/useSlideshowTimer'

function App() {
  const { status, data: photos, error, retry, currentPhotoId, goNext } =
    usePhotoLibrary()
  const [slideshowPaused, setSlideshowPaused] = useState(true)

  const handlePhotoStatusChange = useCallback((s: PhotoDisplayStatus) => {
    setSlideshowPaused(s !== 'ready')
  }, [])

  const showSlideshow = status === 'success' && currentPhotoId != null

  useSlideshowTimer({
    onTick: goNext,
    paused: slideshowPaused,
    enabled: showSlideshow,
    resetKey: currentPhotoId,
  })

  if (!showSlideshow) {
    return (
      <FrameMessage
        loading={status === 'loading'}
        error={error}
        hasPhotos={(photos?.length ?? 0) > 0}
        onRetry={retry}
      />
    )
  }

  return (
    <PhotoFrame>
      <PhotoDisplay
        key={currentPhotoId}
        photoId={currentPhotoId}
        onStatusChange={handlePhotoStatusChange}
      />
    </PhotoFrame>
  )
}

export default App
