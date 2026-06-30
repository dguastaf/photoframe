import { render, screen } from '@testing-library/react-native'

import SlideshowScreen from '../app/index'

afterEach(() => {
  jest.restoreAllMocks()
})

test('renders status message when there are no photos', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([]), { status: 200 }),
  )

  await render(<SlideshowScreen />)

  expect(await screen.findByText('No photos available')).toBeTruthy()
})

test('renders a photo image when photos are returned', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify([{ id: 'abc', taken_at: '2026-01-01T00:00:00Z', folder: 'vacation' }]),
      { status: 200 },
    ),
  )

  await render(<SlideshowScreen />)

  const image = await screen.findByRole('img')
  expect(image.props.source.uri).toContain('/api/v0/photos/abc/image')
})
