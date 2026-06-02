import { DEFAULT_DISPLAY_MS } from '@/client-constants'

export type SettingsStateV0 = {
  version: 0
  displayDurationMs: number
  lastRefreshAt: string | null
  dailyRefreshTime: string | null
}

export function defaultSettings(): SettingsStateV0 {
  return {
    version: 0,
    displayDurationMs: DEFAULT_DISPLAY_MS,
    lastRefreshAt: null,
    dailyRefreshTime: null,
  }
}
