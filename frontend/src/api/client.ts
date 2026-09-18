// API base URL — reads from env in production, proxied in dev
const rawUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const cleanUrl = rawUrl.replace(/\/api\/v1\/?$/, '');

const API_BASE = cleanUrl
  ? `${cleanUrl}/api/v1`
  : '/api/v1';

const WS_BASE = cleanUrl
  ? cleanUrl.replace(/^http/, 'ws')
  : `ws://${window.location.host}`;

export { WS_BASE };

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

export interface PollSettings {
  allow_multiple: boolean;
  is_anonymous: boolean;
  require_auth: boolean;
}

export interface Poll {
  id: string;
  creator_id: string;
  share_code: string;
  title: string;
  description?: string;
  options: PollOption[];
  settings: PollSettings;
  is_active: boolean;
  total_votes: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface VoteTally {
  share_code: string;
  total_voters: number;
  counts: Record<string, number>;
  updated_at: string;
}

export interface ApiError {
  error: string;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body: ApiError = await res.json();
      message = body.error || message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    signup: (username: string, email: string, password: string) =>
      request<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      }),

    login: (email: string, password: string) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },

  polls: {
    create: (
      token: string,
      data: { title: string; description?: string; options: { text: string }[]; expires_at?: string },
    ) =>
      request<Poll>('/polls', { method: 'POST', body: JSON.stringify(data) }, token),

    getByShareCode: (shareCode: string) =>
      request<Poll>(`/polls/${shareCode}`),

    getMyPolls: (token: string) =>
      request<{ polls: Poll[]; count: number }>('/polls/me', {}, token),

    close: (token: string, shareCode: string) =>
      request<Poll>(`/polls/${shareCode}/close`, { method: 'PUT' }, token),
  },

  votes: {
    cast: (shareCode: string, optionId: string, token?: string | null) =>
      request<VoteTally>(`/polls/${shareCode}/vote`, {
        method: 'POST',
        body: JSON.stringify({ option_id: optionId }),
      }, token),
  },
};
