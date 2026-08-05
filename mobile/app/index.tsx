import { StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { getPhotos } from '@/features/photos/api/photos';
import type { Photo } from '@/types/model';
import Slideshow from './features/photos/components/Slideshow';

export default function SlideshowScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    async function fetchPhotos() {
      try {
        const result = await getPhotos();
        setPhotos(result);
      } catch (err) {
        console.error('Failed to fetch photos:', err);
      }
    }
    fetchPhotos();
  }, []);

  return (
    <View style={styles.container}>
      <Slideshow photos={photos} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
