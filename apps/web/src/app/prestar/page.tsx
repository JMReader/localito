import PrestarCard from "@/components/PrestarCard";

export default function PrestarPage() {
  return (
    <div className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              P
            </span>
            <div>
              <p className="eyebrow">crédito mutuo local · Arbitrum One</p>
              <p className="brand-name">PREStAR</p>
            </div>
          </div>

          <div className="topbar-actions">
            <a className="btn btn-ghost btn-small" href="/">
              Abrir Localito
            </a>
          </div>
        </header>

        <PrestarCard />

        <section className="card" aria-labelledby="prestar-how-title">
          <div className="section-head">
            <h2 id="prestar-how-title" className="section-title">
              Cómo funciona
            </h2>
            <span className="demo-chip">no auditado</span>
          </div>
          <dl className="argt-rows">
            <div>
              <dt>PRt</dt>
              <dd>
                Crédito mutuo en centavos (2 decimales) con saldo firmado. No es
                ERC-20 ni se puede transferir por fuera del contrato. La suma de
                todos los saldos, incluida la reserva, es cero.
              </dd>
            </div>
            <div>
              <dt>Pago</dt>
              <dd>
                Pagás PRt a la wallet de otro miembro activo. Podés usar tu línea
                de crédito hasta el límite que asigne un broker.
              </dd>
            </div>
            <div>
              <dt>ARGt ↔ PRt</dt>
              <dd>
                Depósito 1:1 nominal contra una reserva de ARGt custodiada por el
                contrato. El retiro sale de esa reserva limitada, por orden de
                llegada; si no alcanza, revierte.
              </dd>
            </div>
            <div>
              <dt>Localito</dt>
              <dd>
                El flujo de moneda local está en{" "}
                <a className="argt-link" href="/">
                  la app principal
                </a>
                . Sus balances no son PRt ni on-chain.
              </dd>
            </div>
          </dl>
        </section>

        <footer className="footer">
          <span>
            PREStAR v0.2 · propuesta pendiente de revisión de Oky y legal
          </span>
          <span>PRt ≠ moneda de curso legal · sin garantía de convertibilidad</span>
        </footer>
      </div>
    </div>
  );
}
