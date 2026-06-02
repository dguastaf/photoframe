import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_DISPLAY_MS, LIBRARY_REFRESH_MS } from '@/client-constants'
import { MAX_DISPLAY_MS, MIN_DISPLAY_MS } from '@/lib/settings/constants'
import { clampDisplayDurationMs, msUntilNextRefresh } from '@/lib/settings/timing'

describe('clampDisplayDurationMs', () => {
  it('returns default for non-finite values', () => {
    expect(clampDisplayDurationMs(Number.NaN)).toBe(DEFAULT_DISPLAY_MS)
    expect(clampDisplayDurationMs(Number.POSITIVE_INFINITY)).toBe(DEFAULT_DISPLAY_MS)
  })

  it('returns default when below minimum', () => {
    expect(clampDisplayDurationMs(MIN_DISPLAY_MS - 1)).toBe(DEFAULT_DISPLAY_MS)
  })

  it('clamps to maximum', () => {
    expect(clampDisplayDurationMs(MAX_DISPLAY_MS + 1)).toBe(MAX_DISPLAY_MS)
  })

  it('passes through valid values', () => {
    expect(clampDisplayDurationMs(30_000)).toBe(30_000)
  })
})

describe('msUntilNextRefresh', () => {
  it('returns full interval when last refresh is null', () => {
    expect(msUntilNextRefresh(null)).toBe(LIBRARY_REFRESH_MS)
  })

  it('returns full interval for invalid timestamp', () => {
    expect(msUntilNextRefresh('not-a-date')).toBe(LIBRARY_REFRESH_MS)
  })

  it('returns remaining time until next refresh', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-02T12:00:00.000Z'))

    const last = '2026-06-02T11:00:00.000Z'
    expect(msUntilNextRefresh(last)).toBe(LIBRARY_REFRESH_MS - 3_600_000)

    vi.useRealTimers()
  })

  it('returns zero when refresh is overdue', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-03T12:00:00.000Z'))

    const last = '2026-06-01T12:00:00.000Z'
    expect(msUntilNextRefresh(last)).toBe(0)

    vi.useRealTimers()
  })
})
