"use client";

import { useEffect, useRef, useState } from "react";
import BalanceCard from "./BalanceCard";
import CurrencyBar from "./CurrencyBar";
import HistoryList from "./HistoryList";
import LoginView from "./LoginView";
import ParticipantSearch from "./ParticipantSearch";
import PaymentForm from "./PaymentForm";
import Receipt from "./Receipt";
import StatsPanel from "./StatsPanel";
import { ApiError, createApi, type PaymentInput } from "@/lib/api";
import { monogram } from "@/lib/demo";
import { describeError } from "@/lib/format";
import type {
  HistoryTransaction,
  Participant,
  PaymentResult,
  Stats,
} from "@/lib/types";

const STORAGE_KEY = "localito.session.v1";

interface Session {
  token: string;
  participant: Participant;
}

interface StoredSession {
  token: string;
  alias: string;
}

interface Notice {
  kind: "ok" | "error";
  text: string;
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession> | null;
    if (
      !parsed ||
      typeof parsed.token !== "string" ||
      typeof parsed.alias !== "string"
    ) {
      return null;
    }
    return { token: parsed.token, alias: parsed.alias };
  } catch {
    return null;
  }
}

function writeStoredSession(value: StoredSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in private mode; the demo still works in memory.
  }
}

export default function WalletApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [transactions, setTransactions] = useState<HistoryTransaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentResult | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loginPending, setLoginPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const tokenRef = useRef<string | null>(null);
  const refreshingRef = useRef(false);

  const [api] = useState(() =>
    createApi({
      getToken: () => tokenRef.current,
      onUnauthorized: () =>
        endSession("Tu sesión venció. Volvé a entrar con tu alias."),
    }),
  );

  function endSession(message?: string) {
    tokenRef.current = null;
    writeStoredSession(null);
    setSession(null);
    setParticipant(null);
    setTransactions([]);
    setStats(null);
    setReceipt(null);
    setTarget(null);
    setLastUpdated(null);
    if (message) setAuthError(message);
  }

  async function refreshAll(options: { silent?: boolean } = {}) {
    if (!tokenRef.current || refreshingRef.current) return;
    refreshingRef.current = true;
    if (!options.silent) setRefreshing(true);

    try {
      const [me, history, currentStats] = await Promise.all([
        api.me(),
        api.transactions(50),
        api.stats(),
      ]);
      setParticipant(me);
      setSession((current) =>
        current ? { ...current, participant: me } : current,
      );
      setTransactions(history.transactions);
      setStats(currentStats);
      setLastUpdated(new Date());
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 401) && !options.silent) {
        setNotice({ kind: "error", text: describeError(cause) });
      }
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const stored = readStoredSession();
    if (!stored) {
      setBooting(false);
      return;
    }

    tokenRef.current = stored.token;
    api
      .me()
      .then((me) => {
        if (cancelled) return;
        setSession({ token: stored.token, participant: me });
        setParticipant(me);
        setBooting(false);
        void refreshAll({ silent: true });
      })
      .catch((cause) => {
        if (cancelled) return;
        tokenRef.current = null;
        writeStoredSession(null);
        setBooting(false);
        if (!(cause instanceof ApiError && cause.status === 401)) {
          setAuthError(describeError(cause));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const tick = () => {
      if (document.visibilityState === "visible") {
        void refreshAll({ silent: true });
      }
    };

    const interval = window.setInterval(tick, 20000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [session?.token]);

  async function handleLogin(alias: string) {
    setLoginPending(true);
    setAuthError(null);
    try {
      const result = await api.login(alias);
      tokenRef.current = result.token;
      writeStoredSession({
        token: result.token,
        alias: result.participant.alias,
      });
      setSession({ token: result.token, participant: result.participant });
      setParticipant(result.participant);
      setReceipt(null);
      setNotice({
        kind: "ok",
        text: `Entraste como ${result.participant.display_name}.`,
      });
      await refreshAll({ silent: true });
    } catch (cause) {
      setAuthError(describeError(cause));
    } finally {
      setLoginPending(false);
    }
  }

  function handleLogout() {
    endSession();
    setAuthError(null);
    setNotice(null);
  }

  function handleSelect(selected: Participant) {
    setTarget(selected.alias);
  }

  async function handlePay(input: PaymentInput, idempotencyKey: string) {
    const result = await api.pay(input, idempotencyKey);
    setReceipt(result);
    setNotice({
      kind: "ok",
      text: result.idempotent_replay
        ? "Ese pago ya estaba registrado: no se duplicó."
        : `Pago confirmado a @${result.transaction.to.alias}.`,
    });
    await refreshAll({ silent: true });
  }

  async function handleReset() {
    if (!participant) return;
    const confirmed = window.confirm(
      "¿Reiniciar la demo? Se borran los movimientos y todos los saldos vuelven a cero.",
    );
    if (!confirmed) return;

    setResetting(true);
    setNotice(null);
    try {
      await api.resetDemo();
      const auth = await api.login(participant.alias);
      tokenRef.current = auth.token;
      writeStoredSession({ token: auth.token, alias: participant.alias });
      setSession({ token: auth.token, participant: auth.participant });
      setParticipant(auth.participant);
      setReceipt(null);
      setTarget(null);
      await refreshAll({ silent: true });
      setNotice({
        kind: "ok",
        text: "Demo reiniciada: saldos en cero y sesión renovada.",
      });
    } catch (cause) {
      setNotice({ kind: "error", text: describeError(cause) });
    } finally {
      setResetting(false);
    }
  }

  function viewHistory() {
    document
      .getElementById("history")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    void refreshAll();
  }

  if (booting) {
    return (
      <main className="booting">
        <div className="booting-card">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <p>Abriendo la libreta…</p>
        </div>
      </main>
    );
  }

  if (!session || !participant) {
    return (
      <LoginView
        onLogin={handleLogin}
        pending={loginPending}
        error={authError}
      />
    );
  }

  return (
    <div className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              L
            </span>
            <div>
              <p className="eyebrow">moneda local · demo</p>
              <p className="brand-name">Localito</p>
            </div>
          </div>

          <div className="topbar-actions">
            <span className="session-chip">
              <span className="monogram monogram-small" aria-hidden="true">
                {monogram(participant.display_name)}
              </span>
              <span className="session-text">
                <strong>{participant.display_name}</strong>
                <span>@{participant.alias}</span>
              </span>
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => void refreshAll()}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              {refreshing ? "Actualizando…" : "Actualizar"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={handleLogout}
            >
              Salir
            </button>
          </div>
        </header>

        {notice ? (
          <div
            className={`notice notice-${notice.kind}`}
            role={notice.kind === "error" ? "alert" : "status"}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              className="notice-close"
              onClick={() => setNotice(null)}
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </div>
        ) : null}

        <div className="layout">
          <div className="stack">
            <BalanceCard participant={participant} updatedAt={lastUpdated} />
            <CurrencyBar />
            <ParticipantSearch
              api={api}
              selfAlias={participant.alias}
              selectedAlias={target}
              onSelect={handleSelect}
            />
            <PaymentForm
              key={participant.alias}
              participant={participant}
              presetAlias={target}
              onPay={handlePay}
            />
            {receipt ? (
              <Receipt
                result={receipt}
                onClose={() => setReceipt(null)}
                onViewHistory={viewHistory}
              />
            ) : null}
          </div>

          <div className="stack">
            <StatsPanel
              stats={stats}
              resetting={resetting}
              onReset={() => void handleReset()}
            />
            <HistoryList
              transactions={transactions}
              refreshing={refreshing}
              onRefresh={() => void refreshAll()}
            />
          </div>
        </div>

        <footer className="footer">
          <span>
            Localito v0 · ledger local · los saldos se leen siempre de la API
          </span>
          <span>TL = 1 ARS nominal (provisional)</span>
        </footer>
      </div>
    </div>
  );
}
