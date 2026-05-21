import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FrameMessage } from './frame-message'

describe('FrameMessage', () => {
  it('shows loading spinner and copy while loading', () => {
    render(
      <FrameMessage
        loading
        error={null}
        hasPhotos={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('status', { name: 'Loading photos' })).toBeInTheDocument()
    expect(screen.getByText('Loading photos…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('shows error without hiding loading block when both apply', () => {
    render(
      <FrameMessage
        loading={false}
        error="Photo library unavailable"
        hasPhotos={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('Photo library unavailable')).toBeInTheDocument()
    expect(screen.getByText('No photos in library')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('shows empty library and Retry when not loading and no photos', () => {
    render(
      <FrameMessage
        loading={false}
        error={null}
        hasPhotos={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('No photos in library')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading photos' })).not.toBeInTheDocument()
  })

  it('hides empty-library block when hasPhotos is true', () => {
    render(
      <FrameMessage
        loading={false}
        error={null}
        hasPhotos
        onRetry={vi.fn()}
      />,
    )

    expect(screen.queryByText('No photos in library')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('calls onRetry when Retry is clicked', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()

    render(
      <FrameMessage
        loading={false}
        error={null}
        hasPhotos={false}
        onRetry={onRetry}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
