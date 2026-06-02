import { useCallback, useState } from 'react'

import { loadSettings, saveSettings } from '@/lib/settings/storage'
import { clampDisplayDurationMs } from '@/lib/settings/timing'

export function useDisplayDuration() {
  const [displayDurationMs, setDisplayDurationMs] = useState(
    () => loadSettings().displayDurationMs,
  )

  const setDuration = useCallback((ms: number) => {
    const clamped = clampDisplayDurationMs(ms)
    setDisplayDurationMs(clamped)
    saveSettings({ displayDurationMs: clamped })
  }, [])

  return { displayDurationMs, setDisplayDurationMs: setDuration }
}
