import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAsyncResource } from '@/hooks/useAsyncResource'

describe('useAsyncResource', () => {
  it('resolves with data and success status', async () => {
    const run = vi.fn(async () => 'ok')
    const { result } = renderHook(() => useAsyncResource(run))
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toBe('ok')
    expect(result.current.error).toBeNull()
  })

  it('retry clears data and refetches', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValueOnce('ok')
    const { result } = renderHook(() => useAsyncResource(run))
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => result.current.retry())
    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toBe('ok')
    expect(run).toHaveBeenCalledTimes(2)
  })
})
