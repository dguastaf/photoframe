import { Settings } from 'luxon'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_DISPLAY_MS, LIBRARY_REFRESH_MS } from '@/client-constants'
import { MAX_DISPLAY_MS, MIN_DISPLAY_MS } from '@/features/settings/lib/constants'
import {
  clampDisplayDurationMs,
  formatLastRefreshAt,
  isDisplayDurationMsValid,
  msToDisplayParts,
  msUntilNextRefresh,
  partsToMs,
  partsToRawMs,
} from '@/features/settings/lib/timing'

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

describe('msToDisplayParts', () => {
  it('maps 60_000 ms to 1 minute', () => {
    expect(msToDisplayParts(60_000)).toEqual({ value: 1, unit: 'minutes' })
  })

  it('maps 3_600_000 ms to 1 hour', () => {
    expect(msToDisplayParts(3_600_000)).toEqual({ value: 1, unit: 'hours' })
  })

  it('maps 90_000 ms to 90 seconds when no exact hour or minute', () => {
    expect(msToDisplayParts(90_000)).toEqual({ value: 90, unit: 'seconds' })
  })
})

describe('partsToRawMs and isDisplayDurationMsValid', () => {
  it('rejects 2 seconds as below minimum', () => {
    expect(partsToRawMs(2, 'seconds')).toBe(2_000)
    expect(isDisplayDurationMsValid(2_000)).toBe(false)
  })

  it('accepts 5 seconds at minimum', () => {
    expect(isDisplayDurationMsValid(partsToRawMs(5, 'seconds'))).toBe(true)
  })

  it('rejects above maximum', () => {
    expect(isDisplayDurationMsValid(partsToRawMs(25, 'hours'))).toBe(false)
  })
})

describe('partsToMs', () => {
  it('truncates fractional values before conversion', () => {
    expect(partsToMs(1.9, 'minutes')).toBe(60_000)
  })

  it('clamps to minimum display duration', () => {
    expect(partsToMs(1, 'seconds')).toBe(DEFAULT_DISPLAY_MS)
  })

  it('clamps to maximum display duration', () => {
    expect(partsToMs(25, 'hours')).toBe(MAX_DISPLAY_MS)
  })

  it('round-trips whole-minute values', () => {
    expect(partsToMs(5, 'minutes')).toBe(300_000)
  })
})

describe('formatLastRefreshAt', () => {
  beforeEach(() => {
    Settings.defaultZone = 'America/Los_Angeles'
  })

  afterEach(() => {
    Settings.defaultZone = 'system'
  })

  it('returns Never for null', () => {
    expect(formatLastRefreshAt(null)).toBe('Never')
  })

  it('returns raw string for invalid ISO', () => {
    expect(formatLastRefreshAt('not-a-date')).toBe('not-a-date')
  })

  it('formats UTC instants in local time with seconds', () => {
    // 2026-06-03 15:31:45 UTC → 8:31:45 AM PDT (UTC-7)
    const formatted = formatLastRefreshAt('2026-06-03T15:31:45.000Z')
    expect(formatted).toMatch(/8:31:45/)
    expect(formatted).toMatch(/AM/i)
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
