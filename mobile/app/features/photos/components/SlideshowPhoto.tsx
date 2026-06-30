import { Photo } from "@/types/model";
import { Image } from "react-native";
import { createPhotoUrl } from "../api/photos";

interface SlideshowPhotoProps {
  photo: Photo;
}

export default function SlideshowPhoto({ photo }: SlideshowPhotoProps) {
  return (
    <Image
      accessibilityRole="image"
      alt={`Photo from ${photo.folder}, taken ${photo.taken_at}`}
      source={{ uri: createPhotoUrl(photo) }}
      style={{ width: "100%", height: "100%" }}
      resizeMode="cover"
    />
  );
}
