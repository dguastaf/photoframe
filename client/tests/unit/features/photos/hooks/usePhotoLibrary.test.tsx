import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPhotos } from '@/features/photos/api/photos'
import { usePhotoLibrary } from '@/features/photos/hooks/usePhotoLibrary'
import * as shuffleLib from '@/features/photos/lib/shuffle'
import { ApiError } from '@/lib/api-client'
import type { PhotoMetadata } from '@/types/api'

vi.mock('@/features/photos/constants', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/photos/constants')>()
  return { ...actual, LIBRARY_REFRESH_MS: 1_000 }
})

vi.mock('@/features/photos/api/photos', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/photos/api/photos')>()
  return { ...actual, getPhotos: vi.fn() }
})

const mockedGetPhotos = vi.mocked(getPhotos)

function meta(id: string): PhotoMetadata {
  return { id, taken_at: '2026-04-26T11:25:59Z', folder: 'sample' }
}

const samplePhotos: PhotoMetadata[] = [meta('photo-1')]

const catalogThree = [meta('a'), meta('b'), meta('c')]

beforeEach(() => {
  mockedGetPhotos.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('usePhotoLibrary', () => {
  it('starts in loading state', () => {
    mockedGetPhotos.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePhotoLibrary())
    expect(result.current.status).toBe('loading')
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('becomes success with photos on success', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toEqual(samplePhotos)
    expect(result.current.currentPhotoId).toBeDefined()
  })

  it('becomes error with message on failure', async () => {
    mockedGetPhotos.mockRejectedValue(
      new ApiError(503, 'Photo library unavailable', '/api/v0/photos'),
    )
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Photo library unavailable')
  })

  it('retry refetches the library', async () => {
    mockedGetPhotos
      .mockRejectedValueOnce(
        new ApiError(503, 'Temporary failure', '/api/v0/photos'),
      )
      .mockResolvedValueOnce(samplePhotos)

    const { result } = renderHook(() => usePhotoLibrary())
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
    renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(mockedGetPhotos).toHaveBeenCalled())
    expect(mockedGetPhotos.mock.calls[0]?.[0]?.signal).toBeInstanceOf(
      AbortSignal,
    )
  })

  it('refetches the library after the refresh interval', async () => {
    vi.useFakeTimers()
    const refreshed: PhotoMetadata[] = [meta('photo-2')]
    let resolveRefresh!: (value: PhotoMetadata[]) => void
    const refreshPending = new Promise<PhotoMetadata[]>((resolve) => {
      resolveRefresh = resolve
    })
    mockedGetPhotos
      .mockResolvedValueOnce(samplePhotos)
      .mockImplementationOnce(() => refreshPending)

    const { result } = renderHook(() => usePhotoLibrary())

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

    const { result } = renderHook(() => usePhotoLibrary())

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

  it('reshuffles after refresh even when catalog ids are unchanged', async () => {
    vi.useFakeTimers()
    const catalog = [meta('a'), meta('b')]
    mockedGetPhotos.mockResolvedValue(catalog)

    const shuffleSpy = vi
      .spyOn(shuffleLib, 'shuffle')
      .mockReturnValueOnce(['a', 'b'])
      .mockReturnValueOnce(['b', 'a'])

    const { result } = renderHook(() => usePhotoLibrary())

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.status).toBe('success')
    expect(shuffleSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
      await Promise.resolve()
    })
    expect(mockedGetPhotos).toHaveBeenCalledTimes(2)
    expect(shuffleSpy).toHaveBeenCalledTimes(2)
    expect(result.current.shuffledIds).toEqual(['b', 'a'])
    expect(result.current.currentPhotoId).toBe('b')
  })

  it('clears playback and surfaces error on silent refresh failure', async () => {
    vi.useFakeTimers()
    mockedGetPhotos
      .mockResolvedValueOnce(catalogThree)
      .mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => usePhotoLibrary())

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.status).toBe('success')
    expect(result.current.currentPhotoId).toBeDefined()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
      await Promise.resolve()
    })
    expect(mockedGetPhotos).toHaveBeenCalledTimes(2)

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Failed to load photo library')
    expect(result.current.data).toBeNull()
    expect(result.current.currentPhotoId).toBeUndefined()
    expect(result.current.shuffledIds).toEqual([])
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

  it('returns undefined currentPhotoId for empty catalog', async () => {
    mockedGetPhotos.mockResolvedValue([])
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.currentPhotoId).toBeUndefined()
    act(() => result.current.goNext())
    expect(result.current.currentPhotoId).toBeUndefined()
  })

  it('goNext composes when called twice before re-render', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue(catalogThree)
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.currentPhotoId).toBeDefined())
    const first = result.current.currentPhotoId
    act(() => {
      result.current.goNext()
      result.current.goNext()
    })
    const third = result.current.shuffledIds[2]
    expect(result.current.currentPhotoId).toBe(third)
    expect(result.current.currentPhotoId).not.toBe(first)
  })

  it('goNext advances within the current shuffle', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue(catalogThree)
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.currentPhotoId).toBeDefined())
    const first = result.current.currentPhotoId
    act(() => result.current.goNext())
    expect(result.current.currentPhotoId).not.toBe(first)
    expect(['a', 'b', 'c']).toContain(result.current.currentPhotoId)
  })

  it('goNext wraps to the first slide at end of cycle', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue([meta('a'), meta('b')])
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.currentPhotoId).toBeDefined())
    const order = result.current.shuffledIds
    const first = result.current.currentPhotoId
    act(() => result.current.goNext())
    act(() => result.current.goNext())
    expect(result.current.shuffledIds).toBe(order)
    expect(result.current.currentPhotoId).toBe(first)
  })

  it('goPrev wraps from start to last in shuffle', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue(catalogThree)
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.currentPhotoId).toBeDefined())
    const atStart = result.current.currentPhotoId
    act(() => result.current.goPrev())
    expect(result.current.currentPhotoId).not.toBe(atStart)
    expect(result.current.shuffledIds).toContain(result.current.currentPhotoId)
  })

  it('exposes server-ordered photos separately from shuffledIds', async () => {
    const catalog = [meta('a'), meta('b')]
    mockedGetPhotos.mockResolvedValue(catalog)
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.photos).toEqual(catalog)
    expect(result.current.shuffledIds).toHaveLength(2)
  })
})
