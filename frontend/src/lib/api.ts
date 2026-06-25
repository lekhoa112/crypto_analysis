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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

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
