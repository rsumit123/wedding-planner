const API = 'https://wedding-api.skdev.one';

export type ApiTask = { id: number; title: string; assignee_name: string | null; due_date: string | null; event_id: number | null; status: 'open' | 'done' };

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
};
