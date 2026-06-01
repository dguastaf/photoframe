import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { SettingsPage } from '@/pages/settings-page'

describe('SettingsPage', () => {
  it('renders stub content and back link', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <SettingsPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(
      screen.getByText(/Display duration, sync, and other options will appear here/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to slideshow' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})

describe('AppRoutes', () => {
  it('renders settings route', async () => {
    const { AppRoutes } = await import('@/app-routes')
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })
})
