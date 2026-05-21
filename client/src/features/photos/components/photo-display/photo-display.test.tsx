import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { photoImageUrl } from '../../api/photos'
import { PhotoDisplay } from './photo-display'

function getImg(container: HTMLElement) {
  const img = container.querySelector('.photo-display__img')
  if (!img) throw new Error('expected .photo-display__img')
  return img
}

describe('PhotoDisplay', () => {
  it('loads image from photo API path', () => {
    const { container } = render(<PhotoDisplay photoId="abc123" />)

    const img = getImg(container)
    expect(img).toHaveAttribute('src', photoImageUrl('abc123'))
    expect(img).toHaveAttribute('hidden')
    expect(screen.getByRole('status', { name: 'Loading photo' })).toBeInTheDocument()
  })

  it('shows error and Retry when image fails to load', () => {
    const { container } = render(<PhotoDisplay photoId="abc123" />)

    fireEvent.error(getImg(container))

    expect(screen.getByText('Could not load photo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(getImg(container)).toHaveAttribute('hidden')
  })

  it('cache-busts src on image Retry', async () => {
    const user = userEvent.setup()
    const { container } = render(<PhotoDisplay photoId="abc123" />)

    const img = getImg(container)
    fireEvent.error(img)
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(img).toHaveAttribute('src', `${photoImageUrl('abc123')}?retry=1`)
    expect(screen.getByRole('status', { name: 'Loading photo' })).toBeInTheDocument()
  })

  it('reveals image when load succeeds', () => {
    const { container } = render(<PhotoDisplay photoId="abc123" />)

    const img = getImg(container)
    fireEvent.load(img)

    expect(img).not.toHaveAttribute('hidden')
    expect(screen.queryByRole('status', { name: 'Loading photo' })).not.toBeInTheDocument()
  })

  it('sets data-photo-id on the display root', () => {
    const { container } = render(<PhotoDisplay photoId="abc123" />)
    expect(container.querySelector('.photo-display')).toHaveAttribute(
      'data-photo-id',
      'abc123',
    )
  })

  it('calls onStatusChange when status changes', () => {
    const onStatusChange = vi.fn()
    const { container } = render(
      <PhotoDisplay photoId="abc123" onStatusChange={onStatusChange} />,
    )

    expect(onStatusChange).toHaveBeenCalledWith('loading')

    fireEvent.load(getImg(container))
    expect(onStatusChange).toHaveBeenCalledWith('ready')

    fireEvent.error(getImg(container))
    expect(onStatusChange).toHaveBeenCalledWith('error')
  })

  it('reports loading again when photoId changes', async () => {
    const onStatusChange = vi.fn()
    const { rerender } = render(
      <PhotoDisplay photoId="a" onStatusChange={onStatusChange} />,
    )
    onStatusChange.mockClear()

    rerender(<PhotoDisplay photoId="b" onStatusChange={onStatusChange} />)
    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('loading')
    })
  })
})
