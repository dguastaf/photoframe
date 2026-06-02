import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SETTINGS_STORAGE_KEY } from '@/lib/settings/constants'
import { useDisplayDuration } from '@/features/settings/hooks/use-display-duration'

describe('useDisplayDuration', () => {
  beforeEach(() => {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY)
  })

  it('loads duration from localStorage', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 0,
        displayDurationMs: 12_000,
        lastRefreshAt: null,
        dailyRefreshTime: null,
      }),
    )

    const { result } = renderHook(() => useDisplayDuration())
    expect(result.current.displayDurationMs).toBe(12_000)
  })

  it('persists duration when updated', () => {
    const { result } = renderHook(() => useDisplayDuration())

    act(() => {
      result.current.setDisplayDurationMs(8_000)
    })

    expect(result.current.displayDurationMs).toBe(8_000)
    const stored = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    )
    expect(stored.displayDurationMs).toBe(8_000)
  })
})
