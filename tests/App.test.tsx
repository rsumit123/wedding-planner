import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

it('shows the couple, all five celebrations, and the first planning action', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /sumit.*puja/i })).toBeVisible();
  expect(screen.getByText('Reception party')).toBeVisible();
  expect(screen.getAllByRole('button', { name: /add task/i })[0]).toBeVisible();
});

it('does not show private budget data on the guest view', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getAllByRole('button', { name: /guest page/i })[0]);
  expect(screen.queryByText(/budget & vendors/i)).not.toBeInTheDocument();
});
