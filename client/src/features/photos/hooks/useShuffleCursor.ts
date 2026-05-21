import { useCallback, useEffect, useMemo, useState } from 'react'
import { shuffle } from '../lib/shuffle'

function photoIdsKey(ids: string[]): string {
  return ids.join('\0')
}

/**
 * In-memory shuffled slideshow cursor.
 * goNext advances; at end of order reshuffles (no repeats until cycle completes).
 * goPrev decrements; at index 0 wraps to last photo in current order.
 */
export function useShuffleCursor(photoIds: string[]) {
  const idsKey = photoIdsKey(photoIds)
  const [order, setOrder] = useState<string[]>(() =>
    photoIds.length > 0 ? shuffle(photoIds) : [],
  )
  const [cursor, setCursor] = useState(0)

  useEffect(() => {
    if (photoIds.length === 0) {
      setOrder([])
      setCursor(0)
      return
    }
    setOrder(shuffle(photoIds))
    setCursor(0)
  }, [idsKey])

  const currentId = order.length > 0 ? order[cursor] : undefined

  const goNext = useCallback(() => {
    if (order.length === 0) return
    const nextIndex = cursor + 1
    if (nextIndex < order.length) {
      setCursor(nextIndex)
    } else {
      setOrder(shuffle(photoIds))
      setCursor(0)
    }
  }, [cursor, order.length, photoIds])

  const goPrev = useCallback(() => {
    if (order.length === 0) return
    setCursor((prev) => (prev === 0 ? order.length - 1 : prev - 1))
  }, [order.length])

  return useMemo(
    () => ({ currentId, goNext, goPrev, order, cursor }),
    [currentId, goNext, goPrev, order, cursor],
  )
}
