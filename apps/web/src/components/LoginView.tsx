"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { DEMO_ALIASES, monogram, roleLabel } from "@/lib/demo";

interface LoginViewProps {
  onLogin: (alias: string) => void;
  pending: boolean;
  error: string | null;
}

export default function LoginView({
  onLogin,
  pending,
  error,
}: LoginViewProps) {
  const [alias, setAlias] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = alias.trim().toLowerCase();
    if (clean) onLogin(clean);
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <header className="login-brand">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <div>
            <p className="eyebrow">moneda local · demo</p>
            <h1 id="login-title" className="login-title">
              Localito
            </h1>
          </div>
        </header>

        <p className="login-lead">
          Entrá con un alias para ver tu saldo, pagar y consultar el historial
          del ledger de demo.
        </p>

        <p className="login-note">
          Sin dinero real y sin blockchain. Los saldos viven en un ledger local
          que podés reiniciar; no son fuente de verdad on-chain.
        </p>

        <div className="alias-grid" role="group" aria-label="Alias de demo">
          {DEMO_ALIASES.map((item) => (
            <button
              key={item.alias}
              type="button"
              className="alias-card"
              onClick={() => onLogin(item.alias)}
              disabled={pending}
            >
              <span className="monogram" aria-hidden="true">
                {monogram(item.name)}
              </span>
              <span className="alias-copy">
                <span className="alias-name">{item.name}</span>
                <span className="alias-meta">
                  @{item.alias} · {roleLabel(item.role)}
                </span>
              </span>
            </button>
          ))}
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="alias-input">
            Otro alias
          </label>
          <div className="login-input-row">
            <input
              id="alias-input"
              className="input input-mono"
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              placeholder="ej. ana"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={pending}
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={pending || alias.trim().length === 0}
            >
              {pending ? "Entrando…" : "Entrar"}
            </button>
          </div>
        </form>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="login-foot">
          <span>TL · moneda local</span>
          <a className="argt-link" href="/prestar">
            Ir a PREStAR
          </a>
        </footer>
      </section>

      <aside className="login-aside" aria-hidden="true">
        <p className="login-aside-title">Moneda local.</p>
        <p>
          Los miembros se acreditan y debitan entre sí. La suma de todos los
          saldos es cero.
        </p>
        <div className="login-aside-rule" />
        <p className="login-aside-small">demo · localhost:3000/localito</p>
      </aside>
    </main>
  );
}
