import {
  formatCents,
  formatDateTime,
  formatSignedCents,
} from "@/lib/format";
import type { HistoryTransaction } from "@/lib/types";

interface HistoryListProps {
  transactions: HistoryTransaction[];
  refreshing: boolean;
  onRefresh: () => void;
}

export default function HistoryList({
  transactions,
  refreshing,
  onRefresh,
}: HistoryListProps) {
  return (
    <section className="card history-card" id="history" aria-labelledby="history-title">
      <div className="section-head">
        <h2 id="history-title" className="section-title">
          Historial
        </h2>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={onRefresh}
          disabled={refreshing}
          aria-busy={refreshing}
        >
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {transactions.length === 0 ? (
        <p className="empty-state">
          Todavía no hay movimientos. Hacé un pago de prueba para estrenar la
          libreta.
        </p>
      ) : (
        <ul className="history-list">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="history-row">
              <span
                className={`direction direction-${transaction.direction}`}
                aria-hidden="true"
              >
                {transaction.direction === "in" ? "↙" : "↗"}
              </span>
              <span className="history-body">
                <span className="history-top">
                  <span className="history-name">
                    {transaction.counterparty.display_name}
                  </span>
                  <span
                    className={`history-amount history-amount-${transaction.direction}`}
                  >
                    {formatSignedCents(
                      transaction.amount_cents,
                      transaction.direction,
                    )}
                  </span>
                </span>
                <span className="history-meta">
                  <span>
                    {transaction.direction === "in" ? "Recibido" : "Enviado"} ·{" "}
                    {formatDateTime(transaction.created_at)}
                  </span>
                  <span>saldo {formatCents(transaction.balance_after_cents)}</span>
                </span>
                {transaction.note ? (
                  <span className="history-note">{transaction.note}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
