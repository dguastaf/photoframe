import { useEffect, useRef } from 'react'
import { DEFAULT_DISPLAY_MS } from '../constants'

type UseSlideshowTimerOptions = {
  onTick: () => void
  paused: boolean
  enabled?: boolean
  /** Restart the interval when this value changes (e.g. current photo id). */
  resetKey?: string
  intervalMs?: number
}

export function useSlideshowTimer({
  onTick,
  paused,
  enabled = true,
  resetKey,
  intervalMs = DEFAULT_DISPLAY_MS,
}: UseSlideshowTimerOptions) {
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick

  useEffect(() => {
    if (!enabled || paused) return

    const id = window.setInterval(() => {
      onTickRef.current()
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [enabled, paused, resetKey, intervalMs])
}
