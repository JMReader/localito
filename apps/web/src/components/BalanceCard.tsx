import { roleLabel } from "@/lib/demo";
import { formatCents, formatTime } from "@/lib/format";
import type { Participant } from "@/lib/types";

interface BalanceCardProps {
  participant: Participant;
  updatedAt: Date | null;
}

export default function BalanceCard({
  participant,
  updatedAt,
}: BalanceCardProps) {
  const negative = participant.balance_cents < 0;

  return (
    <section className="card balance-card" aria-labelledby="balance-title">
      <div className="balance-top">
        <div>
          <p className="eyebrow eyebrow-light">Saldo actual</p>
          <h2
            id="balance-title"
            className={`balance-amount${negative ? " is-negative" : ""}`}
          >
            {formatCents(participant.balance_cents)}
          </h2>
          <p className="balance-currency">
            TL · 1 unidad = 1 ARS nominal
            <span className="dot-separator">·</span>
            {roleLabel(participant.role)}
          </p>
        </div>
        <div className="balance-stamp" aria-hidden="true">
          <span>LOCALITO</span>
          <span>DEMO</span>
          <span>v0.1</span>
        </div>
      </div>

      <dl className="balance-rows">
        <div>
          <dt>Límite de crédito</dt>
          <dd>{formatCents(participant.credit_limit_cents)}</dd>
        </div>
        <div>
          <dt>Margen para pagar</dt>
          <dd>{formatCents(participant.available_cents)}</dd>
        </div>
        <div>
          <dt>Puede recibir</dt>
          <dd>{formatCents(participant.receive_capacity_cents)}</dd>
        </div>
      </dl>

      <p className="balance-foot">
        <span>
          {participant.display_name} · @{participant.alias}
        </span>
        <span>
          {updatedAt ? `Actualizado ${formatTime(updatedAt)}` : "Sin datos"}
        </span>
      </p>
    </section>
  );
}
