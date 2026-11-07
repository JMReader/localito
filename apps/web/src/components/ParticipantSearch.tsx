"use client";

import { useEffect, useState } from "react";
import type { LocalitoApi } from "@/lib/api";
import { monogram, roleLabel } from "@/lib/demo";
import { describeError, formatCents } from "@/lib/format";
import type { Participant } from "@/lib/types";

interface ParticipantSearchProps {
  api: LocalitoApi;
  selfAlias: string;
  selectedAlias: string | null;
  onSelect: (participant: Participant) => void;
}

export default function ParticipantSearch({
  api,
  selfAlias,
  selectedAlias,
  onSelect,
}: ParticipantSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timeout = window.setTimeout(
      () => {
        api
          .participants(query)
          .then((data) => {
            if (cancelled) return;
            setResults(
              data.participants.filter(
                (participant) => participant.alias !== selfAlias,
              ),
            );
            setError(null);
          })
          .catch((cause) => {
            if (cancelled) return;
            setError(describeError(cause));
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      },
      query.trim() ? 250 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [api, query, selfAlias]);

  return (
    <section className="card search-card" aria-labelledby="search-title">
      <div className="section-head">
        <h2 id="search-title" className="section-title">
          Buscar participante
        </h2>
        <span className="section-kicker">alias o nombre</span>
      </div>

      <div className="search-form">
        <label className="field-label" htmlFor="participant-query">
          Vecinos y comercios
        </label>
        <input
          id="participant-query"
          className="input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ej. kiosco, café, ana"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="search-summary" aria-live="polite">
        {loading
          ? "Buscando…"
          : `${results.length} ${results.length === 1 ? "resultado" : "resultados"}`}
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="participant-list">
        {results.map((participant) => {
          const selected = participant.alias === selectedAlias;
          return (
            <li key={participant.id} className="participant-row">
              <span className="monogram monogram-small" aria-hidden="true">
                {monogram(participant.display_name)}
              </span>
              <span className="participant-info">
                <span className="participant-name">
                  {participant.display_name}
                </span>
                <span className="participant-meta">
                  @{participant.alias} · {roleLabel(participant.role)} · saldo{" "}
                  {formatCents(participant.balance_cents)}
                </span>
              </span>
              <button
                type="button"
                className={`btn btn-small ${selected ? "btn-secondary" : "btn-primary"}`}
                onClick={() => onSelect(participant)}
                aria-pressed={selected}
              >
                {selected ? "Elegido" : "Pagar"}
              </button>
            </li>
          );
        })}
      </ul>

      {!loading && !error && results.length === 0 ? (
        <p className="empty-state">
          No encontramos a nadie con ese alias. Probá con kiosco, cafe o bruno.
        </p>
      ) : null}
    </section>
  );
}
