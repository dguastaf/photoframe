import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_DISPLAY_MS } from '@/client-constants'
import { SETTINGS_STORAGE_KEY } from '@/lib/settings/constants'
import { loadSettings, saveSettings } from '@/lib/settings/storage'
import { defaultSettings } from '@/lib/settings/types'

describe('settings-storage', () => {
  beforeEach(() => {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns defaults when storage is empty', () => {
    expect(loadSettings()).toEqual(defaultSettings())
  })

  it('round-trips valid settings', () => {
    saveSettings({ displayDurationMs: 30_000, lastRefreshAt: '2026-06-01T00:00:00.000Z' })
    expect(loadSettings().displayDurationMs).toBe(30_000)
    expect(loadSettings().lastRefreshAt).toBe('2026-06-01T00:00:00.000Z')
  })

  it('returns defaults for corrupt JSON', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json')
    expect(loadSettings()).toEqual(defaultSettings())
  })

  it('returns defaults for unknown version', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 99, displayDurationMs: 1 }),
    )
    expect(loadSettings()).toEqual(defaultSettings())
  })

  it('warns and returns defaults when localStorage.getItem throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(loadSettings()).toEqual(defaultSettings())
    expect(console.warn).toHaveBeenCalled()
  })

  it('warns when localStorage.setItem throws', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const result = saveSettings({ displayDurationMs: 45_000 })
    expect(result.displayDurationMs).toBe(45_000)
    expect(console.warn).toHaveBeenCalled()
  })

  it('clamps invalid display duration on load', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 0,
        displayDurationMs: -1,
        lastRefreshAt: null,
        dailyRefreshTime: null,
      }),
    )
    expect(loadSettings().displayDurationMs).toBe(DEFAULT_DISPLAY_MS)
  })

  it('rejects invalid dailyRefreshTime on save', () => {
    saveSettings({ dailyRefreshTime: '25:99' })
    expect(loadSettings().dailyRefreshTime).toBeNull()
  })
})
