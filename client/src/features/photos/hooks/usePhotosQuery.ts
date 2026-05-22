import { useCallback, useEffect } from 'react'
import { getPhotos } from '../api/photos'
import { LIBRARY_REFRESH_MS } from '../constants'
import { ApiError } from '../../../lib/api-client'
import { useAsyncResource } from '../../../hooks/useAsyncResource'

export function usePhotosQuery() {
  const run = useCallback(async (signal: AbortSignal) => {
    try {
      return await getPhotos({ signal })
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.detail : 'Failed to load photo library'
      throw new Error(message)
    }
  }, [])

  const { status, data, error, retry } = useAsyncResource(run)

  useEffect(() => {
    if (status !== 'success') return

    const id = window.setTimeout(() => {
      retry()
    }, LIBRARY_REFRESH_MS)

    return () => window.clearTimeout(id)
  }, [status, data, retry])

  return { status, data, error, retry }
}
