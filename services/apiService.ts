const API_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error en la petici\xF3n');
  return data;
}

export async function register(email: string, password: string, name: string) {
  const data = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) });
  localStorage.setItem('auth_token', data.token);
  return data;
}

export async function login(email: string, password: string) {
  const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  localStorage.setItem('auth_token', data.token);
  return data;
}

export function logout() {
  localStorage.removeItem('auth_token');
}

export async function getMe() {
  return apiFetch('/api/auth/me');
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}

export async function fetchMonths() {
  return apiFetch('/api/months');
}

export async function createMonth(name: string, participants: any[], emoji?: string) {
  // participants: [{ name: 'Gonza', splitPercentage: 50, isMe: true }, ...]
  return apiFetch('/api/months', {
    method: 'POST',
    body: JSON.stringify({ name, participants, emoji }),
  });
}

export async function updateMonth(id: string, data: { name?: string; emoji?: string; isClosed?: boolean; participants?: any[] }) {
  return apiFetch(`/api/months/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMonth(id: string) {
  return apiFetch(`/api/months/${id}`, { method: 'DELETE' });
}

export async function fetchMonthInvite(id: string) {
  return apiFetch(`/api/months/${id}/invite`);
}

export async function joinMonth(id: string, participantId: string) {
  return apiFetch(`/api/months/${id}/join`, {
    method: 'POST',
    body: JSON.stringify({ participantId })
  });
}

export async function fetchExpenses(monthId?: string) {
  const query = monthId ? `?monthId=${monthId}` : '';
  return apiFetch(`/api/expenses${query}`);
}

export async function createExpense(expense: {
  monthId: string;
  title: string;
  amount: number;
  payerParticipantId: string;
  date: string;
  category: string;
  note?: string;
}) {
  return apiFetch('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  });
}

export async function updateExpense(id: string, expense: Partial<{
  title: string;
  amount: number;
  payerParticipantId: string;
  date: string;
  category: string;
  note?: string;
}>) {
  return apiFetch(`/api/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(expense),
  });
}

export async function deleteExpense(id: string) {
  return apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
}

export async function reassignExpenses(monthId: string, fromParticipantId: string, toParticipantId: string) {
  return apiFetch(`/api/months/${monthId}/reassign`, {
    method: 'POST',
    body: JSON.stringify({ fromParticipantId, toParticipantId }),
  });
}
