import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPhotos } from '../api/photos'
import { LIBRARY_REFRESH_MS } from '../constants'
import { shuffle } from '../lib/shuffle'
import { ApiError } from '../../../lib/api-client'
import type { PhotoMetadata } from '../../../types/api'

export type LibraryStatus = 'loading' | 'success' | 'error'

type PlaybackState = {
  shuffledIds: string[]
  cursor: number
}

const EMPTY_PLAYBACK: PlaybackState = { shuffledIds: [], cursor: 0 }

async function fetchLibrary(signal: AbortSignal): Promise<PhotoMetadata[]> {
  try {
    return await getPhotos({ signal })
  } catch (err: unknown) {
    const message =
      err instanceof ApiError ? err.detail : 'Failed to load photo library'
    throw new Error(message)
  }
}

/**
 * Photo catalog fetch, 24h refresh, and shuffled slideshow playback.
 * Reshuffles after every successful fetch; goNext/goPrev only move the cursor.
 * Failed background refresh clears playback and surfaces the error UI (Retry).
 */
export function usePhotoLibrary() {
  const [status, setStatus] = useState<LibraryStatus>('loading')
  const [data, setData] = useState<PhotoMetadata[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playback, setPlayback] = useState<PlaybackState>(EMPTY_PLAYBACK)
  const [fetchKey, setFetchKey] = useState(0)

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = window.setTimeout(() => {
      setFetchKey((k) => k + 1)
    }, LIBRARY_REFRESH_MS)
  }, [])

  const applyLibrary = useCallback(
    (photos: PhotoMetadata[]) => {
      setData(photos)
      setStatus('success')
      setError(null)
      if (photos.length === 0) {
        setPlayback(EMPTY_PLAYBACK)
      } else {
        setPlayback({
          shuffledIds: shuffle(photos.map((p) => p.id)),
          cursor: 0,
        })
      }
      scheduleRefresh()
    },
    [scheduleRefresh],
  )

  const retry = useCallback(() => {
    window.clearTimeout(refreshTimerRef.current)
    setData(null)
    setError(null)
    setStatus('loading')
    setFetchKey((k) => k + 1)
  }, [])

  useEffect(() => {
    const ac = new AbortController()

    fetchLibrary(ac.signal)
      .then((photos) => {
        if (ac.signal.aborted) return
        applyLibrary(photos)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        window.clearTimeout(refreshTimerRef.current)
        setData(null)
        setPlayback(EMPTY_PLAYBACK)
        const message = err instanceof Error ? err.message : 'Request failed'
        setError(message)
        setStatus('error')
      })

    return () => ac.abort()
  }, [fetchKey, applyLibrary])

  useEffect(() => {
    return () => {
      window.clearTimeout(refreshTimerRef.current)
    }
  }, [])

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
      return { ...prev, cursor: 0 }
    })
  }, [])

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
      status,
      data,
      error,
      retry,
      photos: data ?? [],
      shuffledIds,
      currentPhotoId,
      goNext,
      goPrev,
    }),
    [status, data, error, retry, shuffledIds, currentPhotoId, goNext, goPrev],
  )
}
