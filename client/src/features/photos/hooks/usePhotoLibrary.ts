import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { shuffle } from '../lib/shuffle'
import type { PhotoMetadata } from '../../../types/api'

function photoIdsFingerprint(ids: string[]): string {
  return ids.join('\0')
}

/**
 * Server-ordered catalog plus shuffled playback order for the slideshow.
 * Pass `photos` from {@link usePhotosQuery} (`null` while loading or on error).
 */
export function usePhotoLibrary(photos: PhotoMetadata[] | null) {
  const catalogIds = useMemo(
    () => (photos ?? []).map((p) => p.id),
    [photos],
  )
  const idsKey = photoIdsFingerprint(catalogIds)

  const [shuffledIds, setShuffledIds] = useState<string[]>([])
  const [cursor, setCursor] = useState(0)

  useLayoutEffect(() => {
    if (catalogIds.length === 0) {
      setShuffledIds([])
      setCursor(0)
      return
    }
    setShuffledIds(shuffle(catalogIds))
    setCursor(0)
  }, [idsKey])

  const currentPhotoId =
    shuffledIds.length > 0 ? shuffledIds[cursor] : undefined

  const goNext = useCallback(() => {
    if (shuffledIds.length === 0) return
    const nextIndex = cursor + 1
    if (nextIndex < shuffledIds.length) {
      setCursor(nextIndex)
    } else {
      setShuffledIds(shuffle(catalogIds))
      setCursor(0)
    }
  }, [cursor, shuffledIds.length, catalogIds])

  const goPrev = useCallback(() => {
    if (shuffledIds.length === 0) return
    setCursor((prev) => (prev === 0 ? shuffledIds.length - 1 : prev - 1))
  }, [shuffledIds.length])

  return useMemo(
    () => ({
      photos: photos ?? [],
      shuffledIds,
      currentPhotoId,
      goNext,
      goPrev,
    }),
    [photos, shuffledIds, currentPhotoId, goNext, goPrev],
  )
}
