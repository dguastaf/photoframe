import { useEffect } from 'react'

import { photoImageUrl } from '../api/photos'

/** Warm the browser cache for the next slide via an off-screen Image. */
export function usePrefetchImage(photoId: string | undefined): void {
  useEffect(() => {
    if (photoId === undefined) {
      return
    }

    const img = new Image()
    img.src = photoImageUrl(photoId)
  }, [photoId])
}
