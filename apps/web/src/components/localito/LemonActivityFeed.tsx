"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Repeat,
  Share2,
  Stamp,
  X,
} from "lucide-react";

/* ============================================================================
   MODELO DE MOVIMIENTOS LEMON UI × BENCHO (CERO RUIDO, PURO DATO)
   ============================================================================ */
export type TransactionDirection = "in" | "out" | "swap" | "credit";

export interface TransactionCounterparty {
  alias: string;
  displayName: string;
  avatarText: string;
  role?: "merchant" | "member" | "protocol" | "comercio" | "contacto";
  category?: string;
  legalName?: string;
  cuit?: string;
  address?: string;
  acceptsPrt?: boolean;
  benefitLabel?: string;
  verified?: boolean;
}

export interface LocalitoTransaction {
  id: string;
  direction: TransactionDirection;
  counterparty: TransactionCounterparty;
  amount: number;
  symbol: string;
  arsEquivalent: number;
  accentHex: string;
  fromAmount?: number;
  fromSymbol?: string;
  toAmount?: number;
  toSymbol?: string;
  rateLabel?: string;
  note?: string;
  timeLabel: string;
  dateGroup: "HOY" | "AYER" | "ANTERIOR";
  txHash?: string;
  docusealHash?: string;
  collateralDescription?: string;
  createdAtIso?: string;
  balanceAfterArs?: number;
  idempotencyKey?: string;
  status?: "confirmed" | "pending";
  zeroSumVerified?: boolean;
}

export const DEMO_COUNTERPARTIES: TransactionCounterparty[] = [
  {
    alias: "$cafe",
    displayName: "Café Central",
    legalName: "Café Central S.R.L.",
    avatarText: "CC",
    role: "merchant",
    category: "Cafetería y Panificados",
    cuit: "30-71589210-4",
    address: "Av. Corrientes 1420",
    verified: true,
  },
  {
    alias: "$kiosco",
    displayName: "Kiosco La Esquina",
    legalName: "Sucesión García Hnos.",
    avatarText: "KE",
    role: "merchant",
    category: "Almacén y Kiosco",
    cuit: "20-34918204-7",
    address: "San Martín 402",
    verified: true,
  },
  {
    alias: "$molino",
    displayName: "Molino Central",
    legalName: "Harinas del Sur S.A.",
    avatarText: "MC",
    role: "merchant",
    category: "Mayorista e Insumos",
    cuit: "30-68441209-9",
    address: "Ruta 12 Km 4",
    verified: true,
  },
  {
    alias: "$foto",
    displayName: "Fotocopias Norte",
    legalName: "Gráfica Norte Cooperativa",
    avatarText: "FN",
    role: "merchant",
    category: "Imprenta y Librería",
    cuit: "30-71029384-2",
    address: "Belgrano 885",
    verified: true,
  },
  {
    alias: "$huertito",
    displayName: "El Huertito",
    legalName: "Productores Locales Unidos",
    avatarText: "VH",
    role: "merchant",
    category: "Verdulería",
    cuit: "27-31894021-5",
    address: "Sarmiento 210",
    verified: true,
  },
  {
    alias: "$ferreteria",
    displayName: "Ferretería Gómez",
    legalName: "Roberto Gómez e Hijos S.H.",
    avatarText: "FG",
    role: "merchant",
    category: "Ferretería Industrial",
    cuit: "30-64120983-1",
    address: "Rivadavia 1190",
    verified: true,
  },
  {
    alias: "$ana",
    displayName: "Ana Martínez",
    legalName: "Ana María Martínez",
    avatarText: "AN",
    role: "member",
    category: "Vecina",
    cuit: "27-39401822-4",
    verified: true,
  },
  {
    alias: "$bruno",
    displayName: "Bruno Pereyra",
    legalName: "Bruno Nicolás Pereyra",
    avatarText: "BR",
    role: "member",
    category: "Electricista",
    cuit: "20-36718290-3",
    verified: true,
  },
  {
    alias: "$lucia",
    displayName: "Lucía Ferreyra",
    legalName: "Lucía Soledad Ferreyra",
    avatarText: "LF",
    role: "member",
    category: "Pastelería",
    cuit: "27-41029381-9",
    verified: true,
  },
];

export const INITIAL_LOCALITO_TRANSACTIONS: LocalitoTransaction[] = [
  {
    id: "tx_9a41f2",
    direction: "out",
    counterparty: {
      alias: "$proveedor",
      displayName: "Distribuidora San Juan",
      legalName: "Distribuidora San Juan S.R.L.",
      cuit: "30-70918231-6",
      avatarText: "SJ",
      role: "merchant",
      category: "Insumos",
    },
    amount: 15000,
    symbol: "TL",
    arsEquivalent: 15000,
    accentHex: "#00DF1A",
    note: "Reposición de stock local",
    timeLabel: "14:12",
    dateGroup: "HOY",
    txHash: "0x82f1c90a4e12b781",
  },
  {
    id: "tx_8f31a9",
    direction: "in",
    counterparty: {
      alias: "$cafe",
      displayName: "Café Central",
      legalName: "Café Central S.R.L.",
      cuit: "30-71589210-4",
      avatarText: "CC",
    },
    amount: 24500,
    symbol: "TL",
    arsEquivalent: 24500,
    accentHex: "#00DF1A",
    note: "Medialunas de manteca",
    timeLabel: "13:45",
    dateGroup: "HOY",
    txHash: "0x94e1b8f03c2a7d91",
  },
  {
    id: "tx_7d20e4",
    direction: "out",
    counterparty: {
      alias: "$molino",
      displayName: "Molino Central",
      legalName: "Harinas del Sur S.A.",
      cuit: "30-68441209-9",
      avatarText: "MC",
    },
    amount: 68000,
    symbol: "TL",
    arsEquivalent: 68000,
    accentHex: "#00DF1A",
    note: "Harina 0000 x 4 bolsas",
    timeLabel: "10:18",
    dateGroup: "HOY",
    txHash: "0x3b12c77a9e041f88",
  },
  {
    id: "tx_6b02e1",
    direction: "in",
    counterparty: {
      alias: "$ana",
      displayName: "Ana Martínez",
      legalName: "Ana María Martínez",
      cuit: "27-39401822-4",
      avatarText: "AN",
      role: "member",
      category: "Vecina",
    },
    amount: 18500,
    symbol: "TL",
    arsEquivalent: 18500,
    accentHex: "#00DF1A",
    note: "Facturas y chipá",
    timeLabel: "Ayer",
    dateGroup: "AYER",
    txHash: "0x49c2d11e7a03f512",
  },
  {
    id: "tx_5c18f0",
    direction: "credit",
    counterparty: {
      alias: "$credito",
      displayName: "Crédito 0%",
      avatarText: "0%",
    },
    amount: 250000,
    symbol: "TL",
    arsEquivalent: 250000,
    accentHex: "#CFFF2E",
    note: "Crédito scoring · 90 días",
    timeLabel: "Ayer",
    dateGroup: "AYER",
    txHash: "0x7f44d2190a8bc312",
  },
  {
    id: "tx_3e55a1",
    direction: "in",
    counterparty: {
      alias: "$kiosco",
      displayName: "Kiosco La Esquina",
      legalName: "Sucesión García Hnos.",
      cuit: "20-34918204-7",
      avatarText: "KE",
    },
    amount: 16800,
    symbol: "TL",
    arsEquivalent: 16800,
    accentHex: "#00DF1A",
    note: "Pan lactal artesanal",
    timeLabel: "05 Nov",
    dateGroup: "ANTERIOR",
    txHash: "0x19d8a42f0c33e711",
  },
];

/* ============================================================================
   FORMATO NUMÉRICO
   ============================================================================ */
function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCoinAmount(amount: number, symbol: string): string {
  const isFiatLike = symbol === "TL" || symbol === "ARGt" || symbol === "PRt";
  return isFiatLike ? `$ ${fmt(amount, 0)}` : `${fmt(amount, 2)} ${symbol}`;
}

/* ============================================================================
   DETALLE DE LA TRANSACCIÓN (BOTTOM SHEET BENCHO × LEMON CON FÍSICA DE RESORTE)
   ============================================================================ */
export interface LemonDigitalTicketModalProps {
  transaction: LocalitoTransaction | null;
  userTag: string;
  userDisplayName?: string;
  hideBalance?: boolean;
  onClose: () => void;
  onRepeatPayment?: (tx: LocalitoTransaction) => void;
}

export function LemonDigitalTicketModal({
  transaction,
  userTag,
  hideBalance = false,
  onClose,
  onRepeatPayment,
}: LemonDigitalTicketModalProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transaction, onClose]);

  return (
    <AnimatePresence>
      {transaction && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de transacción"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="absolute inset-0 z-40 bg-black/75 backdrop-blur-xs flex flex-col justify-end"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", duration: 0.48, bounce: 0.12 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.48 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 70 || info.velocity.y > 420) {
                onClose();
              }
            }}
            className="rounded-t-[32px] bg-[#0F1117] border-t border-white/12 px-5 pt-2.5 pb-6 space-y-4 shadow-[0_-24px_60px_rgba(0,0,0,0.9)]"
          >
            {/* Asa táctil estilo Bencho / iOS */}
            <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-1 cursor-grab active:cursor-grabbing" />

            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#14171F] border border-white/10 text-[#00DF1A] font-mono text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00DF1A]" />
                <span>
                  {transaction.direction === "swap"
                    ? "Conversión liquidada"
                    : transaction.direction === "credit"
                    ? "Crédito acreditado"
                    : transaction.direction === "in"
                    ? "Cobro recibido"
                    : "Pago enviado"}
                </span>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                aria-label="Cerrar comprobante"
                className="w-8 h-8 rounded-full bg-[#14171F] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Hero Central */}
            <div className="text-center py-1.5 space-y-1">
              <motion.div
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  duration: 0.45,
                  bounce: 0.3,
                  delay: 0.05,
                }}
                className="mx-auto w-12 h-12 rounded-2xl bg-[#14171F] border border-white/10 flex items-center justify-center text-[#00DF1A] mb-2"
              >
                {transaction.direction === "swap" ? (
                  <ArrowLeftRight className="w-5 h-5 text-[#CFFF2E]" />
                ) : transaction.direction === "credit" ? (
                  <Stamp className="w-5 h-5 text-[#00D8EC]" />
                ) : transaction.direction === "in" ? (
                  <ArrowDownLeft className="w-5 h-5 text-[#00DF1A]" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-white" />
                )}
              </motion.div>

              {transaction.direction === "swap" ? (
                <>
                  <div className="text-3xl font-bold tracking-tight tabular-nums text-[#00DF1A]">
                    {hideBalance
                      ? "••••"
                      : `+${fmt(
                          transaction.toAmount || transaction.amount,
                          transaction.toSymbol === "ARGt" ||
                            transaction.toSymbol === "TL"
                            ? 0
                            : 2
                        )} ${transaction.toSymbol}`}
                  </div>
                  <div className="text-xs font-mono text-zinc-400 tabular-nums">
                    {hideBalance
                      ? "••••"
                      : `-${fmt(
                          transaction.fromAmount || 0,
                          transaction.fromSymbol === "ARGt" ||
                            transaction.fromSymbol === "TL"
                            ? 0
                            : 2
                        )} ${transaction.fromSymbol}`}
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`text-3xl font-bold tracking-tight tabular-nums ${
                      transaction.direction === "in" ||
                      transaction.direction === "credit"
                        ? "text-[#00DF1A]"
                        : "text-white"
                    }`}
                  >
                    {hideBalance
                      ? "••••••"
                      : `${
                          transaction.direction === "in" ||
                          transaction.direction === "credit"
                            ? "+"
                            : "-"
                        }${formatCoinAmount(
                          transaction.amount,
                          transaction.symbol
                        )}`}
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    {transaction.counterparty.alias} · {transaction.timeLabel}
                  </div>
                </>
              )}
            </div>

            {/* Slab de Datos estilo Bencho */}
            <div className="rounded-[20px] bg-[#14171F] border border-white/8 p-4 space-y-2.5 text-xs">
              {transaction.direction === "swap" ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Pagaste</span>
                    <span className="font-mono font-semibold text-white tabular-nums">
                      {fmt(
                        transaction.fromAmount || 0,
                        transaction.fromSymbol === "ARGt" ||
                          transaction.fromSymbol === "TL"
                          ? 0
                          : 2
                      )}{" "}
                      {transaction.fromSymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Recibiste</span>
                    <span className="font-mono font-semibold text-[#00DF1A] tabular-nums">
                      {fmt(
                        transaction.toAmount || transaction.amount,
                        transaction.toSymbol === "ARGt" ||
                          transaction.toSymbol === "TL"
                          ? 0
                          : 2
                      )}{" "}
                      {transaction.toSymbol}
                    </span>
                  </div>
                  {transaction.rateLabel && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Cotización</span>
                      <span className="font-mono text-zinc-300">
                        {transaction.rateLabel}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">
                      {transaction.direction === "in" ||
                      transaction.direction === "credit"
                        ? "De"
                        : "Para"}
                    </span>
                    <span className="font-mono font-semibold text-white">
                      {transaction.counterparty.displayName} (
                      {transaction.counterparty.alias})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Billetera</span>
                    <span className="font-mono text-zinc-300">{userTag}</span>
                  </div>
                  {transaction.note && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-400 shrink-0">Concepto</span>
                      <span className="text-zinc-200 font-medium truncate text-right">
                        {transaction.note}
                      </span>
                    </div>
                  )}
                  {transaction.collateralDescription && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-400 shrink-0">Respaldo</span>
                      <span className="text-zinc-200 font-mono text-[11px] truncate text-right">
                        {transaction.collateralDescription}
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Comisión de red</span>
                <span className="font-mono text-[#00DF1A] font-semibold">
                  $ 0
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-white/6 font-mono">
                <span className="text-zinc-400">Operación</span>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      typeof navigator !== "undefined" &&
                      navigator.clipboard
                    ) {
                      navigator.clipboard
                        .writeText(transaction.id)
                        .catch(() => {});
                    }
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 cursor-pointer transition-colors ${
                    copied ? "animate-copy-wave" : ""
                  }`}
                >
                  <span>#{transaction.id.replace("tx_", "")}</span>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#00DF1A]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Botones de Acción Táctiles */}
            <div className="flex items-center gap-2 pt-0.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  const text = `Localito #${transaction.id.replace("tx_", "")} · ${formatCoinAmount(transaction.amount, transaction.symbol)} (${transaction.counterparty.alias})`;
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(text).catch(() => {});
                  }
                  setShared(true);
                  setTimeout(() => setShared(false), 1800);
                }}
                className="flex-1 h-11 rounded-full bg-[#14171F] hover:bg-[#1A1E28] border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
              >
                {shared ? (
                  <>
                    <Check className="w-4 h-4 text-[#00DF1A]" />
                    <span className="text-[#00DF1A]">Resumen copiado</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-zinc-300" />
                    <span>Compartir</span>
                  </>
                )}
              </motion.button>

              {onRepeatPayment && transaction.direction === "out" && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onRepeatPayment(transaction)}
                  className="h-11 px-5 rounded-full bg-[#00DF1A] text-[#090D0A] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Repeat className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Repetir</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================================
   FILA DE MOVIMIENTO LEMON × BENCHO (SLAB LIMPIO CON TACTILE FEEDBACK)
   ============================================================================ */
interface TransactionRowItemProps {
  tx: LocalitoTransaction;
  hideBalance: boolean;
  onSelect: (tx: LocalitoTransaction) => void;
}

export function TransactionRowItem({
  tx,
  hideBalance,
  onSelect,
}: TransactionRowItemProps) {
  const isSwap = tx.direction === "swap";
  const isIncoming = tx.direction === "in";
  const isCredit = tx.direction === "credit";

  return (
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.985 }}
      onClick={() => onSelect(tx)}
      className="w-full rounded-[20px] bg-[#14171F] hover:bg-[#191D27] border border-white/[0.06] p-3.5 flex items-center justify-between transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Icono circular limpio */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isSwap
              ? "bg-[#CFFF2E]/15 text-[#CFFF2E]"
              : isCredit
              ? "bg-[#00D8EC]/15 text-[#00D8EC]"
              : isIncoming
              ? "bg-[#00DF1A]/15 text-[#00DF1A]"
              : "bg-white/[0.06] text-zinc-200"
          }`}
        >
          {isSwap ? (
            <ArrowLeftRight className="w-4 h-4 stroke-[2.3]" />
          ) : isCredit ? (
            <Stamp className="w-4 h-4 stroke-[2.2]" />
          ) : isIncoming ? (
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          )}
        </div>

        {/* Titulo corto + Subtitulo minimo */}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {isSwap ? tx.counterparty.displayName : tx.counterparty.alias}
          </div>
          <div className="text-xs text-zinc-400 font-mono truncate">
            {isSwap
              ? `Swap · ${tx.timeLabel}`
              : `${tx.note || tx.counterparty.displayName} · ${tx.timeLabel}`}
          </div>
        </div>
      </div>

      {/* Monto limpio a la derecha */}
      <div className="text-right shrink-0 tabular-nums">
        {isSwap ? (
          <>
            <div className="text-sm font-semibold text-[#00DF1A]">
              {hideBalance
                ? "••••"
                : `+${fmt(
                    tx.toAmount || tx.amount,
                    tx.toSymbol === "ARGt" || tx.toSymbol === "TL" ? 0 : 2
                  )} ${tx.toSymbol}`}
            </div>
            <div className="text-xs font-mono text-zinc-400">
              {hideBalance
                ? "••••"
                : `-${fmt(
                    tx.fromAmount || 0,
                    tx.fromSymbol === "ARGt" || tx.fromSymbol === "TL" ? 0 : 2
                  )} ${tx.fromSymbol}`}
            </div>
          </>
        ) : (
          <>
            <div
              className={`text-sm font-semibold ${
                isIncoming || isCredit ? "text-[#00DF1A]" : "text-white"
              }`}
            >
              {hideBalance
                ? "••••"
                : `${isIncoming || isCredit ? "+" : "-"}${formatCoinAmount(
                    tx.amount,
                    tx.symbol
                  )}`}
            </div>
            <div className="text-xs font-mono text-zinc-400">{tx.symbol}</div>
          </>
        )}
      </div>
    </motion.button>
  );
}

/* ============================================================================
   PREVIEW EN HOME ("MOVIMIENTOS")
   ============================================================================ */
interface LemonRecentActivityPreviewProps {
  transactions: LocalitoTransaction[];
  hideBalance: boolean;
  onSelectTransaction: (tx: LocalitoTransaction) => void;
  onViewAll: () => void;
}

export function LemonRecentActivityPreview({
  transactions,
  hideBalance,
  onSelectTransaction,
  onViewAll,
}: LemonRecentActivityPreviewProps) {
  const recent = useMemo(() => {
    return transactions.filter((t) => t.direction !== "swap").slice(0, 4);
  }, [transactions]);

  return (
    <section aria-label="Movimientos" className="w-full mt-5 space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-zinc-400">Movimientos</span>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#00DF1A] hover:text-[#CFFF2E] transition-colors cursor-pointer focus-visible:outline-none"
        >
          <span>Ver todos</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {recent.map((tx) => (
          <TransactionRowItem
            key={tx.id}
            tx={tx}
            hideBalance={hideBalance}
            onSelect={onSelectTransaction}
          />
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   PANTALLA DE MOVIMIENTOS (PÍLDORAS CON RESORTE BENCHO + LISTA ANIMADA)
   ============================================================================ */
export interface LemonActivityFeedProps {
  transactions: LocalitoTransaction[];
  hideBalance: boolean;
  onSelectTransaction: (tx: LocalitoTransaction) => void;
  onOpenNewPayment?: () => void;
}

const FILTER_TABS = [
  { id: "all", label: "Todo" },
  { id: "in", label: "Recibidos" },
  { id: "out", label: "Enviados" },
] as const;

export function LemonActivityFeed({
  transactions,
  hideBalance,
  onSelectTransaction,
  onOpenNewPayment,
}: LemonActivityFeedProps) {
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  const visibleTransactions = useMemo(() => {
    return transactions.filter((t) => t.direction !== "swap");
  }, [transactions]);

  const filtered = useMemo(() => {
    if (filter === "all") return visibleTransactions;
    return visibleTransactions.filter((t) => t.direction === filter);
  }, [visibleTransactions, filter]);

  return (
    <div className="w-full space-y-3.5 pt-1">
      {/* Título de la pantalla */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Movimientos
        </h2>
        <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08] tabular-nums">
          {visibleTransactions.length}
        </span>
      </div>

      {/* Control segmentado estilo Bencho con píldora deslizante de resorte */}
      <div
        role="tablist"
        aria-label="Filtrar movimientos"
        className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#14171F] border border-white/[0.07]"
      >
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.id)}
              className={`relative h-9 rounded-xl text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A] ${
                active ? "text-[#090D0A]" : "text-zinc-400 hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="activity-filter-pill"
                  transition={{ type: "spring", duration: 0.45, bounce: 0.16 }}
                  className="absolute inset-0 rounded-xl bg-[#00DF1A]"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lista con animación de entrada/salida o estado vacío honesto (R-27) */}
      {filtered.length === 0 ? (
        <div className="rounded-[20px] bg-[#14171F] border border-white/[0.06] p-6 text-center space-y-3">
          <p className="text-xs text-zinc-400">
            No hay movimientos en esta categoría todavía.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="h-9 px-4 rounded-full bg-white/[0.07] hover:bg-white/[0.12] text-xs font-semibold text-white cursor-pointer"
            >
              Ver todos
            </button>
            {onOpenNewPayment && (
              <button
                type="button"
                onClick={onOpenNewPayment}
                className="h-9 px-4 rounded-full bg-[#00DF1A] text-[#090D0A] text-xs font-bold cursor-pointer"
              >
                Nuevo pago
              </button>
            )}
          </div>
        </div>
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((tx) => (
              <motion.div
                key={tx.id}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", duration: 0.38, bounce: 0.12 }}
              >
                <TransactionRowItem
                  tx={tx}
                  hideBalance={hideBalance}
                  onSelect={onSelectTransaction}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
