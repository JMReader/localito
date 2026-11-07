const API =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export interface Participant {
  id: string;
  alias: string;
  display_name: string;
  role: "member" | "merchant";
  status: string;
  balance_cents: number;
  credit_limit_cents: number;
  available_cents: number;
  max_positive_cents: number;
  receive_capacity_cents: number;
}

export interface Transaction {
  id: string;
  direction: "in" | "out";
  counterparty: { alias: string; display_name: string };
  amount_cents: number;
  note?: string;
  created_at: string;
  balance_after_cents: number;
}

export interface PaymentTransaction {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  from: { id: string; alias: string; display_name: string };
  to: { id: string; alias: string; display_name: string };
  note?: string | null;
  created_at: string;
  balance_after_cents: number;
  counterparty_balance_after_cents: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

async function request<T>(
  path: string,
  token?: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw (
      data.error ?? {
        code: "NETWORK_ERROR",
        message: "No se pudo hablar con la API.",
      }
    ) as ApiError;
  }
  return data as T;
}

export function login(alias: string) {
  return request<{ token: string; participant: Participant }>(
    "/auth/demo",
    undefined,
    { method: "POST", body: JSON.stringify({ alias }) }
  );
}

export function getMe(token: string) {
  return request<Participant>("/me", token);
}

export function getParticipants(token: string, q?: string) {
  return request<{ participants: Participant[] }>(
    `/participants${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    token
  );
}

export function getTransactions(token: string, limit = 50) {
  return request<{ transactions: Transaction[] }>(
    `/transactions?limit=${limit}`,
    token
  );
}

export function pay(
  token: string,
  to: string,
  amountCents: number,
  note?: string,
  idempotencyKey?: string
) {
  return request<{ transaction: PaymentTransaction; idempotent_replay: boolean }>(
    "/payments",
    token,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey ?? crypto.randomUUID() },
      body: JSON.stringify({ to, amount_cents: amountCents, note }),
    }
  );
}
