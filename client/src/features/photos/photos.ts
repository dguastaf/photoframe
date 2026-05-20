import { PHOTOS_PATH } from '../../../../config/api-paths'
import { api } from '../../lib/api-client'
import type { PhotoMetadata } from '../../types/api'

// Unused in this phase — reserved for a future PR that wires up the photos UI.
export const getPhotos = (): Promise<PhotoMetadata[]> => {
  return api.get<PhotoMetadata[]>(PHOTOS_PATH)
}

export const photoImageUrl = (photoId: string): string =>
  `${PHOTOS_PATH}/${encodeURIComponent(photoId)}/image`
