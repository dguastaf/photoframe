// mobile/tests/unit/features/photos/hooks/usePrefetchImage.test.ts
import { renderHook } from '@testing-library/react-native';
import { Image } from 'expo-image';

import { createPhotoUrlFromId } from '@/features/photos/api/photos';
import { usePrefetchImage } from '@/features/photos/hooks/usePrefetchImage';

jest.mock('expo-image', () => ({
  Image: { prefetch: jest.fn() },
}));

const mockedPrefetch = jest.mocked(Image.prefetch);

afterEach(() => {
  jest.clearAllMocks();
});

describe('usePrefetchImage', () => {
  it('does nothing when photoId is undefined', () => {
    renderHook(() => usePrefetchImage(undefined));
    expect(mockedPrefetch).not.toHaveBeenCalled();
  });

  it('prefetches via photoImageUrl when photoId is defined', async () => {
    await renderHook(() => usePrefetchImage('prefetch-photo-abc'));
    expect(mockedPrefetch).toHaveBeenCalledTimes(1);
    expect(mockedPrefetch).toHaveBeenCalledWith(createPhotoUrlFromId('prefetch-photo-abc'));
  });

  it('prefetches again when photoId changes', async () => {
    const { rerender } = await renderHook(
      ({ id }: { id: string | undefined }) => usePrefetchImage(id),
      { initialProps: { id: 'prefetch-photo-a' as string | undefined } },
    );
    expect(mockedPrefetch).toHaveBeenCalledWith(createPhotoUrlFromId('prefetch-photo-a'));

    await rerender({ id: 'prefetch-photo-b' });
    expect(mockedPrefetch).toHaveBeenCalledWith(createPhotoUrlFromId('prefetch-photo-b'));
    expect(mockedPrefetch).toHaveBeenCalledTimes(2);
  });
});
