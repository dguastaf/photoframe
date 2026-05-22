import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPhotos } from '@/features/photos/api/photos'
import { ApiError } from '@/lib/api-client'
import type { PhotoMetadata } from '@/types/api'
import { usePhotosQuery } from '@/features/photos/hooks/usePhotosQuery'

vi.mock('@/features/photos/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/photos/constants')>()
  return { ...actual, LIBRARY_REFRESH_MS: 1_000 }
})

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
  vi.useRealTimers()
})

describe('usePhotosQuery', () => {
  it('starts in loading state', () => {
    mockedGetPhotos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePhotosQuery())
    expect(result.current.status).toBe('loading')
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('becomes success with photos on success', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)
    const { result } = renderHook(() => usePhotosQuery())
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toEqual(samplePhotos)
    expect(result.current.error).toBeNull()
  })

  it('becomes error with message on failure', async () => {
    mockedGetPhotos.mockRejectedValue(
      new ApiError(503, 'Photo library unavailable', '/api/v0/photos'),
    )
    const { result } = renderHook(() => usePhotosQuery())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Photo library unavailable')
  })

  it('retry refetches the library', async () => {
    mockedGetPhotos
      .mockRejectedValueOnce(new ApiError(503, 'Temporary failure', '/api/v0/photos'))
      .mockResolvedValueOnce(samplePhotos)

    const { result } = renderHook(() => usePhotosQuery())
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => {
      result.current.retry()
    })
    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toEqual(samplePhotos)
    expect(mockedGetPhotos).toHaveBeenCalledTimes(2)
  })

  it('passes AbortSignal to getPhotos', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)
    renderHook(() => usePhotosQuery())
    await waitFor(() => expect(mockedGetPhotos).toHaveBeenCalled())
    expect(mockedGetPhotos.mock.calls[0]?.[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('refetches the library after the refresh interval', async () => {
    vi.useFakeTimers()
    const refreshed: PhotoMetadata[] = [
      { id: 'photo-2', taken_at: '2026-04-27T11:25:59Z', folder: 'new' },
    ]
    let resolveRefresh!: (value: PhotoMetadata[]) => void
    const refreshPending = new Promise<PhotoMetadata[]>((resolve) => {
      resolveRefresh = resolve
    })
    mockedGetPhotos
      .mockResolvedValueOnce(samplePhotos)
      .mockImplementationOnce(() => refreshPending)

    const { result } = renderHook(() => usePhotosQuery())

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.status).toBe('success')
    expect(mockedGetPhotos).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
      await Promise.resolve()
    })
    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual(samplePhotos)

    await act(async () => {
      resolveRefresh(refreshed)
      await Promise.resolve()
    })
    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual(refreshed)
    expect(mockedGetPhotos).toHaveBeenCalledTimes(2)
  })

  it('reschedules refresh after a manual retry', async () => {
    vi.useFakeTimers()
    mockedGetPhotos.mockResolvedValue(samplePhotos)

    const { result } = renderHook(() => usePhotosQuery())

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.status).toBe('success')

    act(() => {
      result.current.retry()
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.status).toBe('success')
    expect(mockedGetPhotos).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999)
    })
    expect(mockedGetPhotos).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await Promise.resolve()
    })
    expect(mockedGetPhotos).toHaveBeenCalledTimes(3)
  })

  it('aborts in-flight fetch on unmount', async () => {
    const signals: AbortSignal[] = []
    mockedGetPhotos.mockImplementation((init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal)
      return new Promise(() => {})
    })

    const { unmount } = renderHook(() => usePhotosQuery())
    await waitFor(() => expect(mockedGetPhotos).toHaveBeenCalledTimes(1))
    unmount()
    expect(signals[0]?.aborted).toBe(true)
  })
})
