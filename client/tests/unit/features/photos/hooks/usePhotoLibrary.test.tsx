import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPhotos } from '@/features/photos/api/photos'
import { usePhotoLibrary, peekNextPhotoId } from '@/features/photos/hooks/usePhotoLibrary'
import * as shuffleLib from '@/features/photos/lib/shuffle'
import { SETTINGS_STORAGE_KEY } from '@/features/settings/lib/constants'
import { ApiError } from '@/lib/api-client'
import type { Photo } from '@/types/api'
import { testPhoto } from '../../../../support/photo'

vi.mock('@/client-constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/client-constants')>()
  return { ...actual, LIBRARY_REFRESH_MS: 1_000 }
})

vi.mock('@/features/photos/api/photos', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/photos/api/photos')>()
  return { ...actual, getPhotos: vi.fn() }
})

const mockedGetPhotos = vi.mocked(getPhotos)

function meta(id: string): Photo {
  return testPhoto({
    id,
    taken_at: '2026-04-26T11:25:59+00:00',
    folder: 'sample',
  })
}

const samplePhotos: Photo[] = [meta('photo-1')]

const catalogThree = [meta('a'), meta('b'), meta('c')]

beforeEach(() => {
  mockedGetPhotos.mockReset()
  window.localStorage.removeItem(SETTINGS_STORAGE_KEY)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('peekNextPhotoId', () => {
  it('returns undefined for empty shuffle', () => {
    expect(peekNextPhotoId([], 0)).toBeUndefined()
  })

  it('returns the only id for a single-photo catalog', () => {
    expect(peekNextPhotoId(['solo'], 0)).toBe('solo')
  })

  it('returns the next id in order', () => {
    expect(peekNextPhotoId(['a', 'b', 'c'], 0)).toBe('b')
    expect(peekNextPhotoId(['a', 'b', 'c'], 1)).toBe('c')
  })

  it('wraps to index 0 at end of shuffle', () => {
    expect(peekNextPhotoId(['a', 'b', 'c'], 2)).toBe('a')
  })
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
    const refreshed: Photo[] = [meta('photo-2')]
    let resolveRefresh!: (value: Photo[]) => void
    const refreshPending = new Promise<Photo[]>((resolve) => {
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

  it('exposes nextPhotoId matching peekNextPhotoId', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue(catalogThree)
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.currentPhotoId).toBeDefined())
    expect(result.current.nextPhotoId).toBe(
      peekNextPhotoId(result.current.shuffledIds, 0),
    )
    act(() => result.current.goNext())
    expect(result.current.nextPhotoId).toBe(
      peekNextPhotoId(result.current.shuffledIds, 1),
    )
  })

  it('updates nextPhotoId after refetch reshuffle', async () => {
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
    expect(result.current.nextPhotoId).toBe('b')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
      await Promise.resolve()
    })

    expect(result.current.currentPhotoId).toBe('b')
    expect(result.current.nextPhotoId).toBe('a')
    expect(shuffleSpy).toHaveBeenCalledTimes(2)
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

  it('persists lastRefreshAt after successful fetch', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)
    renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(mockedGetPhotos).toHaveBeenCalled())

    const stored = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    )
    expect(typeof stored.lastRefreshAt).toBe('string')
    expect(Number.isNaN(Date.parse(stored.lastRefreshAt))).toBe(false)
  })

  it('does not update lastRefreshAt when background refresh fails', async () => {
    vi.useFakeTimers()
    mockedGetPhotos
      .mockResolvedValueOnce(samplePhotos)
      .mockRejectedValueOnce(new Error('network'))

    renderHook(() => usePhotoLibrary())

    await act(async () => {
      await Promise.resolve()
    })

    const afterSuccess = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    ).lastRefreshAt

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
      await Promise.resolve()
    })

    const afterFailure = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    ).lastRefreshAt
    expect(afterFailure).toBe(afterSuccess)
  })

  it('schedules next refresh from updated lastRefreshAt without immediate refetch', async () => {
    vi.useFakeTimers()
    const overdue = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 0,
        displayDurationMs: 60_000,
        lastRefreshAt: overdue,
        dailyRefreshTime: null,
      }),
    )
    mockedGetPhotos.mockResolvedValue(samplePhotos)

    renderHook(() => usePhotoLibrary())

    await act(async () => {
      await Promise.resolve()
    })
    expect(mockedGetPhotos).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999)
    })
    expect(mockedGetPhotos).toHaveBeenCalledTimes(1)
  })

  it('exposes lastRefreshAt after successful fetch', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('success'))

    expect(result.current.lastRefreshAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('syncNow triggers a second fetch', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)
    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('success'))

    act(() => {
      result.current.syncNow()
    })
    await waitFor(() => expect(mockedGetPhotos).toHaveBeenCalledTimes(2))
    expect(result.current.lastRefreshAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('does not update lastRefreshAt when syncNow fails', async () => {
    mockedGetPhotos
      .mockResolvedValueOnce(samplePhotos)
      .mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('success'))

    const before = result.current.lastRefreshAt

    act(() => {
      result.current.syncNow()
    })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.lastRefreshAt).toBe(before)
  })

  it('sets isSyncing during syncNow fetch', async () => {
    let resolveSecond: (photos: Photo[]) => void = () => {}
    mockedGetPhotos
      .mockResolvedValueOnce(samplePhotos)
      .mockImplementationOnce(
        () =>
          new Promise<Photo[]>((resolve) => {
            resolveSecond = resolve
          }),
      )

    const { result } = renderHook(() => usePhotoLibrary())
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.isSyncing).toBe(false)

    act(() => {
      result.current.syncNow()
    })
    await waitFor(() => expect(result.current.isSyncing).toBe(true))

    await act(async () => {
      resolveSecond(samplePhotos)
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.isSyncing).toBe(false))
  })
})
