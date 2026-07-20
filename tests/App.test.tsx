import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import App from '../src/App';
import { api, type Attachment } from '../src/api';

afterEach(() => vi.restoreAllMocks());

it('opens on the public invitation and moves to organiser login from its header', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(screen.getByText(/with the blessings of our families/i)).toBeVisible();
  await user.click(screen.getByRole('button', { name: /planner login/i }));
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

it('offers organisers a dedicated gallery tab', async () => {
  const user = userEvent.setup();
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'login').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'events').mockResolvedValue([]);
  render(<App />);
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  expect((await screen.findAllByRole('button', { name: 'Gallery' }))[0]).toBeVisible();
});

it('loads celebrations before an existing organiser opens the gallery', async () => {
  const user = userEvent.setup();
  const celebration = { id: 2, slug: 'haldi', name: 'Haldi & Matkor', date: '2026-11-30', time_note: '', venue: '', side: 'both' as const, attachments: [] };
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  const events = vi.spyOn(api, 'events').mockResolvedValue([celebration]);
  vi.spyOn(api, 'gallery').mockResolvedValue([]);
  vi.spyOn(api, 'publicEvents').mockResolvedValue([celebration]);
  vi.spyOn(api, 'publicGallery').mockResolvedValue([]);
  render(<App />);
  await waitFor(() => expect(api.me).toHaveBeenCalled());
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  await user.click((await screen.findAllByRole('button', { name: 'Gallery' }))[0]);
  expect(await screen.findByRole('option', { name: 'Haldi & Matkor' })).toBeVisible();
  expect(screen.getByText('Choose photos to publish')).toHaveStyle({
    alignItems: 'center',
    justifyContent: 'center',
  });
  expect(events).toHaveBeenCalled();
});

it('uses a dedicated mobile-friendly organiser login layout', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  expect(screen.getByRole('main')).toHaveClass('organiser-login');
});

it('opens the real budget manager from the home-page shortcut', async () => {
  const user = userEvent.setup();
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'login').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'events').mockResolvedValue([]);
  vi.spyOn(api, 'vendors').mockResolvedValue([]);
  vi.spyOn(api, 'budgetSummary').mockResolvedValue({ planned_total: 0, paid_total: 0, due_total: 0 });
  render(<App />);
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  await user.click(await screen.findByRole('button', { name: 'Open budget and vendors' }));
  expect(screen.getByRole('heading', { name: /budget, clearly held/i })).toBeVisible();
  expect(screen.getByLabelText(/receipt image/i)).toHaveAttribute('type', 'file');
});

it('keeps a vendor when its first receipt upload fails', async () => {
  const user = userEvent.setup();
  const vendor = { id: 44, name: 'Photo vendor', category: 'Decor', phone: '', side: 'both' as const, amount: 1000, paid_amount: 0, attachments: [] };
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'login').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'events').mockResolvedValue([]);
  vi.spyOn(api, 'vendors').mockResolvedValue([]);
  vi.spyOn(api, 'budgetSummary').mockResolvedValue({ planned_total: 0, paid_total: 0, due_total: 0 });
  vi.spyOn(api, 'addVendor').mockResolvedValue(vendor);
  vi.spyOn(api, 'uploadVendorAttachment').mockRejectedValue(new Error('Failed to fetch'));
  render(<App />);
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  await user.click(await screen.findByRole('button', { name: 'Open budget and vendors' }));
  await user.type(screen.getByLabelText('Vendor name'), 'Photo vendor');
  await user.type(screen.getByLabelText('Category'), 'Decor');
  await user.type(screen.getByLabelText('Total cost (₹)'), '1000');
  await user.type(screen.getByLabelText('Paid so far (₹)'), '0');
  await user.upload(screen.getByLabelText(/receipt image/i), new File(['receipt'], 'receipt.png', { type: 'image/png' }));
  await user.click(screen.getByRole('button', { name: 'Add vendor' }));
  expect(await screen.findByText(/vendor was saved, but the receipt did not upload/i)).toBeVisible();
});

it('shows receipt upload progress while saving a vendor', async () => {
  const user = userEvent.setup();
  const vendor = { id: 44, name: 'Photo vendor', category: 'Decor', phone: '', side: 'both' as const, amount: 1000, paid_amount: 0, attachments: [] };
  let finishUpload: (attachment: Attachment) => void = () => undefined;
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'login').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'events').mockResolvedValue([]);
  vi.spyOn(api, 'vendors').mockResolvedValue([]);
  vi.spyOn(api, 'budgetSummary').mockResolvedValue({ planned_total: 0, paid_total: 0, due_total: 0 });
  vi.spyOn(api, 'addVendor').mockResolvedValue(vendor);
  vi.spyOn(api, 'uploadVendorAttachment').mockImplementation(() => new Promise<Attachment>((resolve) => { finishUpload = resolve; }));
  render(<App />);
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  await user.click(await screen.findByRole('button', { name: 'Open budget and vendors' }));
  await user.type(screen.getByLabelText('Vendor name'), 'Photo vendor');
  await user.type(screen.getByLabelText('Category'), 'Decor');
  await user.type(screen.getByLabelText('Total cost (₹)'), '1000');
  await user.type(screen.getByLabelText('Paid so far (₹)'), '0');
  await user.upload(screen.getByLabelText(/receipt image/i), new File(['receipt'], 'receipt.png', { type: 'image/png' }));
  await user.click(screen.getByRole('button', { name: 'Add vendor' }));
  expect(await screen.findByRole('button', { name: 'Uploading receipt…' })).toBeDisabled();
  finishUpload({ id: 1, filename: 'receipt.png', mime_type: 'image/png', url: '/attachments/1' });
  expect(await screen.findByRole('button', { name: 'Add vendor' })).toBeEnabled();
});

it('removes a vendor from the budget list', async () => {
  const user = userEvent.setup();
  const vendor = { id: 44, name: 'Band vendor', category: 'Music', phone: '', side: 'groom' as const, amount: 25000, paid_amount: 2000, attachments: [] };
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'login').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'events').mockResolvedValue([]);
  vi.spyOn(api, 'vendors').mockResolvedValue([vendor]);
  vi.spyOn(api, 'budgetSummary').mockResolvedValue({ planned_total: 25000, paid_total: 2000, due_total: 23000 });
  const deleteVendor = vi.spyOn(api, 'deleteVendor').mockResolvedValue({ ok: true });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<App />);
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  await user.click(await screen.findByRole('button', { name: 'Open budget and vendors' }));
  await user.click(screen.getByRole('button', { name: 'Remove Band vendor' }));
  expect(deleteVendor).toHaveBeenCalledWith(44);
});

it('uses a dialable link for a vendor contact number', async () => {
  const user = userEvent.setup();
  const vendor = { id: 44, name: 'Band vendor', category: 'Music', phone: '+91 99341 26059', side: 'groom' as const, amount: 25000, paid_amount: 2000, attachments: [] };
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'login').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'events').mockResolvedValue([]);
  vi.spyOn(api, 'vendors').mockResolvedValue([vendor]);
  vi.spyOn(api, 'budgetSummary').mockResolvedValue({ planned_total: 25000, paid_total: 2000, due_total: 23000 });
  render(<App />);
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  await user.click(await screen.findByRole('button', { name: 'Open budget and vendors' }));
  expect(screen.getByRole('link', { name: '+91 99341 26059' })).toHaveAttribute('href', 'tel:+919934126059');
});

it('brings the vendor edit form into view after tapping a vendor pencil', async () => {
  const user = userEvent.setup();
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
  const vendor = { id: 44, name: 'Band vendor', category: 'Music', phone: '', side: 'groom' as const, amount: 25000, paid_amount: 2000, attachments: [] };
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'login').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'events').mockResolvedValue([]);
  vi.spyOn(api, 'vendors').mockResolvedValue([vendor]);
  vi.spyOn(api, 'budgetSummary').mockResolvedValue({ planned_total: 25000, paid_total: 2000, due_total: 23000 });
  render(<App />);
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  await user.click(await screen.findByRole('button', { name: 'Open budget and vendors' }));
  await user.click(screen.getByRole('button', { name: 'Edit Band vendor' }));
  expect(screen.getByRole('heading', { name: 'Edit vendor' })).toBeVisible();
  expect(scrollIntoView).toHaveBeenCalled();
});

it('brings the guest edit form into view after tapping a guest pencil', async () => {
  const user = userEvent.setup();
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'login').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'guests').mockResolvedValue([{ id: 9, name: 'Test family', side: 'bride', phone: null, note: '', all_events: true, event_ids: [1, 2, 3, 5] }]);
  vi.spyOn(api, 'summary').mockResolvedValue({ total: 1, bride_total: 1, groom_total: 0, events: [] });
  vi.spyOn(api, 'events').mockResolvedValue([]);
  const updateGuest = vi.spyOn(api, 'updateGuest').mockResolvedValue({ id: 9, name: 'Updated family', side: 'groom', phone: null, note: '', all_events: true, event_ids: [1, 2, 3, 5] });
  render(<App />);
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  await user.click(await screen.findByRole('button', { name: 'Open guests and RSVPs' }));
  await user.click(await screen.findByRole('button', { name: 'Edit Test family' }));
  expect(screen.getByRole('heading', { name: 'Edit guest or family' })).toBeVisible();
  expect(scrollIntoView).toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Guest or family name'));
  await user.type(screen.getByLabelText('Guest or family name'), 'Updated family');
  await user.click(screen.getByRole('radio', { name: 'Groom’s side' }));
  await user.click(screen.getByRole('button', { name: 'Save guest changes' }));
  expect(updateGuest).toHaveBeenCalledWith(9, 'Updated family', 'groom', true, [1, 2, 3, 5]);
});

it('searches guests and keeps the list in manageable pages', async () => {
  const user = userEvent.setup();
  const guests = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, name: index === 24 ? 'Puja Sharma family' : `Guest family ${index + 1}`, side: 'bride' as const, phone: null, note: '', all_events: true, event_ids: [1] }));
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'login').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'guests').mockResolvedValue(guests);
  vi.spyOn(api, 'summary').mockResolvedValue({ total: 25, bride_total: 25, groom_total: 0, events: [] });
  vi.spyOn(api, 'events').mockResolvedValue([]);
  render(<App />);
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  await user.click(await screen.findByRole('button', { name: 'Open guests and RSVPs' }));
  expect(screen.getByText('Guest family 1')).toBeVisible();
  expect(screen.queryByText('Puja Sharma family')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /next page/i }));
  expect(screen.getByText('Puja Sharma family')).toBeVisible();
  await user.type(screen.getByRole('searchbox', { name: /search guests/i }), 'puja');
  expect(screen.getByText('Puja Sharma family')).toBeVisible();
  expect(screen.queryByText('Guest family 1')).not.toBeInTheDocument();
});

it('keeps task creation on the Tasks page instead of Today', async () => {
  const user = userEvent.setup();
  vi.spyOn(api, 'me').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'login').mockResolvedValue({ username: 'sumit-puja' });
  vi.spyOn(api, 'tasks').mockResolvedValue([]);
  vi.spyOn(api, 'events').mockResolvedValue([]);
  render(<App />);
  expect(screen.queryByPlaceholderText('Add something to remember…')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /planner login/i }));
  await user.click((await screen.findAllByRole('button', { name: 'Tasks' }))[0]);
  expect(screen.getByPlaceholderText('Add something to remember…')).toBeVisible();
});
