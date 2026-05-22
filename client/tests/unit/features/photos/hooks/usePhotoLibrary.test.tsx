import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePhotoLibrary } from '@/features/photos/hooks/usePhotoLibrary'
import type { PhotoMetadata } from '@/types/api'

function meta(id: string): PhotoMetadata {
  return { id, taken_at: '2026-04-26T11:25:59Z', folder: 'sample' }
}

describe('usePhotoLibrary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns undefined currentPhotoId for empty catalog', () => {
    const { result } = renderHook(() => usePhotoLibrary([]))
    expect(result.current.currentPhotoId).toBeUndefined()
    act(() => result.current.goNext())
    expect(result.current.currentPhotoId).toBeUndefined()
  })

  it('returns undefined currentPhotoId when photos is null', () => {
    const { result } = renderHook(() => usePhotoLibrary(null))
    expect(result.current.currentPhotoId).toBeUndefined()
    expect(result.current.photos).toEqual([])
  })

  it('goNext advances within the current shuffle', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { result } = renderHook(() =>
      usePhotoLibrary([meta('a'), meta('b'), meta('c')]),
    )
    const first = result.current.currentPhotoId
    act(() => result.current.goNext())
    expect(result.current.currentPhotoId).not.toBe(first)
    expect(['a', 'b', 'c']).toContain(result.current.currentPhotoId)
  })

  it('goNext reshuffles and resets at end of cycle', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { result } = renderHook(() =>
      usePhotoLibrary([meta('a'), meta('b')]),
    )
    act(() => result.current.goNext())
    act(() => result.current.goNext())
    expect(result.current.shuffledIds).toHaveLength(2)
    expect(result.current.currentPhotoId).toBeDefined()
  })

  it('goPrev wraps from start to last in shuffle', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { result } = renderHook(() =>
      usePhotoLibrary([meta('a'), meta('b'), meta('c')]),
    )
    const atStart = result.current.currentPhotoId
    act(() => result.current.goPrev())
    expect(result.current.currentPhotoId).not.toBe(atStart)
    expect(result.current.shuffledIds).toContain(result.current.currentPhotoId)
  })

  it('re-initializes shuffle when catalog changes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { result, rerender } = renderHook(
      ({ photos }: { photos: PhotoMetadata[] }) => usePhotoLibrary(photos),
      { initialProps: { photos: [meta('a'), meta('b')] } },
    )
    act(() => result.current.goNext())
    rerender({ photos: [meta('x'), meta('y'), meta('z')] })
    expect(result.current.shuffledIds).toHaveLength(3)
    expect(['x', 'y', 'z']).toContain(result.current.currentPhotoId)
  })

  it('exposes server-ordered photos separately from shuffledIds', () => {
    const catalog = [meta('a'), meta('b')]
    const { result } = renderHook(() => usePhotoLibrary(catalog))
    expect(result.current.photos).toEqual(catalog)
    expect(result.current.shuffledIds).toHaveLength(2)
  })
})
