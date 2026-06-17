import { useCallback, useEffect, useLayoutEffect, useState } from 'react'

import { PhotoInfoOverlay } from '../features/photos/components/photo-info-overlay/photo-info-overlay'
import { FrameMessage } from '../features/photos/components/photo-frame/frame-message'
import { PhotoFrame } from '../features/photos/components/photo-frame/photo-frame'
import { PhotoDisplay } from '../features/photos/components/photo-display/photo-display'
import { OVERLAY_DISMISS_MS } from '../features/photos/constants'
import { usePhotoLibraryContext } from '../features/photos/photo-library-context'
import { useManualNavigation } from '../features/photos/hooks/useManualNavigation'
import { usePrefetchImage } from '../features/photos/hooks/usePrefetchImage'
import { useDisplayDuration } from '../features/settings/settings-duration-context'
import { useSlideshowTimer } from '../features/photos/hooks/useSlideshowTimer'

export function SlideshowPage() {
  const {
    status,
    data: photos,
    error,
    retry,
    currentPhotoId,
    nextPhotoId,
    goNext,
    goPrev,
  } = usePhotoLibraryContext()
  const [overlayOpen, setOverlayOpen] = useState(false)

  const showSlideshow = status === 'success' && currentPhotoId != null
  const { displayDurationMs } = useDisplayDuration()

  useSlideshowTimer({
    onTick: goNext,
    paused: false,
    enabled: showSlideshow,
    resetKey: currentPhotoId,
    intervalMs: displayDurationMs,
  })

  usePrefetchImage(showSlideshow ? nextPhotoId : undefined)

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
      <PhotoDisplay photoId={currentPhotoId} />
      {overlayPhoto != null && (
        <PhotoInfoOverlay visible={overlayOpen} photo={overlayPhoto} />
      )}
    </PhotoFrame>
  )
}
