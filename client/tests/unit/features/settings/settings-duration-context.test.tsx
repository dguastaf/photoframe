import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'

import {
  SettingsDurationProvider,
  useDisplayDuration,
} from '@/features/settings/settings-duration-context'
import { SETTINGS_STORAGE_KEY } from '@/features/settings/lib/constants'

function wrapper({ children }: { children: ReactNode }) {
  return <SettingsDurationProvider>{children}</SettingsDurationProvider>
}

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

    const { result } = renderHook(() => useDisplayDuration(), { wrapper })
    expect(result.current.displayDurationMs).toBe(12_000)
  })

  it('persists duration when updated', () => {
    const { result } = renderHook(() => useDisplayDuration(), { wrapper })

    act(() => {
      result.current.setDisplayDurationMs(8_000)
    })

    expect(result.current.displayDurationMs).toBe(8_000)
    const stored = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    )
    expect(stored.displayDurationMs).toBe(8_000)
  })

  it('shares state across hooks in the same provider', () => {
    const { result } = renderHook(
      () => {
        const first = useDisplayDuration()
        const second = useDisplayDuration()
        return { first, second }
      },
      { wrapper },
    )

    act(() => {
      result.current.first.setDisplayDurationMs(45_000)
    })

    expect(result.current.second.displayDurationMs).toBe(45_000)
  })
})
