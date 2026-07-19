import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

it('shows the couple and organiser sign-in before private planning data', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /sumit.*puja/i })).toBeVisible();
  expect(screen.getByRole('button', { name: /sign in to planner/i })).toBeVisible();
});

it('does not show private budget data before organiser sign-in', async () => {
  render(<App />);
  expect(screen.queryByText(/budget & vendors/i)).not.toBeInTheDocument();
});

it('keeps the wedding portrait free of a decorative overlay', () => {
  const { container } = render(<App />);
  expect(container.querySelector('.sun-disc')).not.toBeInTheDocument();
});

it('uses a dedicated mobile-friendly organiser login layout', () => {
  render(<App />);
  expect(screen.getByRole('main')).toHaveClass('organiser-login');
});
