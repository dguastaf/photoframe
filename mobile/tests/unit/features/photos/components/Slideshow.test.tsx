import { render, screen } from '@testing-library/react-native';

import Slideshow from '@/features/photos/components/Slideshow';
import type { Photo } from '@/types/model';

const photo = (id: string): Photo => ({ id, taken_at: '2026-01-01T00:00:00Z', folder: 'vacation' });

test('shows a status message when there are no photos', async () => {
  await render(<Slideshow photos={[]} />);

  expect(screen.getByText('No photos available')).toBeTruthy();
});

test('renders a photo image when photos are present', async () => {
  await render(<Slideshow photos={[photo('abc')]} />);

  const image = screen.getByRole('img');
  expect(image.props.source.uri).toContain('/api/v0/photos/abc/image');
});

test('renders one of the provided photos when there are several', async () => {
  const photos = [photo('a'), photo('b'), photo('c')];
  await render(<Slideshow photos={photos} />);

  const image = screen.getByRole('img');
  const ids = photos.map((p) => p.id);
  const renderedId = ids.find((id) => image.props.source.uri.includes(`/${id}/image`));
  expect(renderedId).toBeDefined();
});
