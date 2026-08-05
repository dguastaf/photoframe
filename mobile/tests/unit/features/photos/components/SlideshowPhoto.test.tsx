import { render, screen } from '@testing-library/react-native';

import SlideshowPhoto from '@/features/photos/components/SlideshowPhoto';
import type { Photo } from '@/types/model';

test('renders an image sourced from the photo URL', async () => {
  const photo: Photo = { id: 'xyz', taken_at: '2026-01-01T00:00:00Z', folder: 'vacation' };
  await render(<SlideshowPhoto photo={photo} />);

  const image = screen.getByRole('img', {
    name: 'Photo from vacation, taken 2026-01-01T00:00:00Z',
  });
  expect(image.props.source.uri).toContain('/api/v0/photos/xyz/image');
});
