import { formatCents } from "@/lib/format";
import type { Stats } from "@/lib/types";

interface StatsPanelProps {
  stats: Stats | null;
  resetting: boolean;
  onReset: () => void;
}

export default function StatsPanel({
  stats,
  resetting,
  onReset,
}: StatsPanelProps) {
  return (
    <section className="card stats-card" aria-labelledby="stats-title">
      <div className="section-head">
        <h2 id="stats-title" className="section-title">
          Circuito
        </h2>
        <span className="section-kicker">stats</span>
      </div>

      {stats ? (
        <>
          <div className="zero-sum">
            <span
              className={`status-dot ${stats.zero_sum_ok ? "is-ok" : "is-bad"}`}
              aria-hidden="true"
            />
            <span>
              {stats.zero_sum_ok
                ? "Circuito cerrado: los saldos suman cero"
                : "Atención: los saldos no suman cero"}
            </span>
          </div>

          <dl className="stats-grid">
            <div>
              <dt>Volumen</dt>
              <dd>{formatCents(stats.total_volume_cents)}</dd>
            </div>
            <div>
              <dt>Movimientos</dt>
              <dd>{stats.transaction_count}</dd>
            </div>
            <div>
              <dt>Participantes</dt>
              <dd>{stats.participant_count}</dd>
            </div>
            <div>
              <dt>Suma de saldos</dt>
              <dd>{formatCents(stats.sum_balances_cents)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="empty-state">Todavía no pudimos leer las estadísticas.</p>
      )}

      <div className="reset-block">
        <button
          type="button"
          className="btn btn-destructive btn-block"
          onClick={onReset}
          disabled={resetting}
        >
          {resetting ? "Reiniciando…" : "Reiniciar demo"}
        </button>
        <p className="hint hint-small">
          Borra movimientos y deja todos los saldos en cero. Sólo funciona con
          el backend en modo demo.
        </p>
      </div>
    </section>
  );
}
