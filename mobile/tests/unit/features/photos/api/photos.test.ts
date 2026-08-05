import { getPhotos, createPhotoUrl, createPhotoUrlFromId } from '@/features/photos/api/photos';
import type { Photo } from '@/types/model';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getPhotos', () => {
  it('fetches from /api/v0/photos and returns photo array', async () => {
    const photos = [{ id: 'abc', taken_at: '2026-01-01T00:00:00Z', folder: 'vacation' }];
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(photos), { status: 200 }));

    const result = await getPhotos();
    expect(result).toEqual(photos);
  });

  it('passes RequestInit options through to fetch', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    const ac = new AbortController();
    await getPhotos({ signal: ac.signal });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/v0/photos'),
      expect.objectContaining({ signal: ac.signal }),
    );
  });
});

describe('createPhotoUrl', () => {
  const photo = (id: string): Photo => ({
    id,
    taken_at: '2026-01-01T00:00:00Z',
    folder: 'vacation',
  });

  it('builds absolute image URL with encoded photo ID', () => {
    const url = createPhotoUrl(photo('photo-123'));
    expect(url).toContain('/api/v0/photos/photo-123/image');
  });

  it('encodes special characters in photo ID', () => {
    const url = createPhotoUrl(photo('photo/with spaces'));
    expect(url).toContain('/api/v0/photos/photo%2Fwith%20spaces/image');
  });
});

describe('createPhotoUrlFromId', () => {
  it('builds absolute image URL with encoded photo ID', () => {
    const url = createPhotoUrlFromId('photo-123');
    expect(url).toContain('/api/v0/photos/photo-123/image');
  });

  it('encodes special characters in photo ID', () => {
    const url = createPhotoUrlFromId('photo/with spaces');
    expect(url).toContain('/api/v0/photos/photo%2Fwith%20spaces/image');
  });
});
