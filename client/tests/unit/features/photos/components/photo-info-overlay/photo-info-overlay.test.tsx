import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PhotoInfoOverlay } from '@/features/photos/components/photo-info-overlay/photo-info-overlay'
import { testPhoto } from '../../../../../support/photo'

describe('PhotoInfoOverlay', () => {
  it('shows date and folder when visible', () => {
    render(
      <PhotoInfoOverlay
        visible
        photo={testPhoto({
          id: 'photo-1',
          taken_at: '2026-04-26T12:00:00+00:00',
          folder: '2026/sample',
        })}
      />,
    )

    expect(screen.getByText(/April 26, 2026/)).toBeInTheDocument()
    expect(screen.getByText('2026/sample')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Photo information' })).toHaveAttribute(
      'aria-hidden',
      'false',
    )
    expect(screen.getByRole('region', { name: 'Photo information' })).toHaveAttribute(
      'data-overlay-visible',
      'true',
    )
  })

  it('hides content when not visible', () => {
    render(
      <PhotoInfoOverlay
        visible={false}
        photo={testPhoto({
          id: 'photo-1',
          taken_at: '2026-04-26T12:00:00+00:00',
          folder: '2026/sample',
        })}
      />,
    )

    const overlay = document.querySelector('[data-overlay-visible="false"]')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveAttribute('aria-hidden', 'true')
  })

  it('formats capture-local date and time from offset ISO string', () => {
    render(
      <PhotoInfoOverlay
        visible
        photo={testPhoto({
          id: 'p1',
          taken_at: '2012-08-27T14:40:25+02:00',
          folder: 'x',
        })}
      />,
    )

    expect(screen.getByText(/August 27, 2012/)).toBeInTheDocument()
    expect(screen.getByText(/2:40\s*PM/)).toBeInTheDocument()
  })

  it('formats UTC and Z suffix', () => {
    const { rerender } = render(
      <PhotoInfoOverlay
        visible
        photo={testPhoto({
          id: 'p1',
          taken_at: '2024-01-01T00:00:00+00:00',
          folder: 'x',
        })}
      />,
    )
    expect(screen.getByText(/January 1, 2024/)).toBeInTheDocument()
    expect(screen.getByText(/12:00\s*AM/)).toBeInTheDocument()

    rerender(
      <PhotoInfoOverlay
        visible
        photo={testPhoto({
          id: 'p1',
          taken_at: '2024-06-01T12:00:00Z',
          folder: 'x',
        })}
      />,
    )
    expect(screen.getByText(/June 1, 2024/)).toBeInTheDocument()
    expect(screen.getByText(/12:00\s*PM/)).toBeInTheDocument()
  })

  it('shows wall clock from embedded offset', () => {
    render(
      <PhotoInfoOverlay
        visible
        photo={testPhoto({
          id: 'p1',
          taken_at: '2012-08-27T05:40:25-07:00',
          folder: 'x',
        })}
      />,
    )

    expect(screen.getByText(/August 27, 2012/)).toBeInTheDocument()
    expect(screen.getByText(/5:40\s*AM/)).toBeInTheDocument()
  })

  it('falls back to raw taken_at when ISO is invalid', () => {
    render(
      <PhotoInfoOverlay
        visible
        photo={testPhoto({
          id: 'p1',
          taken_at: 'not-a-date',
          folder: 'x',
        })}
      />,
    )

    expect(screen.getByText('not-a-date')).toBeInTheDocument()
  })
})
