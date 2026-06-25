export type Wallet = {
  id: string;
  address: string;
  chain: string;
  label: string;
  is_active: boolean;
  created_at: string;
};

export type Alert = {
  id: string;
  transaction_id: string;
  wallet_address: string;
  chain: string;
  title: string;
  message: string;
  usd_value: number;
  sent_telegram: boolean;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const ACCESS_TOKEN_KEY = "crypto_analysis_access_token";
const REFRESH_TOKEN_KEY = "crypto_analysis_refresh_token";

export function getAuthTokens() {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null };
  }

  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function setAuthTokens(tokens: TokenPair) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearAuthTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken } = getAuthTokens();
  if (!refreshToken) {
    return false;
  }

  try {
    const tokens = await request<TokenPair>(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
      false,
    );
    setAuthTokens(tokens);
    return true;
  } catch {
    clearAuthTokens();
    return false;
  }
}

async function request<T>(path: string, init?: RequestInit, retryOnUnauthorized = true): Promise<T> {
  const { accessToken } = getAuthTokens();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, init, false);
    }
    clearAuthTokens();
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (payload: { email: string; password: string }) =>
    request<TokenPair>("/auth/login", { method: "POST", body: JSON.stringify(payload) }, false),
  register: (payload: { email: string; password: string; confirm_password: string; full_name?: string }) =>
    request<User>("/auth/register", { method: "POST", body: JSON.stringify(payload) }, false),
  logout: (refresh_token: string) =>
    request<{ message: string }>("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token }) }, false),
  me: () => request<User>("/auth/me"),
  listWallets: () => request<Wallet[]>("/wallets"),
  createWallet: (payload: { address: string; chain: string; label: string }) =>
    request<Wallet>("/wallets", { method: "POST", body: JSON.stringify(payload) }),
  updateWallet: (id: string, payload: { label?: string; is_active?: boolean }) =>
    request<Wallet>(`/wallets/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteWallet: (id: string) => request<void>(`/wallets/${id}`, { method: "DELETE" }),
  listAlerts: () => request<Alert[]>("/alerts"),
  getThreshold: () => request<{ threshold_usd: number }>("/settings/threshold"),
  updateThreshold: (threshold_usd: number) =>
    request<{ threshold_usd: number }>("/settings/threshold", {
      method: "PUT",
      body: JSON.stringify({ threshold_usd }),
    }),
};

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
