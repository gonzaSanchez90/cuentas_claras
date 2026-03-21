// ============================================================
// API Service - Comunicación con el backend
// ============================================================
// Este servicio centraliza TODAS las llamadas al servidor.
// Cada función hace un fetch() al backend y devuelve los datos.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Helper para hacer requests autenticadas ---
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error en la petición');
  }

  return data;
}

// ============================================================
// AUTH - Registro, Login, Usuario actual
// ============================================================

export async function register(email: string, password: string, name: string) {
  const data = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  // Guardar el token en localStorage
  localStorage.setItem('auth_token', data.token);
  return data;
}

export async function login(email: string, password: string) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
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

// ============================================================
// MONTHS - CRUD de meses
// ============================================================

export async function fetchMonths() {
  return apiFetch('/api/months');
}

export async function createMonth(name: string, splitRatio: number) {
  const id = Math.random().toString(36).substring(2, 9);
  return apiFetch('/api/months', {
    method: 'POST',
    body: JSON.stringify({ id, name, splitRatio }),
  });
}

export async function updateMonth(id: string, data: { name?: string; splitRatio?: number; isClosed?: boolean }) {
  return apiFetch(`/api/months/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMonth(id: string) {
  return apiFetch(`/api/months/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================
// EXPENSES - CRUD de gastos
// ============================================================

export async function fetchExpenses(monthId?: string) {
  const query = monthId ? `?monthId=${monthId}` : '';
  return apiFetch(`/api/expenses${query}`);
}

export async function createExpense(expense: {
  monthId: string;
  title: string;
  amount: number;
  payer: string;
  date: string;
  category: string;
  note?: string;
}) {
  const id = Math.random().toString(36).substring(2, 9);
  return apiFetch('/api/expenses', {
    method: 'POST',
    body: JSON.stringify({ id, ...expense }),
  });
}

export async function updateExpense(id: string, data: Record<string, any>) {
  return apiFetch(`/api/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(id: string) {
  return apiFetch(`/api/expenses/${id}`, {
    method: 'DELETE',
  });
}
