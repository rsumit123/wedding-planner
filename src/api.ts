const API = 'https://wedding-api.skdev.one';

export type ApiTask = { id: number; title: string; assignee_name: string | null; due_date: string | null; event_id: number | null; status: 'open' | 'done' };
export type ApiGuest = { id: number; name: string; side: 'bride' | 'groom'; phone: string | null; note: string; all_events: boolean; event_ids: number[] };
export type ApiEvent = { id: number; slug: string; name: string; date: string; time_note: string };
export type GuestSummary = { total: number; bride_total: number; groom_total: number; events: Array<ApiEvent & { guest_count: number }> };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }, ...init });
  if (!response.ok) throw new Error(response.status === 401 ? 'Please sign in to manage the planner.' : 'Could not save your change.');
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
  summary: () => request<GuestSummary>('/guest-summary'),
  addGuest: (name: string, side: 'bride' | 'groom') => request<ApiGuest>('/guests', { method: 'POST', body: JSON.stringify({ name, side }) }),
  inviteGuest: (guestId: number, allEvents: boolean, eventIds: number[]) => request<{ id: number; token: string }>('/invitations', { method: 'POST', body: JSON.stringify({ guest_id: guestId, all_events: allEvents, event_ids: eventIds }) }),
  updateGuest: (id: number, name: string, side: 'bride' | 'groom', allEvents: boolean, eventIds: number[]) => request<ApiGuest>(`/guests/${id}`, { method: 'PATCH', body: JSON.stringify({ name, side, all_events: allEvents, event_ids: eventIds }) }),
};
