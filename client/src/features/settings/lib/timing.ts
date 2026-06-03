import { DateTime, Duration } from 'luxon'

import { DEFAULT_DISPLAY_MS, LIBRARY_REFRESH_MS } from '@/client-constants'

import { MAX_DISPLAY_MS, MIN_DISPLAY_MS } from './constants'

export type DisplayDurationUnit = 'seconds' | 'minutes' | 'hours'

const UNIT_MS: Record<DisplayDurationUnit, number> = {
  hours: 3_600_000,
  minutes: 60_000,
  seconds: 1_000,
}

const UNIT_ORDER: DisplayDurationUnit[] = ['hours', 'minutes', 'seconds']

function coercePositiveInt(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }
  return Math.max(1, Math.trunc(value))
}

export function clampDisplayDurationMs(value: number): number {
  if (!Number.isFinite(value) || value < MIN_DISPLAY_MS) {
    return DEFAULT_DISPLAY_MS
  }
  return Math.min(value, MAX_DISPLAY_MS)
}

export function msToDisplayParts(ms: number): {
  value: number
  unit: DisplayDurationUnit
} {
  const clamped = clampDisplayDurationMs(ms)

  for (const unit of UNIT_ORDER) {
    const unitMs = UNIT_MS[unit]
    if (clamped % unitMs === 0) {
      const value = clamped / unitMs
      if (value >= 1) {
        return { value, unit }
      }
    }
  }

  return { value: Math.round(clamped / UNIT_MS.seconds), unit: 'seconds' }
}

export const DISPLAY_DURATION_RANGE_MESSAGE =
  'Display duration must be between 5 seconds and 24 hours.'

export function partsToRawMs(value: number, unit: DisplayDurationUnit): number {
  const n = coercePositiveInt(value)
  return Duration.fromObject({ [unit]: n }).toMillis()
}

export function isDisplayDurationMsValid(ms: number): boolean {
  return Number.isFinite(ms) && ms >= MIN_DISPLAY_MS && ms <= MAX_DISPLAY_MS
}

export function partsToMs(value: number, unit: DisplayDurationUnit): number {
  return clampDisplayDurationMs(partsToRawMs(value, unit))
}

export function msUntilNextRefresh(lastRefreshAt: string | null): number {
  if (lastRefreshAt === null) {
    return LIBRARY_REFRESH_MS
  }

  const parsed = Date.parse(lastRefreshAt)
  if (Number.isNaN(parsed)) {
    return LIBRARY_REFRESH_MS
  }

  const elapsed = Date.now() - parsed
  return Math.max(0, LIBRARY_REFRESH_MS - elapsed)
}

export function formatLastRefreshAt(iso: string | null): string {
  if (iso === null) {
    return 'Never'
  }

  const parsed = DateTime.fromISO(iso, { zone: 'utc' })
  if (!parsed.isValid) {
    return iso
  }

  const local = parsed.toLocal()

  const locale =
    typeof navigator !== 'undefined'
      ? navigator.language
      : Intl.DateTimeFormat().resolvedOptions().locale

  // Intl may insert U+202F before AM/PM on some runtimes; normalize for stable display/tests.
  return local
    .setLocale(locale)
    .toLocaleString({
      dateStyle: 'medium',
      timeStyle: 'medium',
    })
    .replace(/\u202f/g, ' ')
}
