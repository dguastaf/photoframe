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

  it('refresh keeps data visible while refetching', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second')
    const { result } = renderHook(() => useAsyncResource(run))
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toBe('first')

    act(() => result.current.refresh())
    expect(result.current.status).toBe('success')
    expect(result.current.data).toBe('first')

    await waitFor(() => expect(result.current.data).toBe('second'))
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('refresh failure keeps the previous data', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce('first')
      .mockRejectedValueOnce(new Error('nope'))
    const { result } = renderHook(() => useAsyncResource(run))
    await waitFor(() => expect(result.current.data).toBe('first'))

    act(() => result.current.refresh())
    await waitFor(() => expect(run).toHaveBeenCalledTimes(2))

    expect(result.current.status).toBe('success')
    expect(result.current.data).toBe('first')
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
