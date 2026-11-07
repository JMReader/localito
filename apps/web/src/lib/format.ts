import { ApiError } from "./api";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Formats integer cents as ARS using the es-AR locale. */
export function formatCents(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return currencyFormatter.format(safe / 100);
}

export function formatSignedCents(
  cents: number,
  direction: "in" | "out",
): string {
  const sign = direction === "in" ? "+" : "−";
  return `${sign} ${formatCents(Math.abs(cents))}`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormatter.format(date);
}

export function formatTime(value: Date): string {
  return timeFormatter.format(value);
}

/**
 * Parses an Argentine-style amount ("1.500,50", "1500.50", "1500,5")
 * and returns integer cents. Returns null when the input is not a number.
 */
export function parseAmountToCents(raw: string): number | null {
  let value = raw.trim().replace(/\s/g, "").replace(/\$/g, "");
  if (!value) return null;

  let negative = false;
  if (value.startsWith("-")) {
    negative = true;
    value = value.slice(1);
  } else if (value.startsWith("+")) {
    value = value.slice(1);
  }

  if (!value || !/^[\d.,]+$/.test(value)) return null;

  let normalized: string;

  if (value.includes(",")) {
    const parts = value.split(",");
    if (parts.length > 2) return null;
    normalized = `${parts[0].replace(/\./g, "")}.${parts[1] ?? ""}`;
    if (normalized.startsWith(".")) normalized = `0${normalized}`;
  } else {
    const parts = value.split(".");
    if (parts.length > 2) return null;
    if (parts.length === 2) {
      const [whole, fraction] = parts;
      const looksLikeThousands =
        fraction.length === 3 && /^\d{1,3}$/.test(whole);
      normalized = looksLikeThousands
        ? `${whole}${fraction}`
        : `${whole}.${fraction}`;
    } else {
      normalized = value;
    }
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || !/[0-9]/.test(normalized)) return null;

  const cents = Math.round(amount * 100);
  return negative ? -cents : cents;
}

/** Formats integer cents for the amount input, e.g. 1500 -> "15,00". */
export function centsToAmountInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Builds a user-facing message. Raw `details` are never shown. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (
      error.code === "INSUFFICIENT_CREDIT" &&
      typeof error.details?.shortfall_cents === "number"
    ) {
      return `${error.message} Te faltan ${formatCents(
        error.details.shortfall_cents,
      )} de margen.`;
    }
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Algo salió mal. Probá de nuevo.";
}
