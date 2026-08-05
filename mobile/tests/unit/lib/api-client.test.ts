import { ApiError, api } from '@/lib/api-client';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ApiError', () => {
  it('exposes status, detail, url, and network failure flag', () => {
    const err = new ApiError(503, 'Service unavailable', '/api/v0/photos');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(503);
    expect(err.detail).toBe('Service unavailable');
    expect(err.url).toBe('/api/v0/photos');
    expect(err.isNetworkFailure).toBe(false);
    expect(new ApiError(0, 'Network error', '/x').isNetworkFailure).toBe(true);
  });
});

describe('api.get', () => {
  it('returns JSON on success', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([{ id: 'a' }]), { status: 200 }));

    const data = await api.get<{ id: string }[]>('/api/v0/photos');
    expect(data).toEqual([{ id: 'a' }]);
  });

  it('prepends BASE_URL to fetch path', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    await api.get('/api/v0/photos');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/v0/photos'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws ApiError with string detail from FastAPI body', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Photo library unavailable' }), {
        status: 503,
      }),
    );

    await expect(api.get('/api/v0/photos')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      detail: 'Photo library unavailable',
    });
  });

  it('throws ApiError on network failure', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api.get('/api/v0/photos')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      detail: 'Network error',
    });
  });

  it('rethrows AbortError without wrapping as ApiError', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(abort);

    await expect(api.get('/api/v0/photos')).rejects.toBe(abort);
  });

  it('passes AbortSignal to fetch', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    const ac = new AbortController();
    await api.get('/api/v0/photos', { signal: ac.signal });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'GET', signal: ac.signal }),
    );
  });
});
