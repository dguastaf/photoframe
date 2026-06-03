import { DateTime } from 'luxon'

import { SETTINGS_STORAGE_KEY } from './constants'
import { clampDisplayDurationMs } from './timing'
import { defaultSettings, type SettingsStateV0 } from './types'

function isSettingsStateV0(value: unknown): value is SettingsStateV0 {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    record.version === 0 &&
    typeof record.displayDurationMs === 'number' &&
    (record.lastRefreshAt === null || typeof record.lastRefreshAt === 'string') &&
    (record.dailyRefreshTime === null ||
      typeof record.dailyRefreshTime === 'string')
  )
}

function normalizeDailyRefreshTime(value: string | null | undefined): string | null {
  if (value == null) {
    return null
  }
  const parsed = DateTime.fromFormat(value, 'HH:mm')
  if (!parsed.isValid) {
    return null
  }
  return parsed.toFormat('HH:mm')
}

function normalizeLoaded(state: SettingsStateV0): SettingsStateV0 {
  return {
    version: 0,
    displayDurationMs: clampDisplayDurationMs(state.displayDurationMs),
    lastRefreshAt: state.lastRefreshAt,
    dailyRefreshTime: normalizeDailyRefreshTime(state.dailyRefreshTime),
  }
}

export function loadSettings(): SettingsStateV0 {
  if (typeof window === 'undefined') {
    return defaultSettings()
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw === null) {
      return defaultSettings()
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isSettingsStateV0(parsed)) {
      return defaultSettings()
    }
    return normalizeLoaded(parsed)
  } catch {
    console.warn('photoframe: failed to read settings from localStorage')
    return defaultSettings()
  }
}

export function saveSettings(partial: Partial<SettingsStateV0>): SettingsStateV0 {
  const merged = normalizeLoaded({
    ...loadSettings(),
    ...partial,
    version: 0,
  })

  if (typeof window === 'undefined') {
    return merged
  }

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged))
  } catch {
    console.warn('photoframe: failed to write settings to localStorage')
  }

  return merged
}
