import { useCallback, useEffect, useState } from 'react'

export type ResourceStatus = 'loading' | 'success' | 'error'

export function useAsyncResource<T>(run: (signal: AbortSignal) => Promise<T>) {
  const [status, setStatus] = useState<ResourceStatus>('loading')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const retry = useCallback(() => {
    setData(null)
    setError(null)
    setStatus('loading')
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    const ac = new AbortController()

    run(ac.signal)
      .then((value) => {
        if (ac.signal.aborted) return
        setData(value)
        setError(null)
        setStatus('success')
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setData(null)
        const message = err instanceof Error ? err.message : 'Request failed'
        setError(message)
        setStatus('error')
      })

    return () => ac.abort()
  }, [refreshKey, run])

  return { status, data, error, retry }
}
