import { Photo } from '@/types/model';
import SlideshowImage from './SlideshowPhoto';
import StatusMessage from './StatusMessage';

interface SlideshowProps {
  photos: Photo[];
}

// For now, just pick a random photo to display. In the future, we will cycle through all photos
function pickRandomPhoto(photos: Photo[]): Photo {
  const randomIndex = Math.floor(Math.random() * photos.length);
  return photos[randomIndex];
}

export default function Slideshow({ photos }: SlideshowProps) {
  return photos.length === 0 ? (
    <StatusMessage message="No photos available" />
  ) : (
    <SlideshowImage photo={pickRandomPhoto(photos)} />
  );
}
