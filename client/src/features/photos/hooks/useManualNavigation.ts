import { useDrag } from '@use-gesture/react'
import { useEffect, useMemo, useRef, useState } from 'react'

/** Minimum horizontal swipe distance as a fraction of viewport width (3.75%). */
export const SWIPE_THRESHOLD_VW = 0.0375

export function viewportWidth(): number {
  if (typeof window === 'undefined') {
    return 1280
  }
  return window.innerWidth
}

/** Swipe distance for @use-gesture, derived from viewport width × {@link SWIPE_THRESHOLD_VW}. */
export function swipeDistanceForViewport(width = viewportWidth()): number {
  return width * SWIPE_THRESHOLD_VW
}

export type ManualNavigationBindings = ReturnType<
  ReturnType<typeof useDrag>
>

type UseManualNavigationOptions = {
  onNext: () => void
  onPrev: () => void
  enabled: boolean
}

/**
 * Touch swipe and keyboard (arrow keys) navigation for the slideshow frame.
 * Swipe left → onNext; swipe right → onPrev. No animated transition.
 */
export function useManualNavigation({
  onNext,
  onPrev,
  enabled,
}: UseManualNavigationOptions): ManualNavigationBindings {
  const onNextRef = useRef(onNext)
  const onPrevRef = useRef(onPrev)
  onNextRef.current = onNext
  onPrevRef.current = onPrev

  const [viewportW, setViewportW] = useState(viewportWidth)

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const swipeDistance = swipeDistanceForViewport(viewportW)

  const dragConfig = useMemo(
    () => ({
      axis: 'x' as const,
      filterTaps: true,
      enabled,
      swipe: {
        distance: swipeDistance,
        velocity: 0.05,
        duration: 2000,
      },
    }),
    [enabled, swipeDistance],
  )

  const bind = useDrag(
    ({ swipe: [swipeX], last }) => {
      if (!last || swipeX === 0) return
      if (swipeX < 0) {
        onNextRef.current()
      } else {
        onPrevRef.current()
      }
    },
    dragConfig,
  )

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

  return enabled ? bind() : ({} as ManualNavigationBindings)
}
