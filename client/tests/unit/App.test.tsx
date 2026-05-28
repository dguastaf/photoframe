import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { getPhotos } from '@/features/photos/api/photos'
import { ApiError } from '@/lib/api-client'
import type { PhotoMetadata } from '@/types/api'

const samplePhotos: PhotoMetadata[] = [
  {
    id: 'photo-1',
    taken_at: '2026-04-26T11:25:59Z',
    folder: '2026/sample',
  },
]

const multiPhotos: PhotoMetadata[] = [
  { id: 'photo-1', taken_at: '2026-04-26T11:25:59Z', folder: 'a' },
  { id: 'photo-2', taken_at: '2026-04-27T11:25:59Z', folder: 'b' },
  { id: 'photo-3', taken_at: '2026-04-28T11:25:59Z', folder: 'c' },
]

vi.mock('@/features/photos/api/photos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/photos/api/photos')>()
  return { ...actual, getPhotos: vi.fn() }
})

const slideshowTimerCalls: Array<{
  onTick: () => void
  paused: boolean
  enabled: boolean
}> = []

vi.mock('@/features/photos/hooks/useSlideshowTimer', () => ({
  useSlideshowTimer: (opts: {
    onTick: () => void
    paused: boolean
    enabled?: boolean
  }) => {
    slideshowTimerCalls.push({
      onTick: opts.onTick,
      paused: opts.paused,
      enabled: opts.enabled ?? true,
    })
  },
}))

const mockedGetPhotos = vi.mocked(getPhotos)

beforeEach(() => {
  mockedGetPhotos.mockReset()
  slideshowTimerCalls.length = 0
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('App library flow', () => {
  it('starts on loading frame message', () => {
    mockedGetPhotos.mockReturnValue(new Promise(() => {}))

    render(<App />)

    expect(screen.getByText('Loading photos…')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading photos' })).toBeInTheDocument()
  })

  it('shows first photo when library fetch succeeds', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)

    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('.photo-display__img')).toHaveAttribute(
        'src',
        '/api/v0/photos/photo-1/image',
      )
    })
    expect(screen.queryByText('Loading photos…')).not.toBeInTheDocument()
  })

  it('shows error and empty-library messaging on fetch failure', async () => {
    mockedGetPhotos.mockRejectedValue(
      new ApiError(503, 'Photo library unavailable', '/api/v0/photos'),
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Photo library unavailable')).toBeInTheDocument()
    })
    expect(screen.getByText('No photos in library')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('shows empty library when fetch returns no photos', async () => {
    mockedGetPhotos.mockResolvedValue([])

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('No photos in library')).toBeInTheDocument()
    })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('retries library fetch when Retry is clicked', async () => {
    mockedGetPhotos
      .mockRejectedValueOnce(new ApiError(503, 'Temporary failure', '/api/v0/photos'))
      .mockResolvedValueOnce(samplePhotos)

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Temporary failure')).toBeInTheDocument()
    })

    const frame = screen.getByRole('main')
    await user.click(within(frame).getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(document.querySelector('.photo-display__img')).toHaveAttribute(
        'src',
        '/api/v0/photos/photo-1/image',
      )
    })
    expect(mockedGetPhotos).toHaveBeenCalledTimes(2)
  })

  it('aborts in-flight fetch on unmount', async () => {
    const signals: AbortSignal[] = []
    mockedGetPhotos.mockImplementation((init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal)
      return new Promise(() => {})
    })

    const { unmount } = render(<App />)
    await waitFor(() => expect(mockedGetPhotos).toHaveBeenCalledTimes(1))

    unmount()

    expect(signals[0]?.aborted).toBe(true)
  })

  it('passes AbortSignal to getPhotos', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)

    render(<App />)

    await waitFor(() => expect(mockedGetPhotos).toHaveBeenCalled())
    expect(mockedGetPhotos.mock.calls[0]?.[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('wires timer onTick to shuffle cursor goNext', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue(multiPhotos)

    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('[data-photo-id]')).toBeInTheDocument()
    })

    const firstId = document
      .querySelector('[data-photo-id]')
      ?.getAttribute('data-photo-id')
    expect(slideshowTimerCalls.at(-1)?.enabled).toBe(true)

    act(() => {
      slideshowTimerCalls.at(-1)!.onTick()
    })

    await waitFor(() => {
      const nextId = document
        .querySelector('[data-photo-id]')
        ?.getAttribute('data-photo-id')
      expect(nextId).not.toBe(firstId)
    })

    vi.restoreAllMocks()
  })

  it('swipe left advances to next photo when slideshow is visible', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue(multiPhotos)

    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('[data-photo-id]')).toBeInTheDocument()
    })

    const frame = screen.getByRole('main')
    const firstId = frame.querySelector('[data-photo-id]')?.getAttribute('data-photo-id')

    fireEvent.pointerDown(frame, {
      clientX: 400,
      clientY: 200,
      pointerId: 1,
      button: 0,
      buttons: 1,
    })
    fireEvent.pointerUp(frame, {
      clientX: 300,
      clientY: 200,
      pointerId: 1,
      button: 0,
    })

    await waitFor(() => {
      const nextId = frame
        .querySelector('[data-photo-id]')
        ?.getAttribute('data-photo-id')
      expect(nextId).not.toBe(firstId)
    })

    vi.restoreAllMocks()
  })

  it('arrow keys navigate when slideshow is visible', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue(multiPhotos)

    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('[data-photo-id]')).toBeInTheDocument()
    })

    const frame = screen.getByRole('main')
    const firstId = frame.querySelector('[data-photo-id]')?.getAttribute('data-photo-id')

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    await waitFor(() => {
      const nextId = frame
        .querySelector('[data-photo-id]')
        ?.getAttribute('data-photo-id')
      expect(nextId).not.toBe(firstId)
    })

    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    await waitFor(() => {
      const restoredId = frame
        .querySelector('[data-photo-id]')
        ?.getAttribute('data-photo-id')
      expect(restoredId).toBe(firstId)
    })

    vi.restoreAllMocks()
  })
})
