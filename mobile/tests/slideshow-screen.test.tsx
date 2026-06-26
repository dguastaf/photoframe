import { render, screen } from '@testing-library/react-native'

import SlideshowScreen from '../app/index'

test('slideshow screen renders without crash', async () => {
  await render(<SlideshowScreen />)
  expect(screen.getByText('Photoframe')).toBeTruthy()
})
