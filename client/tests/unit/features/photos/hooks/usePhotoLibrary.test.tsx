import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPhotos } from '@/features/photos/api/photos'
import { ApiError } from '@/lib/api-client'
import type { PhotoMetadata } from '@/types/api'
import { usePhotoLibrary } from '@/features/photos/hooks/usePhotoLibrary'

vi.mock('@/features/photos/api/photos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/photos/api/photos')>()
  return { ...actual, getPhotos: vi.fn() }
})

const mockedGetPhotos = vi.mocked(getPhotos)

const samplePhotos: PhotoMetadata[] = [
  { id: 'photo-1', taken_at: '2026-04-26T11:25:59Z', folder: 'sample' },
]

beforeEach(() => {
  mockedGetPhotos.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('usePhotoLibrary', () => {
  it('starts in loading state', () => {
    mockedGetPhotos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePhotoLibrary())
    expect(result.current.status).toBe('loading')
    expect(result.current.photos).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('becomes ready with photos on success', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.photos).toEqual(samplePhotos)
    expect(result.current.error).toBeNull()
  })

  it('becomes error with message on failure', async () => {
    mockedGetPhotos.mockRejectedValue(
      new ApiError(503, 'Photo library unavailable', '/api/v0/photos'),
    )
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.photos).toBeNull()
    expect(result.current.error).toBe('Photo library unavailable')
  })

  it('retry refetches the library', async () => {
    mockedGetPhotos
      .mockRejectedValueOnce(new ApiError(503, 'Temporary failure', '/api/v0/photos'))
      .mockResolvedValueOnce(samplePhotos)

    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => {
      result.current.retry()
    })
    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.photos).toEqual(samplePhotos)
    expect(mockedGetPhotos).toHaveBeenCalledTimes(2)
  })

  it('passes AbortSignal to getPhotos', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)
    renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(mockedGetPhotos).toHaveBeenCalled())
    expect(mockedGetPhotos.mock.calls[0]?.[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('aborts in-flight fetch on unmount', async () => {
    const signals: AbortSignal[] = []
    mockedGetPhotos.mockImplementation((init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal)
      return new Promise(() => {})
    })

    const { unmount } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(mockedGetPhotos).toHaveBeenCalledTimes(1))
    unmount()
    expect(signals[0]?.aborted).toBe(true)
  })
})
