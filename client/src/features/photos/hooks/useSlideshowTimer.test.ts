import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSlideshowTimer } from './useSlideshowTimer'

describe('useSlideshowTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls onTick after interval when enabled and not paused', () => {
    const onTick = vi.fn()
    renderHook(() =>
      useSlideshowTimer({
        onTick,
        paused: false,
        enabled: true,
        intervalMs: 100,
        resetKey: 'photo-1',
      }),
    )

    vi.advanceTimersByTime(99)
    expect(onTick).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onTick).toHaveBeenCalledTimes(1)
  })

  it('does not tick when paused', () => {
    const onTick = vi.fn()
    renderHook(() =>
      useSlideshowTimer({
        onTick,
        paused: true,
        enabled: true,
        intervalMs: 100,
        resetKey: 'photo-1',
      }),
    )

    vi.advanceTimersByTime(500)
    expect(onTick).not.toHaveBeenCalled()
  })

  it('does not tick when disabled', () => {
    const onTick = vi.fn()
    renderHook(() =>
      useSlideshowTimer({
        onTick,
        paused: false,
        enabled: false,
        intervalMs: 100,
        resetKey: 'photo-1',
      }),
    )

    vi.advanceTimersByTime(500)
    expect(onTick).not.toHaveBeenCalled()
  })

  it('restarts interval when resetKey changes', () => {
    const onTick = vi.fn()
    const { rerender } = renderHook(
      (props: { resetKey: string }) =>
        useSlideshowTimer({
          onTick,
          paused: false,
          enabled: true,
          intervalMs: 100,
          resetKey: props.resetKey,
        }),
      { initialProps: { resetKey: 'photo-1' } },
    )

    vi.advanceTimersByTime(50)
    rerender({ resetKey: 'photo-2' })
    vi.advanceTimersByTime(50)
    expect(onTick).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50)
    expect(onTick).toHaveBeenCalledTimes(1)
  })

  it('clears interval on unmount', () => {
    const onTick = vi.fn()
    const { unmount } = renderHook(() =>
      useSlideshowTimer({
        onTick,
        paused: false,
        enabled: true,
        intervalMs: 100,
        resetKey: 'photo-1',
      }),
    )

    unmount()
    vi.advanceTimersByTime(200)
    expect(onTick).not.toHaveBeenCalled()
  })
})
