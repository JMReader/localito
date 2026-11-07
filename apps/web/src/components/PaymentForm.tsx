"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { PaymentInput } from "@/lib/api";
import {
  centsToAmountInput,
  describeError,
  formatCents,
  parseAmountToCents,
} from "@/lib/format";
import type { Participant } from "@/lib/types";

interface PaymentFormProps {
  participant: Participant;
  presetAlias: string | null;
  onPay: (input: PaymentInput, idempotencyKey: string) => Promise<void>;
}

interface Attempt {
  signature: string;
  key: string;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function PaymentForm({
  participant,
  presetAlias,
  onPay,
}: PaymentFormProps) {
  const [to, setTo] = useState(presetAlias ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef<Attempt | null>(null);

  useEffect(() => {
    if (!presetAlias) return;
    setTo(presetAlias);
    setError(null);
    attemptRef.current = null;
  }, [presetAlias]);

  const parsedCents = parseAmountToCents(amount);
  const previewCents =
    parsedCents !== null && parsedCents > 0 ? parsedCents : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const target = to.trim().toLowerCase();
    if (!target) {
      setError("Elegí a quién le querés pagar.");
      return;
    }
    if (target === participant.alias) {
      setError("No podés pagarte a vos mismo.");
      return;
    }

    const cents = parseAmountToCents(amount);
    if (cents === null || cents <= 0) {
      setError("Ingresá un monto mayor a cero. Ejemplo: 1.500,00");
      return;
    }

    const trimmedNote = note.trim();
    const signature = JSON.stringify([target, cents, trimmedNote]);
    if (
      !attemptRef.current ||
      attemptRef.current.signature !== signature
    ) {
      attemptRef.current = { signature, key: crypto.randomUUID() };
    }
    const idempotencyKey = attemptRef.current.key;

    setPending(true);
    try {
      await onPay(
        {
          to: target,
          amount_cents: cents,
          ...(trimmedNote ? { note: trimmedNote } : {}),
        },
        idempotencyKey,
      );
      attemptRef.current = null;
      setAmount("");
      setNote("");
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card pay-card" aria-labelledby="pay-title">
      <div className="section-head">
        <h2 id="pay-title" className="section-title">
          Pagar
        </h2>
        <span className="section-kicker">TL → TL</span>
      </div>

      <form className="pay-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="pay-to">
            Para
          </label>
          <input
            id="pay-to"
            className="input input-mono"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setError(null);
            }}
            placeholder="alias (ej. kiosco)"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <p className="hint">
            Elegí un contacto arriba o escribí el alias directamente.
          </p>
        </div>

        <div className="field">
          <div className="field-label-row">
            <label className="field-label" htmlFor="pay-amount">
              Monto
            </label>
            <span className="hint-inline">en pesos</span>
          </div>
          <div className="amount-wrap">
            <span className="amount-prefix" aria-hidden="true">
              $
            </span>
            <input
              id="pay-amount"
              className="input amount-input"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              placeholder="0,00"
              inputMode="decimal"
              autoComplete="off"
            />
            <span className="amount-unit" aria-hidden="true">
              ARS
            </span>
          </div>
          <div className="amount-meta">
            <span className="amount-preview">
              {previewCents
                ? `Se paga ${formatCents(previewCents)}`
                : "El backend recibe centavos enteros"}
            </span>
            <div className="quick-amounts">
              {QUICK_AMOUNTS.map((cents) => (
                <button
                  key={cents}
                  type="button"
                  className="chip-button"
                  onClick={() => {
                    setAmount(centsToAmountInput(cents));
                    setError(null);
                  }}
                >
                  {formatCents(cents)}
                </button>
              ))}
              <button
                type="button"
                className="chip-button"
                onClick={() => {
                  setAmount(
                    centsToAmountInput(Math.max(participant.available_cents, 0)),
                  );
                  setError(null);
                }}
              >
                Usar margen
              </button>
            </div>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pay-note">
            Nota <span className="muted">(opcional)</span>
          </label>
          <input
            id="pay-note"
            className="input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="ej. compra de demo"
            maxLength={140}
            autoComplete="off"
          />
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={pending}
        >
          {pending
            ? "Enviando pago…"
            : previewCents
              ? `Pagar ${formatCents(previewCents)}`
              : "Pagar"}
        </button>

        <p className="hint hint-small">
          Cada intento usa una Idempotency-Key. Si reintentás el mismo pago, se
          reutiliza y no se duplica.
        </p>
      </form>
    </section>
  );
}
