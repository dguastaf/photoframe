import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { loadSettings, saveSettings } from './lib/storage'
import { clampDisplayDurationMs } from './lib/timing'

type SettingsDisplayDurationContextValue = {
  displayDurationMs: number
  setDisplayDurationMs: (ms: number) => void
}

const SettingsDurationContext =
  createContext<SettingsDisplayDurationContextValue | null>(null)

export function SettingsDurationProvider({ children }: { children: ReactNode }) {
  const [displayDurationMs, setDisplayDurationMs] = useState(
    () => loadSettings().displayDurationMs,
  )

  const setDuration = useCallback((ms: number) => {
    const clamped = clampDisplayDurationMs(ms)
    setDisplayDurationMs(clamped)
    saveSettings({ displayDurationMs: clamped })
  }, [])

  const value = useMemo(
    () => ({ displayDurationMs, setDisplayDurationMs: setDuration }),
    [displayDurationMs, setDuration],
  )

  return (
    <SettingsDurationContext.Provider value={value}>
      {children}
    </SettingsDurationContext.Provider>
  )
}

export function useDisplayDuration() {
  const context = useContext(SettingsDurationContext)
  if (context === null) {
    throw new Error(
      'useDisplayDuration must be used within SettingsDurationProvider',
    )
  }
  return context
}
