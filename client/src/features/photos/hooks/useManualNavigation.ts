import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'

/** Minimum horizontal movement to count as a swipe (not a tap). Shared with D3 tap overlay. */
export const SWIPE_THRESHOLD_PX = 48

/** Max movement for a tap; D3 should use this when distinguishing tap vs swipe. */
export const TAP_MAX_PX = 10

type PointerStart = {
  x: number
  y: number
  pointerId: number
}

export type ManualNavigationHandlers = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
}

type UseManualNavigationOptions = {
  onNext: () => void
  onPrev: () => void
  enabled: boolean
}

const EMPTY_HANDLERS: ManualNavigationHandlers = {
  onPointerDown: () => {},
  onPointerUp: () => {},
  onPointerCancel: () => {},
}

/**
 * Touch swipe and keyboard (arrow keys) navigation for the slideshow frame.
 * Swipe left → onNext; swipe right → onPrev. No animated transition.
 */
export function useManualNavigation({
  onNext,
  onPrev,
  enabled,
}: UseManualNavigationOptions): ManualNavigationHandlers {
  const startRef = useRef<PointerStart | null>(null)
  const onNextRef = useRef(onNext)
  const onPrevRef = useRef(onPrev)
  onNextRef.current = onNext
  onPrevRef.current = onPrev

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        onNextRef.current()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onPrevRef.current()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])

  if (!enabled) {
    return EMPTY_HANDLERS
  }

  return {
    onPointerDown(event) {
      if (event.button !== 0) return
      startRef.current = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },

    onPointerUp(event) {
      const start = startRef.current
      startRef.current = null
      if (!start || start.pointerId !== event.pointerId) return

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (absDx < SWIPE_THRESHOLD_PX || absDx <= absDy) return

      if (dx < 0) {
        onNextRef.current()
      } else {
        onPrevRef.current()
      }
    },

    onPointerCancel() {
      startRef.current = null
    },
  }
}
