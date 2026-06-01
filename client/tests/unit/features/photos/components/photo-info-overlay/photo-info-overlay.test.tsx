import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PhotoInfoOverlay } from '@/features/photos/components/photo-info-overlay/photo-info-overlay'
import { testPhoto } from '../../../../../support/photo'

describe('PhotoInfoOverlay', () => {
  function renderOverlay(visible = true) {
    return render(
      <MemoryRouter>
        <PhotoInfoOverlay
          visible={visible}
          photo={testPhoto({
            id: 'photo-1',
            taken_at: '2026-04-26T12:00:00+00:00',
            folder: '2026/sample',
          })}
        />
      </MemoryRouter>,
    )
  }

  it('shows date and folder when visible', () => {
    renderOverlay()

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
      <MemoryRouter>
        <PhotoInfoOverlay
          visible={false}
          photo={testPhoto({
            id: 'photo-1',
            taken_at: '2026-04-26T12:00:00+00:00',
            folder: '2026/sample',
          })}
        />
      </MemoryRouter>,
    )

    const overlay = document.querySelector('[data-overlay-visible="false"]')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveAttribute('aria-hidden', 'true')
  })

  it('formats capture-local date and time from offset ISO string', () => {
    render(
      <MemoryRouter>
        <PhotoInfoOverlay
          visible
          photo={testPhoto({
            id: 'p1',
            taken_at: '2012-08-27T14:40:25+02:00',
            folder: 'x',
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/August 27, 2012/)).toBeInTheDocument()
    expect(screen.getByText(/2:40\s*PM/)).toBeInTheDocument()
  })

  it('formats UTC and Z suffix', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PhotoInfoOverlay
          visible
          photo={testPhoto({
            id: 'p1',
            taken_at: '2024-01-01T00:00:00+00:00',
            folder: 'x',
          })}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText(/January 1, 2024/)).toBeInTheDocument()
    expect(screen.getByText(/12:00\s*AM/)).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <PhotoInfoOverlay
          visible
          photo={testPhoto({
            id: 'p1',
            taken_at: '2024-06-01T12:00:00Z',
            folder: 'x',
          })}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText(/June 1, 2024/)).toBeInTheDocument()
    expect(screen.getByText(/12:00\s*PM/)).toBeInTheDocument()
  })

  it('shows wall clock from embedded offset', () => {
    render(
      <MemoryRouter>
        <PhotoInfoOverlay
          visible
          photo={testPhoto({
            id: 'p1',
            taken_at: '2012-08-27T05:40:25-07:00',
            folder: 'x',
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/August 27, 2012/)).toBeInTheDocument()
    expect(screen.getByText(/5:40\s*AM/)).toBeInTheDocument()
  })

  it('falls back to raw taken_at when ISO is invalid', () => {
    render(
      <MemoryRouter>
        <PhotoInfoOverlay
          visible
          photo={testPhoto({
            id: 'p1',
            taken_at: 'not-a-date',
            folder: 'x',
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('not-a-date')).toBeInTheDocument()
  })

  it('includes settings link when visible', () => {
    renderOverlay()

    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    )
  })

  it('settings link click does not bubble to parent', async () => {
    const user = userEvent.setup()
    const onParentClick = vi.fn()

    render(
      <MemoryRouter>
        <div onClick={onParentClick} role="presentation">
          <PhotoInfoOverlay
            visible
            photo={testPhoto({
              id: 'photo-1',
              taken_at: '2026-04-26T12:00:00+00:00',
              folder: '2026/sample',
            })}
          />
        </div>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('link', { name: 'Settings' }))

    expect(onParentClick).not.toHaveBeenCalled()
  })
})
