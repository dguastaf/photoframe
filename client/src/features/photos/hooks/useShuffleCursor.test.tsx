import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useShuffleCursor } from './useShuffleCursor'

describe('useShuffleCursor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns undefined currentId for empty ids', () => {
    const { result } = renderHook(() => useShuffleCursor([]))
    expect(result.current.currentId).toBeUndefined()
    act(() => result.current.goNext())
    expect(result.current.currentId).toBeUndefined()
  })

  it('goNext advances within the current order', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { result } = renderHook(() => useShuffleCursor(['a', 'b', 'c']))
    const first = result.current.currentId
    act(() => result.current.goNext())
    expect(result.current.currentId).not.toBe(first)
    expect(['a', 'b', 'c']).toContain(result.current.currentId)
  })

  it('goNext reshuffles and resets at end of cycle', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { result } = renderHook(() => useShuffleCursor(['a', 'b']))
    act(() => result.current.goNext())
    act(() => result.current.goNext())
    expect(result.current.cursor).toBe(0)
    expect(result.current.order).toHaveLength(2)
  })

  it('goPrev wraps from index 0 to last', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { result } = renderHook(() => useShuffleCursor(['a', 'b', 'c']))
    const atStart = result.current.currentId
    act(() => result.current.goPrev())
    expect(result.current.currentId).not.toBe(atStart)
    expect(result.current.cursor).toBe(result.current.order.length - 1)
  })

  it('re-initializes when photo ids change', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useShuffleCursor(ids),
      { initialProps: { ids: ['a', 'b'] } },
    )
    act(() => result.current.goNext())
    rerender({ ids: ['x', 'y', 'z'] })
    expect(result.current.cursor).toBe(0)
    expect(result.current.order).toHaveLength(3)
    expect(['x', 'y', 'z']).toContain(result.current.currentId)
  })
})
