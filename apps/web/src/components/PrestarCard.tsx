"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, isAddress, zeroAddress, type Address, type Hash } from "viem";

import {
  chainLabel,
  describeWalletError,
  getInjectedProvider,
  normalizeAccounts,
  parseArgtAmount,
  parseChainId,
  shortAddress,
  switchToArgtChain,
} from "@/lib/argt";
import {
  ERC20_ABI,
  PRESTAR_CHAIN,
  PRESTAR_CHAIN_ID,
  PRESTAR_CORE_ABI,
  createPrestarPublicClient,
  createPrestarWalletClient,
  explorerAddressUrl,
  explorerTxUrl,
  formatArgtAllowance,
  formatArgtRaw,
  formatPrtCents,
  getPrestarConfig,
  isPrestarReady,
  parsePrtCents,
  prtCentsToArgtRaw,
  readArgtWalletState,
  readPrestarState,
} from "@/lib/prestar";

type Mode = "pay" | "onramp" | "offramp" | "send";
type TxPhase = "idle" | "signing" | "sending" | "confirmed" | "reverted";
type BalanceState = "idle" | "loading" | "ready" | "error";

const PHASE_COPY: Record<
  Exclude<TxPhase, "idle">,
  { label: string; tone: "pending" | "ok" | "bad" }
> = {
  signing: { label: "Esperando tu firma en la billetera…", tone: "pending" },
  sending: {
    label: "Transacción enviada. Esperando confirmación on-chain…",
    tone: "pending",
  },
  confirmed: { label: "Confirmado on-chain.", tone: "ok" },
  reverted: {
    label: "La transacción se revirtió on-chain. No se movió ningún saldo.",
    tone: "bad",
  },
};

export default function PrestarCard() {
  const config = useMemo(() => getPrestarConfig(), []);
  const publicClient = useMemo(() => createPrestarPublicClient(config), [config]);
  const coreAddress = config.coreAddress;
  const ready = isPrestarReady(config);

  const [hasProvider, setHasProvider] = useState(false);
  const [account, setAccount] = useState<Address | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [switching, setSwitching] = useState(false);

  const [memberCents, setMemberCents] = useState<bigint | null>(null);
  const [argtBalance, setArgtBalance] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [symbol, setSymbol] = useState("ARGt");
  const [paused, setPaused] = useState(false);
  const [balanceState, setBalanceState] = useState<BalanceState>("idle");

  // Lazy init keeps SSR/hydration stable: the env-derived readiness is the same
  // on both renders, but the initializer only runs on the client mount pass.
  const [mode, setMode] = useState<Mode>(() =>
    isPrestarReady(getPrestarConfig()) ? "pay" : "send",
  );
  const [payTo, setPayTo] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [rampAmount, setRampAmount] = useState("");
  const [sendAmount, setSendAmount] = useState("");

  const [phase, setPhase] = useState<TxPhase>("idle");
  const [step, setStep] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const onCorrectChain = walletChainId === PRESTAR_CHAIN_ID;
  const busy = phase === "signing" || phase === "sending";

  useEffect(() => {
    const provider = getInjectedProvider();
    setHasProvider(Boolean(provider));
    if (!provider) return;

    let cancelled = false;
    void (async () => {
      try {
        const [accounts, chainIdHex] = await Promise.all([
          provider.request({ method: "eth_accounts" }),
          provider.request({ method: "eth_chainId" }),
        ]);
        if (cancelled) return;
        const [first] = normalizeAccounts(accounts);
        if (first) setAccount(first);
        setWalletChainId(parseChainId(chainIdHex));
      } catch {
        // A locked wallet is not an error until the user acts.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider || !provider.on || !provider.removeListener) return;

    const handleAccounts = (payload: unknown) => {
      const [first] = normalizeAccounts(payload);
      setAccount(first ?? null);
      setPhase("idle");
      setStep(null);
      setTxHash(null);
      setResultText(null);
      if (!first) {
        setMemberCents(null);
        setArgtBalance(null);
        setAllowance(null);
        setBalanceState("idle");
      }
    };
    const handleChain = (payload: unknown) => {
      setWalletChainId(parseChainId(payload));
      setPhase("idle");
      setStep(null);
      setTxHash(null);
      setResultText(null);
    };

    provider.on("accountsChanged", handleAccounts);
    provider.on("chainChanged", handleChain);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccounts);
      provider.removeListener?.("chainChanged", handleChain);
    };
  }, []);

  const refresh = useCallback(
    async (owner: Address) => {
      setBalanceState("loading");
      try {
        if (!coreAddress) {
          const next = await readArgtWalletState(publicClient, config, owner);
          setMemberCents(null);
          setAllowance(null);
          setPaused(false);
          setArgtBalance(next.argtBalance);
          setSymbol(next.argtSymbol);
        } else {
          const next = await readPrestarState(publicClient, config, owner);
          setMemberCents(next.memberBalanceCents);
          setArgtBalance(next.argtBalance);
          setAllowance(next.argtAllowance);
          setSymbol(next.argtSymbol);
          setPaused(next.paused);
        }
        setBalanceState("ready");
      } catch (cause) {
        setBalanceState("error");
        setWalletError(describeWalletError(cause));
      }
    },
    [config, coreAddress, publicClient],
  );

  useEffect(() => {
    if (!account || !onCorrectChain) {
      setMemberCents(null);
      setArgtBalance(null);
      setAllowance(null);
      setBalanceState("idle");
      return;
    }
    void refresh(account);
  }, [account, onCorrectChain, refresh]);

  function resetMessages() {
    setWalletError(null);
    setFormError(null);
    setResultText(null);
    setTxHash(null);
    setStep(null);
  }

  function ensureReady(): Address | null {
    if (!ready || !coreAddress) {
      setFormError(
        "El contrato PrestarCore aún no está desplegado/configurado. No se puede operar on-chain ni se usa un transfer directo de ARGt como fallback.",
      );
      return null;
    }
    return coreAddress;
  }

  function ensureConnected(): boolean {
    if (!account) {
      setFormError("Conectá tu billetera para operar.");
      return false;
    }
    if (!onCorrectChain) {
      setFormError(
        `Tu wallet está en ${chainLabel(walletChainId)}. Cambiá a Arbitrum One (chain ${PRESTAR_CHAIN_ID}) antes de firmar.`,
      );
      return false;
    }
    return true;
  }

  function ensureWallet(): boolean {
    if (!ensureConnected()) return false;
    if (paused) {
      setFormError("El contrato está pausado por el guardián. No se aceptan operaciones.");
      return false;
    }
    return true;
  }

  async function handleConnect() {
    const provider = getInjectedProvider();
    if (!provider) {
      setWalletError(
        "No detectamos una billetera. Instalá Rabby o abrí esta página en un navegador con wallet y recargá.",
      );
      return;
    }
    setConnecting(true);
    setWalletError(null);
    setFormError(null);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const [first] = normalizeAccounts(accounts);
      if (!first) {
        throw new Error("La billetera no devolvió ninguna cuenta para conectar.");
      }
      setAccount(first);
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      setWalletChainId(parseChainId(chainIdHex));
    } catch (cause) {
      setWalletError(describeWalletError(cause));
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    setAccount(null);
    setMemberCents(null);
    setArgtBalance(null);
    setAllowance(null);
    setBalanceState("idle");
    setPhase("idle");
    setStep(null);
    setTxHash(null);
    setResultText(null);
    setWalletError(null);
    setFormError(null);
  }

  async function handleSwitchChain() {
    const provider = getInjectedProvider();
    if (!provider) {
      setWalletError("No detectamos una billetera en este navegador.");
      return;
    }
    setSwitching(true);
    setWalletError(null);
    try {
      await switchToArgtChain(provider, PRESTAR_CHAIN);
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      setWalletChainId(parseChainId(chainIdHex));
    } catch (cause) {
      setWalletError(describeWalletError(cause));
    } finally {
      setSwitching(false);
    }
  }

  function parseRecipient(value: string): Address | null {
    const raw = value.trim();
    if (!isAddress(raw)) {
      setFormError(
        "El receptor debe ser una dirección de wallet 0x… (42 caracteres). No existe mapeo alias → wallet.",
      );
      return null;
    }
    const recipient = getAddress(raw);
    if (recipient === zeroAddress) {
      setFormError("Esa es la dirección cero: los saldos se perderían.");
      return null;
    }
    if (recipient === account) {
      setFormError("Esa es tu propia dirección: elegí otra wallet receptora.");
      return null;
    }
    return recipient;
  }

  async function waitFor(hash: Hash): Promise<boolean> {
    setTxHash(hash);
    setPhase("sending");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "success") {
      setPhase("confirmed");
      setStep(null);
      return true;
    }
    setPhase("reverted");
    setStep(null);
    return false;
  }

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    const core = ensureReady();
    if (!core || !ensureWallet() || !account) return;

    const recipient = parseRecipient(payTo);
    if (!recipient) return;

    const parsed = parsePrtCents(payAmount);
    if ("error" in parsed) {
      setFormError(parsed.error);
      return;
    }

    const provider = getInjectedProvider();
    if (!provider) {
      setFormError("No detectamos una billetera en este navegador.");
      return;
    }

    setPhase("signing");
    setStep("Firmá el pago de PRt en tu billetera…");
    try {
      const wallet = createPrestarWalletClient(provider);
      const hash = await wallet.writeContract({
        account,
        chain: PRESTAR_CHAIN,
        address: core,
        abi: PRESTAR_CORE_ABI,
        functionName: "pay",
        args: [recipient, parsed.value],
      });

      if (await waitFor(hash)) {
        setResultText(
          `Pago confirmado: ${formatPrtCents(parsed.value)} PRt a ${recipient}.`,
        );
        setPayAmount("");
        await refresh(account);
      }
    } catch (cause) {
      setPhase("idle");
      setStep(null);
      setFormError(describeWalletError(cause));
    }
  }

  async function handleOnramp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    const core = ensureReady();
    if (!core || !ensureWallet() || !account) return;

    const parsed = parsePrtCents(rampAmount);
    if ("error" in parsed) {
      setFormError(parsed.error);
      return;
    }

    const argtRaw = prtCentsToArgtRaw(parsed.value);
    if (argtBalance !== null && argtBalance < argtRaw) {
      setFormError(
        `Saldo ARGt insuficiente: tenés ${formatArgtRaw(argtBalance)} ${symbol} y necesitás ${formatArgtRaw(argtRaw)} ${symbol}.`,
      );
      return;
    }

    const provider = getInjectedProvider();
    if (!provider) {
      setFormError("No detectamos una billetera en este navegador.");
      return;
    }

    try {
      const wallet = createPrestarWalletClient(provider);

      if (allowance === null || allowance < argtRaw) {
        setPhase("signing");
        setStep(
          `Aprobando ${formatArgtRaw(argtRaw)} ${symbol} para PrestarCore…`,
        );
        const approveHash = await wallet.writeContract({
          account,
          chain: PRESTAR_CHAIN,
          address: config.argtAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [core, argtRaw],
        });
        setTxHash(approveHash);
        setPhase("sending");
        const approveReceipt =
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status !== "success") {
          setPhase("reverted");
          setStep(null);
          return;
        }
        setAllowance(argtRaw);
      }

      setPhase("signing");
      setStep(
        `Firmá el depósito de ${formatPrtCents(parsed.value)} PRt (${formatArgtRaw(argtRaw)} ${symbol})…`,
      );
      const hash = await wallet.writeContract({
        account,
        chain: PRESTAR_CHAIN,
        address: core,
        abi: PRESTAR_CORE_ABI,
        functionName: "onramp",
        args: [parsed.value],
      });

      if (await waitFor(hash)) {
        setResultText(
          `Depósito confirmado: ${formatArgtRaw(argtRaw)} ${symbol} respaldan ${formatPrtCents(parsed.value)} PRt.`,
        );
        setRampAmount("");
        await refresh(account);
      }
    } catch (cause) {
      setPhase("idle");
      setStep(null);
      setFormError(describeWalletError(cause));
    }
  }

  async function handleOfframp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    const core = ensureReady();
    if (!core || !ensureWallet() || !account) return;

    const parsed = parsePrtCents(rampAmount);
    if ("error" in parsed) {
      setFormError(parsed.error);
      return;
    }
    if (memberCents !== null && memberCents < parsed.value) {
      setFormError(
        `Saldo PRt insuficiente: tenés ${formatPrtCents(memberCents)} PRt. El retiro sólo puede usar saldo positivo, no crédito.`,
      );
      return;
    }

    const provider = getInjectedProvider();
    if (!provider) {
      setFormError("No detectamos una billetera en este navegador.");
      return;
    }

    const argtRaw = prtCentsToArgtRaw(parsed.value);
    setPhase("signing");
    setStep(
      `Firmá el retiro de ${formatPrtCents(parsed.value)} PRt (${formatArgtRaw(argtRaw)} ${symbol})…`,
    );
    try {
      const wallet = createPrestarWalletClient(provider);
      const hash = await wallet.writeContract({
        account,
        chain: PRESTAR_CHAIN,
        address: core,
        abi: PRESTAR_CORE_ABI,
        functionName: "offramp",
        args: [parsed.value],
      });

      if (await waitFor(hash)) {
        setResultText(
          `Retiro confirmado: ${formatArgtRaw(argtRaw)} ${symbol} enviados a tu wallet.`,
        );
        setRampAmount("");
        await refresh(account);
      }
    } catch (cause) {
      setPhase("idle");
      setStep(null);
      setFormError(describeWalletError(cause));
    }
  }

  async function handleSendArgt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    if (!ensureConnected() || !account) return;

    const recipient = parseRecipient(payTo);
    if (!recipient) return;

    const parsed = parseArgtAmount(sendAmount);
    if ("error" in parsed) {
      setFormError(parsed.error);
      return;
    }

    if (argtBalance !== null && argtBalance < parsed.value) {
      setFormError(
        `Saldo ARGt insuficiente: tenés ${formatArgtRaw(argtBalance)} ${symbol} y querés enviar ${formatArgtRaw(parsed.value)} ${symbol}.`,
      );
      return;
    }

    const provider = getInjectedProvider();
    if (!provider) {
      setFormError("No detectamos una billetera en este navegador.");
      return;
    }

    setPhase("signing");
    setStep(
      `Firmá el envío de ${formatArgtRaw(parsed.value)} ${symbol} a ${shortAddress(recipient, 6)} desde tu billetera…`,
    );
    try {
      const wallet = createPrestarWalletClient(provider);
      const hash = await wallet.writeContract({
        account,
        chain: PRESTAR_CHAIN,
        address: config.argtAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipient, parsed.value],
      });

      if (await waitFor(hash)) {
        setResultText(
          `Envío confirmado: ${formatArgtRaw(parsed.value)} ${symbol} a ${recipient}.`,
        );
        setSendAmount("");
        await refresh(account);
      }
    } catch (cause) {
      setPhase("idle");
      setStep(null);
      setFormError(describeWalletError(cause));
    }
  }

  const phaseCopy = phase === "idle" ? null : PHASE_COPY[phase];

  const balanceText = (() => {
    if (!account) return "—";
    if (!onCorrectChain) return "Cambiá de red";
    if (balanceState === "loading") return "Leyendo…";
    if (balanceState === "error") return "No disponible";
    if (memberCents === null) return "—";
    return `${formatPrtCents(memberCents)} PRt`;
  })();

  const argtBalanceText = (() => {
    if (!account || !onCorrectChain) return "—";
    if (balanceState === "loading") return "Leyendo…";
    if (balanceState === "error") return "No disponible";
    if (argtBalance === null) return "—";
    return `${formatArgtRaw(argtBalance)} ${symbol}`;
  })();

  const rampPreview = (() => {
    const parsed = parsePrtCents(rampAmount);
    if ("error" in parsed) return null;
    return `${formatArgtRaw(prtCentsToArgtRaw(parsed.value))} ${symbol}`;
  })();

  const prtSubmitDisabled =
    busy || !ready || !account || !onCorrectChain || paused;
  const sendSubmitDisabled = busy || !account || !onCorrectChain;
  // Core-specific issues are noise in the send flow (a plain ERC-20 transfer);
  // ARGt/RPC issues stay visible because they can break the send too.
  const configIssues =
    mode === "send"
      ? config.issues.filter(
          (issue) => !/PrestarCore|PRESTAR_CORE_ADDRESS/i.test(issue),
        )
      : config.issues;

  return (
    <section className="card argt-card" id="prestar" aria-labelledby="prestar-title">
      <div className="argt-head">
        <div>
          <p className="eyebrow">crédito mutuo on-chain · mainnet real · Arbitrum One</p>
          <h2 id="prestar-title" className="section-title">
            PREStAR · PRt
          </h2>
        </div>
        <span className="argt-badge">
          PRt 2 decimales (centavos) · {symbol} 18 decimales · chain {PRESTAR_CHAIN_ID}
        </span>
      </div>

      <div className="argt-warning" role="note">
        <strong>Esto usa Arbitrum One mainnet y ARGt real. Es irreversible.</strong>
        <span>
          Firmás con tu billetera (Rabby, MetaMask u otra); PREStAR no ve ni
          guarda tu clave privada. Cada
          operación paga gas en ETH. El retiro PRt → ARGt sale de una reserva
          limitada del contrato: si no alcanza, la transacción revierte. PRt no
          es ERC-20, no es moneda de curso legal y no tiene garantía de
          convertibilidad.
        </span>
      </div>

      {!ready && mode !== "send" ? (
        <div className="form-error" role="alert">
          <strong>Contrato aún no desplegado.</strong>{" "}
          {coreAddress === null
            ? "No hay NEXT_PUBLIC_PRESTAR_CORE_ADDRESS válida configurada: pagar, depositar y retirar PRt están deshabilitados. El envío directo de ARGt (modo «Enviar ARGt») no depende del contrato y sigue disponible."
            : "La configuración de red no es válida para Arbitrum One."}
        </div>
      ) : null}

      {!ready && mode === "send" ? (
        <p className="hint hint-small">
          PRT y préstamos requieren desplegar PrestarCore. El envío de ARGt no
          depende del contrato y funciona igual.
        </p>
      ) : null}

      {configIssues.length > 0 ? (
        <div className="form-error" role="alert">
          <ul className="argt-issue-list">
            {configIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="argt-grid">
        <div className="argt-readout">
          <dl className="argt-rows">
            <div>
              <dt>Wallet</dt>
              <dd className="argt-addr">
                {account ? (
                  <a
                    className="argt-link"
                    href={explorerAddressUrl(config, account)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {shortAddress(account, 6)}
                  </a>
                ) : (
                  "sin conectar"
                )}
              </dd>
            </div>
            <div>
              <dt>Red de la wallet</dt>
              <dd className={account && !onCorrectChain ? "argt-chain is-wrong" : "argt-chain"}>
                {account ? chainLabel(walletChainId) : "—"}
              </dd>
            </div>
            <div>
              <dt>PrestarCore</dt>
              <dd className="argt-addr">
                {coreAddress ? (
                  <a
                    className="argt-link"
                    href={explorerAddressUrl(config, coreAddress)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {shortAddress(coreAddress, 6)}
                  </a>
                ) : (
                  "sin configurar"
                )}
              </dd>
            </div>
            <div>
              <dt>ARGt</dt>
              <dd className="argt-addr">
                <a
                  className="argt-link"
                  href={explorerAddressUrl(config, config.argtAddress)}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {shortAddress(config.argtAddress, 6)}
                </a>
              </dd>
            </div>
          </dl>

          <div className="argt-balance">
            <p className="eyebrow">Saldo PRt on-chain</p>
            <p className="argt-balance-amount">{balanceText}</p>
            <p className="hint hint-small">
              Leído con <code>balanceOfMember</code> contra PrestarCore. Puede ser
              negativo si usaste tu línea de crédito; los números negativos no son
              retirables.
            </p>
          </div>

          <dl className="argt-rows">
            <div>
              <dt>ARGt en la wallet</dt>
              <dd>{argtBalanceText}</dd>
            </div>
            <div>
              <dt>Allowance ARGt → Core</dt>
              <dd>{allowance === null ? "—" : formatArgtAllowance(allowance)}</dd>
            </div>
            <div>
              <dt>Estado del contrato</dt>
              <dd>{!coreAddress ? "—" : paused ? "pausado" : "operativo"}</dd>
            </div>
          </dl>

          <div className="argt-actions">
            {hasProvider ? (
              account ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => void refresh(account)}
                    disabled={!onCorrectChain || balanceState === "loading"}
                  >
                    {balanceState === "loading" ? "Actualizando…" : "Actualizar saldos"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={handleDisconnect}
                    disabled={busy}
                  >
                    Desconectar vista
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={() => void handleConnect()}
                  disabled={connecting}
                >
                  {connecting ? "Esperando billetera…" : "Conectar billetera"}
                </button>
              )
            ) : (
              <a
                className="btn btn-primary btn-small"
                href="https://rabby.io/"
                target="_blank"
                rel="noreferrer noopener"
              >
                Instalar Rabby
              </a>
            )}

            {account && !onCorrectChain ? (
              <button
                type="button"
                className="btn btn-destructive btn-small"
                onClick={() => void handleSwitchChain()}
                disabled={switching}
              >
                {switching ? "Pidiendo cambio de red…" : "Cambiar a Arbitrum One"}
              </button>
            ) : null}
          </div>

          {walletError ? (
            <p className="form-error" role="alert">
              {walletError}
            </p>
          ) : null}
        </div>

        <div className="argt-form">
          <div className="argt-actions" aria-label="Tipo de operación">
            {(
              [
                ["send", "Enviar ARGt"],
                ["pay", "Pagar PRt"],
                ["onramp", "ARGt → PRt"],
                ["offramp", "PRt → ARGt"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  mode === value ? "btn btn-primary btn-small" : "btn btn-ghost btn-small"
                }
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  resetMessages();
                }}
                disabled={busy}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "pay" ? (
            <form onSubmit={handlePay} noValidate>
              <div className="field">
                <label className="field-label" htmlFor="prestar-to">
                  Dirección receptora (0x…)
                </label>
                <input
                  id="prestar-to"
                  className="input input-mono"
                  value={payTo}
                  onChange={(event) => {
                    setPayTo(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="0x0000000000000000000000000000000000000000"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="text"
                />
                <p className="hint hint-small">
                  Es una wallet, no un alias. El receptor debe estar dado de alta
                  como miembro activo por un broker para poder recibir PRt.
                </p>
              </div>

              <div className="field">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="prestar-pay-amount">
                    Monto
                  </label>
                  <span className="hint-inline">en PRt (2 decimales)</span>
                </div>
                <div className="amount-wrap">
                  <input
                    id="prestar-pay-amount"
                    className="input amount-input argt-amount-input"
                    value={payAmount}
                    onChange={(event) => {
                      setPayAmount(event.target.value);
                      setFormError(null);
                    }}
                    placeholder="0,00"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                  <span className="amount-unit" aria-hidden="true">
                    PRt
                  </span>
                </div>
                <p className="hint hint-small">
                  Se envía en centavos enteros. Podés pagar con crédito hasta tu
                  límite negativo; no se usan floats.
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={prtSubmitDisabled}
              >
                {!account
                  ? "Conectá tu billetera para pagar"
                  : !onCorrectChain
                    ? "Cambiá a Arbitrum One para pagar"
                    : "Enviar PRt on-chain"}
              </button>
            </form>
          ) : mode === "send" ? (
            <form onSubmit={handleSendArgt} noValidate>
              <div className="field">
                <label className="field-label" htmlFor="prestar-to">
                  Dirección de la otra persona (0x…)
                </label>
                <input
                  id="prestar-to"
                  className="input input-mono"
                  value={payTo}
                  onChange={(event) => {
                    setPayTo(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="0x0000000000000000000000000000000000000000"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="text"
                />
                <p className="hint hint-small">
                  La otra persona también usa PREStAR con su propia billetera:
                  pasale su dirección 0x… (no es un alias). Se transfiere ARGt
                  directo de tu wallet a la suya.
                </p>
              </div>

              <div className="field">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="prestar-send-amount">
                    Monto en ARGt
                  </label>
                  <span className="hint-inline">18 decimales</span>
                </div>
                <div className="amount-wrap">
                  <input
                    id="prestar-send-amount"
                    className="input amount-input argt-amount-input"
                    value={sendAmount}
                    onChange={(event) => {
                      setSendAmount(event.target.value);
                      setFormError(null);
                    }}
                    placeholder="0,00"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                  <span className="amount-unit" aria-hidden="true">
                    ARGt
                  </span>
                </div>
                <p className="hint hint-small">
                  {argtBalance === null
                    ? "El saldo ARGt todavía no se leyó; se valida al firmar."
                    : `Disponible en tu wallet: ${argtBalanceText}.`}
                </p>
              </div>

              <div className="argt-separation" role="note">
                <strong>Esto mueve ARGt real, no PRt.</strong> Es un{" "}
                <code>transfer</code> ERC-20 directo en Arbitrum One: no pasa por
                PrestarCore, es irreversible y pagás gas en ETH.
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={sendSubmitDisabled}
              >
                {!account
                  ? "Conectá tu billetera para enviar"
                  : !onCorrectChain
                    ? "Cambiá a Arbitrum One para enviar"
                    : busy
                      ? "Esperando la wallet…"
                      : "Enviar ARGt"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={mode === "onramp" ? handleOnramp : handleOfframp}
              noValidate
            >
              <div className="field">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="prestar-ramp-amount">
                    {mode === "onramp" ? "PRt a recibir" : "PRt a retirar"}
                  </label>
                  <span className="hint-inline">en PRt (2 decimales)</span>
                </div>
                <div className="amount-wrap">
                  <input
                    id="prestar-ramp-amount"
                    className="input amount-input argt-amount-input"
                    value={rampAmount}
                    onChange={(event) => {
                      setRampAmount(event.target.value);
                      setFormError(null);
                    }}
                    placeholder="0,00"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                  <span className="amount-unit" aria-hidden="true">
                    PRt
                  </span>
                </div>
                <p className="hint hint-small">
                  Conversión 1:1 nominal: 1 PRt = 1 ARGt.{" "}
                  {rampPreview
                    ? `Esta operación mueve ${rampPreview}.`
                    : "El monto se convierte exacto a 18 decimales, sin floats."}
                </p>
              </div>

              <div className="argt-separation">
                {mode === "onramp"
                  ? "El depósito pide approve de ARGt y luego llama onramp. El ARGt queda custodiado por PrestarCore y respalda tu PRt."
                  : "El retiro quema PRt positivo y devuelve ARGt desde la reserva. La reserva es limitada y se atiende por orden de llegada; si no alcanza, la transacción revierte."}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={prtSubmitDisabled}
              >
                {!account
                  ? "Conectá tu billetera para operar"
                  : !onCorrectChain
                    ? "Cambiá a Arbitrum One para operar"
                    : busy
                      ? "Esperando la wallet…"
                      : mode === "onramp"
                        ? "Aprobar y depositar ARGt"
                        : "Retirar ARGt"}
              </button>
            </form>
          )}

          {step ? (
            <p className="argt-status argt-status-pending" role="status" aria-live="polite">
              {step}
            </p>
          ) : null}

          {phaseCopy ? (
            <p
              className={`argt-status argt-status-${phaseCopy.tone}`}
              role="status"
              aria-live="polite"
            >
              {phaseCopy.label}
            </p>
          ) : null}

          {resultText ? (
            <p className="argt-status argt-status-ok" role="status" aria-live="polite">
              {resultText}
            </p>
          ) : null}

          {txHash ? (
            <p className="argt-hash">
              <span>Hash:</span>{" "}
              <a
                className="argt-link"
                href={explorerTxUrl(config, txHash)}
                target="_blank"
                rel="noreferrer noopener"
              >
                {txHash}
              </a>
            </p>
          ) : null}

          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <p className="hint hint-small">
            Verificá en Arbiscan: red {PRESTAR_CHAIN_ID}, contrato PrestarCore y
            estado <em>Success</em>. PREStAR nunca te pide la frase semilla.
          </p>
        </div>
      </div>
    </section>
  );
}
