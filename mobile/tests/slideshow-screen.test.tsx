import { render, screen } from '@testing-library/react-native'

import SlideshowScreen from '../app/index'

beforeEach(() => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([]), { status: 200 }),
  )
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('slideshow screen renders without crash', async () => {
  await render(<SlideshowScreen />)
  expect(screen.getByText('Photoframe')).toBeTruthy()
})
