import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { shuffle } from '../lib/shuffle'
import type { PhotoMetadata } from '../../../types/api'

function photoIdsFingerprint(ids: string[]): string {
  return ids.join('\0')
}

type PlaybackState = {
  shuffledIds: string[]
  cursor: number
}

const EMPTY_PLAYBACK: PlaybackState = { shuffledIds: [], cursor: 0 }

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

  const [playback, setPlayback] = useState<PlaybackState>(EMPTY_PLAYBACK)

  useLayoutEffect(() => {
    if (catalogIds.length === 0) {
      setPlayback(EMPTY_PLAYBACK)
      return
    }
    setPlayback({ shuffledIds: shuffle(catalogIds), cursor: 0 })
  }, [idsKey])

  const { shuffledIds, cursor } = playback
  const currentPhotoId =
    shuffledIds.length > 0 ? shuffledIds[cursor] : undefined

  const goNext = useCallback(() => {
    setPlayback((prev) => {
      if (prev.shuffledIds.length === 0) return prev
      const nextIndex = prev.cursor + 1
      if (nextIndex < prev.shuffledIds.length) {
        return { ...prev, cursor: nextIndex }
      }
      return { shuffledIds: shuffle(catalogIds), cursor: 0 }
    })
  }, [catalogIds])

  const goPrev = useCallback(() => {
    setPlayback((prev) => {
      if (prev.shuffledIds.length === 0) return prev
      return {
        ...prev,
        cursor:
          prev.cursor === 0 ? prev.shuffledIds.length - 1 : prev.cursor - 1,
      }
    })
  }, [])

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
