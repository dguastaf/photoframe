import { PHOTOS_PATH } from '../../../../../config/api-paths'
import { api, type ApiError } from '../../../lib/api-client'
import type { Photo } from '../../../types/api'

/** Rejects with {@link ApiError} (network or HTTP error from the Photoframe API). */
export type PhotosFetchError = ApiError

export const getPhotos = (init?: RequestInit): Promise<Photo[]> => {
  return api.get<Photo[]>(PHOTOS_PATH, init)
}

export const photoImageUrl = (photoId: string): string =>
  `${PHOTOS_PATH}/${encodeURIComponent(photoId)}/image`
