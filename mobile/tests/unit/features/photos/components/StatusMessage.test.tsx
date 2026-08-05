import { render, screen } from '@testing-library/react-native';

import StatusMessage from '@/features/photos/components/StatusMessage';

test('renders the given message', async () => {
  await render(<StatusMessage message="No photos available" />);

  expect(screen.getByText('No photos available')).toBeTruthy();
});
