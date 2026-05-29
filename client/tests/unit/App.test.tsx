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
import { testPhoto } from '../support/photo'

const samplePhotos = [
  testPhoto({
    id: 'photo-1',
    taken_at: '2026-04-26T11:25:59+00:00',
    folder: '2026/sample',
  }),
]

const multiPhotos = [
  testPhoto({
    id: 'photo-1',
    taken_at: '2026-04-26T11:25:59+00:00',
    folder: 'a',
  }),
  testPhoto({
    id: 'photo-2',
    taken_at: '2026-04-27T11:25:59+00:00',
    folder: 'b',
  }),
  testPhoto({
    id: 'photo-3',
    taken_at: '2026-04-28T11:25:59+00:00',
    folder: 'c',
  }),
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

const manualNavCalls: Array<{
  enabled: boolean
  onNext: ReturnType<typeof vi.fn>
  onPrev: ReturnType<typeof vi.fn>
}> = []

vi.mock('@/features/photos/hooks/useManualNavigation', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/features/photos/hooks/useManualNavigation')
    >()
  return {
    ...actual,
    useManualNavigation: (
      opts: Parameters<typeof actual.useManualNavigation>[0],
    ) => {
      const onNext = vi.fn(opts.onNext)
      const onPrev = vi.fn(opts.onPrev)
      manualNavCalls.push({ enabled: opts.enabled, onNext, onPrev })
      return actual.useManualNavigation({ ...opts, onNext, onPrev })
    },
  }
})

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

function tryManualNavigationInput() {
  const frame = screen.getByRole('main')
  const fromX = 400
  const toX = 300
  const y = 200
  fireEvent.pointerDown(frame, {
    clientX: fromX,
    clientY: y,
    pointerId: 1,
    button: 0,
    buttons: 1,
    pointerType: 'mouse',
  })
  for (let i = 1; i <= 10; i++) {
    fireEvent.pointerMove(frame, {
      clientX: fromX + ((toX - fromX) * i) / 10,
      clientY: y,
      pointerId: 1,
      buttons: 1,
      pointerType: 'mouse',
    })
  }
  fireEvent.pointerUp(frame, {
    clientX: toX,
    clientY: y,
    pointerId: 1,
    button: 0,
    pointerType: 'mouse',
  })
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  fireEvent.keyDown(window, { key: 'ArrowLeft' })
}

function lastManualNavCall() {
  return manualNavCalls.at(-1)
}

beforeEach(() => {
  mockedGetPhotos.mockReset()
  slideshowTimerCalls.length = 0
  manualNavCalls.length = 0
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

  it('does not navigate while library is loading', () => {
    mockedGetPhotos.mockReturnValue(new Promise(() => {}))

    render(<App />)

    expect(screen.getByText('Loading photos…')).toBeInTheDocument()
    expect(lastManualNavCall()?.enabled).toBe(false)

    tryManualNavigationInput()

    expect(lastManualNavCall()?.onNext).not.toHaveBeenCalled()
    expect(lastManualNavCall()?.onPrev).not.toHaveBeenCalled()
    expect(document.querySelector('[data-photo-id]')).not.toBeInTheDocument()
  })

  it('does not navigate when library fetch fails', async () => {
    mockedGetPhotos.mockRejectedValue(
      new ApiError(503, 'Photo library unavailable', '/api/v0/photos'),
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Photo library unavailable')).toBeInTheDocument()
    })
    expect(lastManualNavCall()?.enabled).toBe(false)

    tryManualNavigationInput()

    expect(lastManualNavCall()?.onNext).not.toHaveBeenCalled()
    expect(lastManualNavCall()?.onPrev).not.toHaveBeenCalled()
    expect(document.querySelector('[data-photo-id]')).not.toBeInTheDocument()
  })

  it('does not navigate when library is empty', async () => {
    mockedGetPhotos.mockResolvedValue([])

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('No photos in library')).toBeInTheDocument()
    })
    expect(lastManualNavCall()?.enabled).toBe(false)

    tryManualNavigationInput()

    expect(lastManualNavCall()?.onNext).not.toHaveBeenCalled()
    expect(lastManualNavCall()?.onPrev).not.toHaveBeenCalled()
    expect(document.querySelector('[data-photo-id]')).not.toBeInTheDocument()
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

    const fromX = 400
    const toX = 300
    const y = 200
    fireEvent.pointerDown(frame, {
      clientX: fromX,
      clientY: y,
      pointerId: 1,
      button: 0,
      buttons: 1,
      pointerType: 'mouse',
    })
    for (let i = 1; i <= 10; i++) {
      fireEvent.pointerMove(frame, {
        clientX: fromX + ((toX - fromX) * i) / 10,
        clientY: y,
        pointerId: 1,
        buttons: 1,
        pointerType: 'mouse',
      })
    }
    fireEvent.pointerUp(frame, {
      clientX: toX,
      clientY: y,
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
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

describe('App tap overlay', () => {
  it('tap toggles overlay with formatted date and folder', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)
    const user = userEvent.setup()

    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('.photo-display__img')).toBeInTheDocument()
    })

    const frame = screen.getByRole('main')
    await user.click(frame)

    expect(screen.getByText(/April 26, 2026/)).toBeInTheDocument()
    expect(screen.getByText('2026/sample')).toBeInTheDocument()
    expect(document.querySelector('[data-overlay-visible="true"]')).toBeInTheDocument()

    await user.click(frame)

    expect(document.querySelector('[data-overlay-visible="true"]')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Photo information' }),
    ).not.toBeInTheDocument()
  })

  it('click does not advance photo when overlay toggles', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue(multiPhotos)
    const user = userEvent.setup()

    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('[data-photo-id]')).toBeInTheDocument()
    })

    const frame = screen.getByRole('main')
    const firstId = frame.querySelector('[data-photo-id]')?.getAttribute('data-photo-id')

    await user.click(frame)
    await user.click(frame)

    expect(lastManualNavCall()?.onNext).not.toHaveBeenCalled()
    expect(lastManualNavCall()?.onPrev).not.toHaveBeenCalled()
    expect(frame.querySelector('[data-photo-id]')?.getAttribute('data-photo-id')).toBe(
      firstId,
    )

    vi.restoreAllMocks()
  })

  it('auto-dismisses overlay after 10 seconds and restarts timer on re-open', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)

    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('.photo-display__img')).toBeInTheDocument()
    })

    vi.useFakeTimers()
    try {
      const frame = screen.getByRole('main')
      fireEvent.click(frame)
      expect(document.querySelector('[data-overlay-visible="true"]')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(10_000)
      })

      expect(document.querySelector('[data-overlay-visible="true"]')).not.toBeInTheDocument()

      fireEvent.click(frame)
      expect(document.querySelector('[data-overlay-visible="true"]')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(10_000)
      })

      expect(document.querySelector('[data-overlay-visible="true"]')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('closes overlay when photo changes', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue(multiPhotos)
    const user = userEvent.setup()

    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('[data-photo-id]')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('main'))
    expect(screen.getByText(/April 27, 2026/)).toBeInTheDocument()
    expect(document.querySelector('[data-overlay-visible="true"]')).toBeInTheDocument()

    act(() => {
      slideshowTimerCalls.at(-1)!.onTick()
    })

    await waitFor(() => {
      expect(document.querySelector('[data-overlay-visible="true"]')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('c')).not.toBeInTheDocument()

    vi.restoreAllMocks()
  })

  it('hides overlay without showing next photo metadata when using arrow keys', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedGetPhotos.mockResolvedValue(multiPhotos)
    const user = userEvent.setup()

    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('[data-photo-id]')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('main'))
    expect(screen.getByText(/April 27, 2026/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    expect(document.querySelector('[data-overlay-visible="true"]')).not.toBeInTheDocument()
    expect(screen.queryByText('c')).not.toBeInTheDocument()

    vi.restoreAllMocks()
  })

  it('does not pause slideshow timer when overlay opens', async () => {
    mockedGetPhotos.mockResolvedValue(samplePhotos)
    const user = userEvent.setup()

    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('.photo-display__img')).toBeInTheDocument()
    })

    const img = document.querySelector('.photo-display__img') as HTMLImageElement
    fireEvent.load(img)

    await waitFor(() => {
      expect(slideshowTimerCalls.at(-1)?.paused).toBe(false)
    })

    await user.click(screen.getByRole('main'))

    expect(slideshowTimerCalls.at(-1)?.paused).toBe(false)
    expect(document.querySelector('[data-overlay-visible="true"]')).toBeInTheDocument()
  })
})
