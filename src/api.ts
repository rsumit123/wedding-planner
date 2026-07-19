const API = 'https://wedding-api.skdev.one';

export type Attachment = { id: number; filename: string; mime_type: string; url: string };
export type ApiTask = { id: number; title: string; assignee_name: string | null; due_date: string | null; event_id: number | null; status: 'open' | 'done' };
export type ApiGuest = { id: number; name: string; side: 'bride' | 'groom'; phone: string | null; note: string; all_events: boolean; event_ids: number[] };
export type ApiEvent = { id: number; slug: string; name: string; date: string; time_note: string; venue: string; side: 'bride' | 'groom' | 'both'; attachments: Attachment[] };
export type GuestSummary = { total: number; bride_total: number; groom_total: number; events: Array<ApiEvent & { guest_count: number }> };
export type ApiVendor = { id: number; name: string; category: string; phone: string; side: 'bride' | 'groom' | 'both'; amount: number; paid_amount: number; attachments: Attachment[] };
export type BudgetSummary = { planned_total: number; paid_total: number; due_total: number };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }, ...init });
  if (!response.ok) throw new Error(response.status === 401 ? 'Please sign in to manage the planner.' : 'Could not save your change.');
  return response.json() as Promise<T>;
}

async function upload<T>(path: string, file: File): Promise<T> {
  const form = new FormData(); form.append('file', file);
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { credentials: 'include', method: 'POST', body: form });
  } catch {
    throw new Error('Could not reach the wedding API. Check your connection and try again.');
  }
  if (response.status === 413) throw new Error('Image is too large. Please choose a file under 8 MB.');
  if (!response.ok) throw new Error('Could not upload this image.');
  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<{ username: string }>('/auth/me'),
  login: (username: string, password: string) => request<{ username: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  tasks: () => request<ApiTask[]>('/tasks'),
  addTask: (title: string) => request<ApiTask>('/tasks', { method: 'POST', body: JSON.stringify({ title }) }),
  updateTask: (id: number, status: 'open' | 'done') => request<ApiTask>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  guests: () => request<ApiGuest[]>('/guests'),
  events: () => request<ApiEvent[]>('/events'),
  publicEvents: () => request<ApiEvent[]>('/public/events'),
  addEvent: (name: string, date: string, timeNote: string, venue: string, side: 'bride' | 'groom' | 'both') => request<ApiEvent>('/events', { method: 'POST', body: JSON.stringify({ name, date, time_note: timeNote, venue, side }) }),
  updateEvent: (id: number, name: string, date: string, timeNote: string, venue: string, side: 'bride' | 'groom' | 'both') => request<ApiEvent>(`/events/${id}`, { method: 'PATCH', body: JSON.stringify({ name, date, time_note: timeNote, venue, side }) }),
  deleteEvent: (id: number) => request<{ ok: boolean }>(`/events/${id}`, { method: 'DELETE' }),
  summary: () => request<GuestSummary>('/guest-summary'),
  addGuest: (name: string, side: 'bride' | 'groom') => request<ApiGuest>('/guests', { method: 'POST', body: JSON.stringify({ name, side }) }),
  inviteGuest: (guestId: number, allEvents: boolean, eventIds: number[]) => request<{ id: number; token: string }>('/invitations', { method: 'POST', body: JSON.stringify({ guest_id: guestId, all_events: allEvents, event_ids: eventIds }) }),
  updateGuest: (id: number, name: string, side: 'bride' | 'groom', allEvents: boolean, eventIds: number[]) => request<ApiGuest>(`/guests/${id}`, { method: 'PATCH', body: JSON.stringify({ name, side, all_events: allEvents, event_ids: eventIds }) }),
  vendors: () => request<ApiVendor[]>('/vendors'),
  budgetSummary: () => request<BudgetSummary>('/budget-summary'),
  addVendor: (name: string, category: string, phone: string, side: 'bride' | 'groom' | 'both', amount: number, paidAmount: number) => request<ApiVendor>('/vendors', { method: 'POST', body: JSON.stringify({ name, category, phone, side, amount, paid_amount: paidAmount }) }),
  updateVendor: (id: number, name: string, category: string, phone: string, side: 'bride' | 'groom' | 'both', amount: number, paidAmount: number) => request<ApiVendor>(`/vendors/${id}`, { method: 'PATCH', body: JSON.stringify({ name, category, phone, side, amount, paid_amount: paidAmount }) }),
  deleteVendor: (id: number) => request<{ ok: boolean }>(`/vendors/${id}`, { method: 'DELETE' }),
  uploadVendorAttachment: (id: number, file: File) => upload<Attachment>(`/vendors/${id}/attachments`, file),
  uploadEventAttachment: (id: number, file: File) => upload<Attachment>(`/events/${id}/attachments`, file),
  deleteAttachment: (id: number) => request<{ ok: boolean }>(`/attachments/${id}`, { method: 'DELETE' }),
  attachmentUrl: (path: string) => `${API}${path}`,
};
