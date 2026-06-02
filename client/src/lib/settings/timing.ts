import { DEFAULT_DISPLAY_MS, LIBRARY_REFRESH_MS } from '@/client-constants'

import { MAX_DISPLAY_MS, MIN_DISPLAY_MS } from './constants'

export function clampDisplayDurationMs(value: number): number {
  if (!Number.isFinite(value) || value < MIN_DISPLAY_MS) {
    return DEFAULT_DISPLAY_MS
  }
  return Math.min(value, MAX_DISPLAY_MS)
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
