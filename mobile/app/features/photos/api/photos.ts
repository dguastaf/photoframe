import { api, BASE_URL } from '@/lib/api-client';
import type { Photo } from '@/types/model';
import type { ApiError } from '@/lib/api-client';

const PHOTOS_PATH = '/api/v0/photos';

/** Rejects with {@link ApiError} (network or HTTP error from the Photoframe API). */
export type PhotosFetchError = ApiError;

export const getPhotos = (init?: RequestInit): Promise<Photo[]> => {
  return api.get<Photo[]>(PHOTOS_PATH, init);
};

export const createPhotoUrl = (photo: Photo): string =>
  `${BASE_URL}${PHOTOS_PATH}/${encodeURIComponent(photo.id)}/image`;
