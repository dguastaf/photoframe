import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { PhotoDisplayStatus } from './features/photos/components/photo-display/photo-display'
import { PhotoInfoOverlay } from './features/photos/components/photo-info-overlay/photo-info-overlay'
import { FrameMessage } from './features/photos/components/photo-frame/frame-message'
import { PhotoFrame } from './features/photos/components/photo-frame/photo-frame'
import { PhotoDisplay } from './features/photos/components/photo-display/photo-display'
import { OVERLAY_DISMISS_MS } from './features/photos/constants'
import { useManualNavigation } from './features/photos/hooks/useManualNavigation'
import { usePhotoLibrary } from './features/photos/hooks/usePhotoLibrary'
import { useSlideshowTimer } from './features/photos/hooks/useSlideshowTimer'

function App() {
  const {
    status,
    data: photos,
    error,
    retry,
    currentPhotoId,
    goNext,
    goPrev,
  } = usePhotoLibrary()
  const [slideshowPaused, setSlideshowPaused] = useState(true)
  const [overlayOpen, setOverlayOpen] = useState(false)

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

  const manualNavigation = useManualNavigation({
    onNext: goNext,
    onPrev: goPrev,
    enabled: showSlideshow,
  })

  useLayoutEffect(() => {
    setOverlayOpen(false)
  }, [currentPhotoId])

  useEffect(() => {
    if (!overlayOpen) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setOverlayOpen(false)
    }, OVERLAY_DISMISS_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [overlayOpen])

  const handleFrameClick = useCallback(() => {
    setOverlayOpen((open) => !open)
  }, [])

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

  const overlayPhoto =
    overlayOpen && currentPhotoId != null
      ? photos?.find((photo) => photo.id === currentPhotoId)
      : undefined

  return (
    <PhotoFrame {...manualNavigation} onClick={handleFrameClick}>
      <PhotoDisplay
        key={currentPhotoId}
        photoId={currentPhotoId}
        onStatusChange={handlePhotoStatusChange}
      />
      {overlayPhoto != null && (
        <PhotoInfoOverlay visible={overlayOpen} photo={overlayPhoto} />
      )}
    </PhotoFrame>
  )
}

export default App
