import { useCallback } from 'react'
import { getPhotos } from '../api/photos'
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

  return useAsyncResource(run)
}
