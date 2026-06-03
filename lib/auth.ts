/**
 * lib/auth.ts
 * -----------
 * Low-level auth helpers that talk to the custom FastAPI auth endpoints.
 * All tokens are stored in HttpOnly cookies managed by the backend.
 * The only client-side value is the CSRF token (readable non-HttpOnly cookie).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── CSRF helper ─────────────────────────────────────────────────────────────

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  skipCsrf?: boolean;
}

export async function authFetch(path: string, options: FetchOptions = {}): Promise<Response> {
  const { skipCsrf = false, headers: extraHeaders = {}, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (!skipCsrf) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  return fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers,
    ...rest,
  });
}

// ─── Auth operations ──────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  native_language: string;
  learning_level: string;
  daily_goal: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  role: string;
  status: string;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: UserProfile;
}

export async function login(email: string, password: string, deviceName?: string): Promise<UserProfile> {
  const res = await authFetch('/auth/login', {
    method: 'POST',
    skipCsrf: true, // no CSRF token yet before login
    body: JSON.stringify({ email, password, device_name: deviceName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(err.detail || 'Erro ao fazer login');
  }
  const data: AuthResponse = await res.json();
  return data.user;
}

export async function signup(
  email: string,
  password: string,
  username?: string,
  fullName?: string,
): Promise<UserProfile> {
  const res = await authFetch('/auth/signup', {
    method: 'POST',
    skipCsrf: true,
    body: JSON.stringify({ email, password, username, full_name: fullName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(err.detail || 'Erro ao criar conta');
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await authFetch('/auth/logout', { method: 'POST' });
}

export async function refreshTokens(): Promise<boolean> {
  const res = await authFetch('/auth/refresh', {
    method: 'POST',
    skipCsrf: true, // refresh endpoint exempted on backend
  });
  return res.ok;
}

export async function getMe(): Promise<UserProfile | null> {
  const res = await authFetch('/auth/me', { skipCsrf: true });
  if (!res.ok) return null;
  return res.json();
}

export async function forgotPassword(email: string): Promise<void> {
  await authFetch('/auth/forgot-password', {
    method: 'POST',
    skipCsrf: true,
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await authFetch('/auth/reset-password', {
    method: 'POST',
    skipCsrf: true,
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(err.detail || 'Erro ao redefinir senha');
  }
}
