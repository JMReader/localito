import { formatCents, formatDateTime } from "@/lib/format";
import type { PaymentResult } from "@/lib/types";

interface ReceiptProps {
  result: PaymentResult;
  onClose: () => void;
  onViewHistory: () => void;
}

export default function Receipt({
  result,
  onClose,
  onViewHistory,
}: ReceiptProps) {
  const { transaction, idempotent_replay: replay } = result;

  return (
    <section className="card receipt" aria-labelledby="receipt-title">
      <div className="receipt-head">
        <div>
          <p className="eyebrow">Recibo</p>
          <h2 id="receipt-title">
            {replay ? "Pago ya registrado" : "Pago confirmado"}
          </h2>
        </div>
        <span className="receipt-stamp" aria-hidden="true">
          CONFIRMADO
        </span>
      </div>

      <p className="receipt-amount">{formatCents(transaction.amount_cents)}</p>
      <p className="receipt-route">
        {transaction.from.display_name}
        <span aria-hidden="true"> → </span>
        {transaction.to.display_name}
      </p>

      {replay ? (
        <p className="receipt-replay">
          Este pago ya estaba registrado: no se movió saldo de nuevo.
        </p>
      ) : null}

      <dl className="receipt-grid">
        <div>
          <dt>Para</dt>
          <dd>@{transaction.to.alias}</dd>
        </div>
        <div>
          <dt>Nota</dt>
          <dd>{transaction.note || "—"}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{formatDateTime(transaction.created_at)}</dd>
        </div>
        <div>
          <dt>Tu saldo después</dt>
          <dd>{formatCents(transaction.balance_after_cents)}</dd>
        </div>
      </dl>

      <p className="receipt-id">ID {transaction.id}</p>

      <div className="receipt-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cerrar recibo
        </button>
        <button type="button" className="btn btn-primary" onClick={onViewHistory}>
          Ver historial
        </button>
      </div>
    </section>
  );
}
