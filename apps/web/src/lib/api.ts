import type {
  AuthResult,
  ParticipantsResponse,
  PaymentResult,
  Stats,
  TransactionsResponse,
} from "./types";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"
).replace(/\/+$/, "");

export interface ApiErrorDetails {
  [key: string]: unknown;
}

interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: ApiErrorDetails;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetails;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetails,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ClientOptions {
  getToken: () => string | null;
  onUnauthorized?: () => void;
}

export interface PaymentInput {
  to: string;
  amount_cents: number;
  note?: string;
}

/**
 * Thin client for the Localito API v0. It never computes balances: every
 * monetary field comes straight from the backend response.
 */
export class LocalitoApi {
  private readonly options: ClientOptions;

  constructor(options: ClientOptions) {
    this.options = options;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    const token = this.options.getToken();

    if (init.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        cache: "no-store",
      });
    } catch {
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        `No pudimos conectar con la API (${API_BASE_URL}). Revisá que el backend esté corriendo.`,
      );
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        this.options.onUnauthorized?.();
      }

      const errorBody = (payload as { error?: ApiErrorBody } | null)?.error;
      throw new ApiError(
        response.status,
        errorBody?.code ?? `HTTP_${response.status}`,
        errorBody?.message ?? "La operación falló. Probá de nuevo.",
        errorBody?.details,
      );
    }

    return payload as T;
  }

  login(alias: string): Promise<AuthResult> {
    return this.request<AuthResult>("/auth/demo", {
      method: "POST",
      body: JSON.stringify({ alias }),
    });
  }

  me() {
    return this.request<AuthResult["participant"]>("/me");
  }

  participants(query = ""): Promise<ParticipantsResponse> {
    const trimmed = query.trim();
    const suffix = trimmed ? `?q=${encodeURIComponent(trimmed)}` : "";
    return this.request<ParticipantsResponse>(`/participants${suffix}`);
  }

  pay(input: PaymentInput, idempotencyKey: string): Promise<PaymentResult> {
    return this.request<PaymentResult>("/payments", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(input),
    });
  }

  transactions(limit = 50): Promise<TransactionsResponse> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    return this.request<TransactionsResponse>(
      `/transactions?limit=${safeLimit}`,
    );
  }

  stats(): Promise<Stats> {
    return this.request<Stats>("/stats");
  }

  resetDemo(): Promise<{ reset: boolean }> {
    return this.request<{ reset: boolean }>("/demo/reset", {
      method: "POST",
      body: JSON.stringify({ confirm: "reset" }),
    });
  }
}

export function createApi(options: ClientOptions): LocalitoApi {
  return new LocalitoApi(options);
}
