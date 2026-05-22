import { useCallback, useEffect, useRef, useState } from 'react'

export type ResourceStatus = 'loading' | 'success' | 'error'

export function useAsyncResource<T>(run: (signal: AbortSignal) => Promise<T>) {
  const [status, setStatus] = useState<ResourceStatus>('loading')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const keepCurrentRef = useRef(false)

  const retry = useCallback(() => {
    keepCurrentRef.current = false
    setData(null)
    setError(null)
    setStatus('loading')
    setRefreshKey((k) => k + 1)
  }, [])

  /** Refetch without clearing data or leaving the success state (for background refresh). */
  const refresh = useCallback(() => {
    keepCurrentRef.current = true
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    const keepCurrent = keepCurrentRef.current
    keepCurrentRef.current = false

    run(ac.signal)
      .then((value) => {
        if (ac.signal.aborted) return
        setData(value)
        setError(null)
        setStatus('success')
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        if (keepCurrent) return
        setData(null)
        const message = err instanceof Error ? err.message : 'Request failed'
        setError(message)
        setStatus('error')
      })

    return () => ac.abort()
  }, [refreshKey, run])

  return { status, data, error, retry, refresh }
}
