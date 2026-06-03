import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { PhotoLibraryProvider } from '@/features/photos/photo-library-context'
import { SettingsDurationProvider } from '@/features/settings/settings-duration-context'
import { SettingsPage } from '@/pages/settings-page'

vi.mock('@/features/photos/api/photos', () => ({
  getPhotos: vi.fn().mockResolvedValue([]),
}))

function renderSettingsPage() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <PhotoLibraryProvider>
        <SettingsDurationProvider>
          <SettingsPage />
        </SettingsDurationProvider>
      </PhotoLibraryProvider>
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  it('renders header back arrow, duration control, and sync section', async () => {
    renderSettingsPage()

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Back to slideshow' })).toBeInTheDocument()
    expect(screen.queryByText('Back to slideshow')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Display duration')).toBeInTheDocument()
    expect(screen.getByLabelText('Display duration unit')).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Sync now' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Last refreshed:/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to slideshow' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('shows error and reverts invalid duration without persisting', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      'photoframe.settings',
      JSON.stringify({
        version: 0,
        displayDurationMs: 60_000,
        lastRefreshAt: null,
        dailyRefreshTime: null,
      }),
    )
    renderSettingsPage()
    await screen.findByRole('button', { name: 'Sync now' })

    await user.selectOptions(screen.getByLabelText('Display duration unit'), 'seconds')

    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent(/between 5 seconds and 24 hours/)
    expect(screen.getByRole('spinbutton', { name: 'Display duration' })).toHaveValue(1)
    expect(screen.getByLabelText('Display duration unit')).toHaveValue('minutes')

    const stored = JSON.parse(
      window.localStorage.getItem('photoframe.settings') ?? '{}',
    )
    expect(stored.displayDurationMs).toBe(60_000)
  })

  it('allows clearing the input and typing a new value', async () => {
    const user = userEvent.setup()
    renderSettingsPage()
    await screen.findByRole('button', { name: 'Sync now' })

    const input = screen.getByRole('spinbutton', { name: 'Display duration' })
    await user.clear(input)
    expect(input).toHaveValue(null)
    await user.type(input, '5')
    expect(input).toHaveValue(5)
    await user.tab()

    const stored = JSON.parse(
      window.localStorage.getItem('photoframe.settings') ?? '{}',
    )
    expect(stored.displayDurationMs).toBe(300_000)
  })

  it('persists display duration when unit changes', async () => {
    const user = userEvent.setup()
    renderSettingsPage()
    await screen.findByRole('button', { name: 'Sync now' })

    await user.selectOptions(screen.getByLabelText('Display duration unit'), 'hours')

    const stored = JSON.parse(
      window.localStorage.getItem('photoframe.settings') ?? '{}',
    )
    expect(stored.displayDurationMs).toBe(3_600_000)
  })
})

describe('AppRoutes', () => {
  it('renders settings route', async () => {
    const { AppRoutes } = await import('@/app-routes')
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <PhotoLibraryProvider>
          <SettingsDurationProvider>
            <AppRoutes />
          </SettingsDurationProvider>
        </PhotoLibraryProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByLabelText('Display duration')).toBeInTheDocument()
  })
})
