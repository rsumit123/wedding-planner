import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../src/App';
import { api } from '../src/api';

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

it('opens the real budget manager from the home-page shortcut', async () => {
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Open budget and vendors' }));
  expect(screen.getByRole('heading', { name: /budget, clearly held/i })).toBeVisible();
});

it('brings the guest edit form into view after tapping a guest pencil', async () => {
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'guests').mockResolvedValue([{ id: 9, name: 'Test family', side: 'bride', phone: null, note: '', all_events: true, event_ids: [1, 2, 3, 5] }]);
  vi.spyOn(api, 'summary').mockResolvedValue({ total: 1, bride_total: 1, groom_total: 0, events: [] });
  vi.spyOn(api, 'events').mockResolvedValue([]);
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Open guests and RSVPs' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Edit Test family' }));
  expect(screen.getByRole('heading', { name: 'Edit guest or family' })).toBeVisible();
  expect(scrollIntoView).toHaveBeenCalled();
});
