import { useEffect } from "react";
import { createPhotoUrlFromId } from "../api/photos";
import { Image } from "expo-image";

export function usePrefetchImage(photoId: string | undefined): void {
  useEffect(() => {
    if (photoId === undefined) return;

    Image.prefetch(createPhotoUrlFromId(photoId))
  }, [photoId])

}
