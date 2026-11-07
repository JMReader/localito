"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  Delete,
  MapPin,
  QrCode,
  Search,
  X,
} from "lucide-react";
import {
  DEMO_COUNTERPARTIES,
  LocalitoTransaction,
  TransactionCounterparty,
} from "./LemonActivityFeed";

/* ============================================================================
   SLIDE TO PAY (DESLIZAR PARA PAGAR ESTILO LEMON CASH)
   ============================================================================ */
interface SlideToPayProps {
  label?: string;
  onConfirm: () => void;
  disabled?: boolean;
}

function SlideToPay({
  label = "Deslizá para pagar",
  onConfirm,
  disabled = false,
}: SlideToPayProps) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isConfirmed || disabled || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const maxPx = Math.max(120, rect.width - 58);
    const next = Math.max(0, Math.min(maxPx, e.clientX - rect.left - 26));
    setDragX(next);

    if (next >= maxPx * 0.86) {
      setIsDragging(false);
      setIsConfirmed(true);
      setDragX(maxPx);
      if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
        try {
          navigator.vibrate([20, 50, 40]);
        } catch {
          // ignore
        }
      }
      onConfirm();
    }
  };

  const handlePointerEnd = () => {
    if (!isConfirmed) {
      setIsDragging(false);
      setDragX(0);
    }
  };

  return (
    <div
      ref={trackRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      className={`relative h-[60px] w-full rounded-full bg-[#12151D] border border-white/[0.08] overflow-hidden select-none flex items-center px-1.5 transition-all ${
        disabled ? "opacity-35 pointer-events-none" : "hover:border-white/20"
      }`}
    >
      <motion.div
        animate={{ width: isConfirmed ? "100%" : `${dragX + 54}px` }}
        transition={
          isDragging
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 30 }
        }
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00DF1A]/35 via-[#00DF1A]/20 to-[#00DF1A]/10 pointer-events-none"
      />

      <span className="w-full text-center text-xs font-bold tracking-wide text-zinc-200 pointer-events-none z-10 pl-10 pr-4">
        {isConfirmed ? "Procesando..." : label}
      </span>

      <motion.button
        type="button"
        disabled={disabled}
        onPointerDown={() => !isConfirmed && !disabled && setIsDragging(true)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isConfirmed && !disabled) {
            e.preventDefault();
            setIsConfirmed(true);
            onConfirm();
          }
        }}
        animate={{ x: dragX }}
        whileTap={{ scale: 0.94 }}
        transition={
          isDragging
            ? { duration: 0 }
            : { type: "spring", stiffness: 440, damping: 28 }
        }
        aria-label={label}
        className="relative z-20 w-[48px] h-[48px] rounded-full bg-[#00DF1A] text-[#090D0A] flex items-center justify-center shadow-[0_4px_20px_rgba(0,223,26,0.4)] cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {isConfirmed ? (
            <motion.span
              key="confirmed-icon"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
            >
              <Check className="w-6 h-6 stroke-[3]" />
            </motion.span>
          ) : (
            <motion.span
              key="arrow-icon"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
            >
              <ChevronRight className="w-6 h-6 stroke-[2.8]" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

/* ============================================================================
   CATEGORÍAS DE LOCALES
   ============================================================================ */
type MerchantCategoryFilter = "all" | "gastronomia" | "almacen" | "mayorista" | "servicios";

const CATEGORY_TABS: Array<{ id: MerchantCategoryFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "gastronomia", label: "Gastronomía" },
  { id: "almacen", label: "Almacén" },
  { id: "mayorista", label: "Mayoristas" },
  { id: "servicios", label: "Servicios" },
];

export interface LemonPayFlowProps {
  userBalancePrt: number;
  onPaymentSuccess: (tx: LocalitoTransaction) => void;
  onClose: () => void;
  onOpenQrScanner: () => void;
  initialRecipient?: TransactionCounterparty | null;
  initialAmount?: number | null;
}

/* ============================================================================
   FLUJO DE PAGO MULTI-PANTALLA
   ============================================================================ */
export function LemonPayFlow({
  userBalancePrt = 950000,
  onPaymentSuccess,
  onClose,
  onOpenQrScanner,
  initialRecipient = null,
  initialAmount = null,
}: LemonPayFlowProps) {
  // Pasos:
  // 1: Directorio de locales y buscador
  // 2: Ficha del destinatario y monto en PRt
  // 3: Confirmación y deslizar para pagar
  // 4: Comprobante
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialRecipient ? 2 : 1);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MerchantCategoryFilter>("all");

  const [selectedRecipient, setSelectedRecipient] = useState<TransactionCounterparty | null>(
    initialRecipient || null
  );

  const [amountInput, setAmountInput] = useState<string>(
    initialAmount && initialAmount > 0 ? initialAmount.toString() : "1500"
  );
  const [conceptNote, setConceptNote] = useState<string>("");
  const [confirmedTx, setConfirmedTx] = useState<LocalitoTransaction | null>(null);

  const formatNumber = (n: number, decimals = 0) =>
    n.toLocaleString("es-AR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const merchantsList = useMemo(() => {
    return DEMO_COUNTERPARTIES.filter((c) => c.role === "merchant");
  }, []);

  const contactsList = useMemo(() => {
    return DEMO_COUNTERPARTIES.filter((c) => c.role === "member");
  }, []);

  const filteredMerchants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return merchantsList.filter((m) => {
      if (categoryFilter === "gastronomia") {
        if (!m.category?.toLowerCase().includes("café") && !m.category?.toLowerCase().includes("gastronom") && !m.category?.toLowerCase().includes("pan")) {
          return false;
        }
      } else if (categoryFilter === "almacen") {
        if (!m.category?.toLowerCase().includes("almacén") && !m.category?.toLowerCase().includes("kiosco") && !m.category?.toLowerCase().includes("verdul")) {
          return false;
        }
      } else if (categoryFilter === "mayorista") {
        if (!m.category?.toLowerCase().includes("mayorista") && !m.category?.toLowerCase().includes("distribuidora") && !m.category?.toLowerCase().includes("harina")) {
          return false;
        }
      } else if (categoryFilter === "servicios") {
        if (!m.category?.toLowerCase().includes("imprenta") && !m.category?.toLowerCase().includes("ferretería")) {
          return false;
        }
      }

      if (!q) return true;

      const aliasMatch = m.alias.toLowerCase().includes(q);
      const nameMatch = m.displayName.toLowerCase().includes(q);
      const legalMatch = m.legalName?.toLowerCase().includes(q);
      const cuitMatch = m.cuit?.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
      const categoryMatch = m.category?.toLowerCase().includes(q);

      return aliasMatch || nameMatch || legalMatch || cuitMatch || categoryMatch;
    });
  }, [merchantsList, searchQuery, categoryFilter]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contactsList;

    return contactsList.filter((c) => {
      const aliasMatch = c.alias.toLowerCase().includes(q);
      const nameMatch = c.displayName.toLowerCase().includes(q);
      const cuitMatch = c.cuit?.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
      return aliasMatch || nameMatch || cuitMatch;
    });
  }, [contactsList, searchQuery]);

  const handleSelectRecipient = (recipient: TransactionCounterparty) => {
    setSelectedRecipient(recipient);
    setStep(2);
  };

  const handleKeypadPress = (key: string) => {
    if (key === "DEL") {
      setAmountInput((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
      return;
    }
    setAmountInput((prev) => {
      const next = prev === "0" ? key : `${prev}${key}`;
      return next.length > 8 ? prev : next;
    });
  };

  const handleExecutePayment = () => {
    if (!selectedRecipient) return;
    const amountVal = parseFloat(amountInput) || 0;
    if (amountVal <= 0) return;

    const now = new Date();
    const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const randomHex = Math.random().toString(16).slice(2, 8);

    const newTx: LocalitoTransaction = {
      id: `tx_${randomHex}`,
      direction: "out",
      counterparty: selectedRecipient,
      amount: amountVal,
      symbol: "PRt",
      arsEquivalent: amountVal,
      accentHex: "#00DF1A",
      note: conceptNote.trim() || undefined,
      timeLabel,
      dateGroup: "HOY",
      txHash: `0x${randomHex}89c20a4f`,
      status: "confirmed",
      zeroSumVerified: true,
    };

    setConfirmedTx(newTx);
    onPaymentSuccess(newTx);
    setStep(4);
  };

  const parsedAmount = parseFloat(amountInput) || 0;
  const isOverBalance = parsedAmount > userBalancePrt;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0A0C10] text-white overflow-hidden select-none mobile-device-view">
      {/* ======================================================================
          PANTALLA 1: DIRECTORIO DE LOCALES Y BUSCADOR
          ====================================================================== */}
      {step === 1 && (
        <motion.div
          key="pay-step-1"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.18 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Top Bar minimalista */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                aria-label="Volver"
                className="w-9 h-9 rounded-full bg-[#141720] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base font-bold tracking-tight text-white">
                Transferir
              </h2>
            </div>

            <button
              type="button"
              onClick={onOpenQrScanner}
              aria-label="Escanear QR"
              className="w-9 h-9 rounded-full bg-[#141720] hover:bg-[#1A1F2C] border border-white/10 flex items-center justify-center text-[#00DF1A] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
            >
              <QrCode className="w-4 h-4 stroke-[2.4]" />
            </button>
          </div>

          {/* Buscador limpio */}
          <div className="px-5 pt-3 pb-2 shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por $tag, nombre o CUIT"
                aria-label="Buscar destinatario"
                className="w-full h-11 pl-10 pr-9 rounded-2xl bg-[#13161F] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00DF1A] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Borrar búsqueda"
                  className="w-6 h-6 rounded-full bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Píldoras de filtro (scroll táctil horizontal limpio sin barra visible) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 overscroll-x-contain touch-pan-x">
              {CATEGORY_TABS.map((cat) => {
                const isActive = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`h-7 px-3 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      isActive
                        ? "bg-[#00DF1A] text-[#090D0A] font-bold"
                        : "bg-[#141720] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de comercios y contactos (scroll táctil vertical fluido sin barra visible) */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-8 space-y-4 pt-1 overscroll-contain touch-pan-y">
            {/* LOCALES */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-zinc-400 px-1">
                Locales
              </span>

              {filteredMerchants.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#13161F] border border-white/[0.06] text-center">
                  <p className="text-xs text-zinc-400">
                    No encontramos locales con ese criterio.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredMerchants.map((merchant) => (
                    <motion.button
                      key={merchant.alias}
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      onClick={() => handleSelectRecipient(merchant)}
                      className="w-full p-3 rounded-2xl bg-[#13161F] hover:bg-[#181D27] border border-white/[0.06] flex items-center justify-between transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-[#1D222F] border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-[#00DF1A] shrink-0">
                          {merchant.avatarText}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white truncate">
                              {merchant.displayName}
                            </span>
                            {merchant.verified && (
                              <BadgeCheck className="w-3.5 h-3.5 text-[#00DF1A] shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span className="truncate">{merchant.category} · {merchant.address}</span>
                          </div>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-semibold text-zinc-300 shrink-0 pl-2">
                        {merchant.alias}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* CONTACTOS */}
            {categoryFilter === "all" && filteredContacts.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-zinc-400 px-1">
                  Contactos
                </span>

                <div className="space-y-1.5">
                  {filteredContacts.map((contact) => (
                    <motion.button
                      key={contact.alias}
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      onClick={() => handleSelectRecipient(contact)}
                      className="w-full p-3 rounded-2xl bg-[#11141C] hover:bg-[#161B26] border border-white/[0.05] flex items-center justify-between transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#1A1F2C] border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-zinc-200 shrink-0">
                          {contact.avatarText}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block truncate">
                            {contact.displayName}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 block truncate">
                            {contact.category || "Contacto"}
                          </span>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-semibold text-zinc-300">
                        {contact.alias}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Entrada directa para cualquier $alias nuevo */}
            {searchQuery.startsWith("$") && searchQuery.length > 2 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() =>
                    handleSelectRecipient({
                      alias: searchQuery.toLowerCase(),
                      displayName: searchQuery.replace("$", "").toUpperCase(),
                      legalName: searchQuery,
                      avatarText: searchQuery.replace("$", "").slice(0, 2).toUpperCase(),
                      role: "contacto",
                      cuit: "Verificación en proceso",
                    })
                  }
                  className="w-full p-3 rounded-2xl bg-[#141822] border border-white/10 hover:border-[#00DF1A] flex items-center justify-between text-left cursor-pointer transition-colors"
                >
                  <span className="font-mono text-xs text-[#00DF1A]">
                    Transferir a {searchQuery.toLowerCase()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ======================================================================
          PANTALLA 2: DATOS DEL DESTINATARIO Y MONTO EN PRt
          ====================================================================== */}
      {step === 2 && selectedRecipient && (
        <motion.div
          key="pay-step-2"
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 14 }}
          transition={{ duration: 0.18 }}
          className="flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar px-5 py-4 overscroll-contain touch-pan-y"
        >
          {/* Header con volver */}
          <div className="space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                aria-label="Volver"
                className="w-9 h-9 rounded-full bg-[#141720] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-zinc-400">
                {selectedRecipient.alias}
              </span>
              <div className="w-9" />
            </div>

            {/* Ficha limpia del destinatario */}
            <div className="rounded-[22px] bg-[#13161F] border border-white/10 p-3.5 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#1C212E] border border-white/10 flex items-center justify-center font-mono text-sm font-bold text-[#00DF1A] shrink-0">
                  {selectedRecipient.avatarText}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white truncate">
                      {selectedRecipient.displayName}
                    </h3>
                    {selectedRecipient.verified && (
                      <BadgeCheck className="w-3.5 h-3.5 text-[#00DF1A] shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 truncate">
                    {selectedRecipient.cuit ? `CUIT ${selectedRecipient.cuit}` : selectedRecipient.alias}
                    {selectedRecipient.legalName && selectedRecipient.legalName !== selectedRecipient.displayName
                      ? ` · ${selectedRecipient.legalName}`
                      : ""}
                  </div>
                </div>
              </div>

              {selectedRecipient.address && (
                <div className="text-[11px] text-zinc-400 font-mono pt-1.5 border-t border-white/[0.05] flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="truncate">{selectedRecipient.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Monto e input en PRt */}
          <div className="my-auto py-2 space-y-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums text-white">
                $ {formatNumber(parsedAmount, 0)}
              </span>
              <span className="text-sm font-mono font-bold text-[#00DF1A]">
                PRt
              </span>
            </div>

            <div className="text-xs font-mono text-zinc-400">
              Disponible: {formatNumber(userBalancePrt, 0)} PRt
            </div>

            {isOverBalance && (
              <span className="inline-block text-xs font-medium text-rose-400">
                Saldo insuficiente
              </span>
            )}

            {/* Chips de monto rápido */}
            <div className="grid grid-cols-4 gap-1.5 pt-1.5 max-w-xs mx-auto">
              {[
                { label: "+1.000", add: 1000 },
                { label: "+5.000", add: 5000 },
                { label: "+20.000", add: 20000 },
                { label: "Máx", add: -1 },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    if (chip.add === -1) {
                      setAmountInput(Math.max(1, Math.floor(userBalancePrt)).toString());
                    } else {
                      const curr = parseInt(amountInput, 10) || 0;
                      setAmountInput((curr + chip.add).toString());
                    }
                  }}
                  className="h-8 rounded-xl bg-[#141720] border border-white/[0.08] hover:border-white/20 text-[11px] font-mono font-semibold text-zinc-200 cursor-pointer transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Motivo o concepto */}
            <div className="pt-1.5 max-w-xs mx-auto">
              <input
                type="text"
                value={conceptNote}
                onChange={(e) => setConceptNote(e.target.value)}
                placeholder="Motivo (opcional)"
                maxLength={45}
                aria-label="Motivo"
                className="w-full h-9 px-3 rounded-xl bg-[#12151D] border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00DF1A]"
              />
            </div>
          </div>

          {/* Teclado numérico táctil */}
          <div className="space-y-3 shrink-0">
            <div className="grid grid-cols-3 gap-1.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "DEL"].map((k) => (
                <motion.button
                  key={k}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleKeypadPress(k)}
                  aria-label={k === "DEL" ? "Borrar" : k}
                  className="h-11 rounded-2xl bg-[#13161F] border border-white/[0.05] hover:bg-[#181C26] text-base font-bold tabular-nums text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  {k === "DEL" ? <Delete className="w-4 h-4 text-zinc-300" /> : k}
                </motion.button>
              ))}
            </div>

            <button
              type="button"
              disabled={parsedAmount <= 0 || isOverBalance}
              onClick={() => setStep(3)}
              className="w-full h-12 rounded-full bg-[#00DF1A] text-[#090D0A] font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_6px_20px_rgba(0,223,26,0.3)] disabled:opacity-35 disabled:pointer-events-none transition-all active:scale-[0.98]"
            >
              <span>Continuar</span>
              <ChevronRight className="w-4 h-4 stroke-[2.8]" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ======================================================================
          PANTALLA 3: REVISIÓN Y DESLIZAR PARA PAGAR
          ====================================================================== */}
      {step === 3 && selectedRecipient && (
        <motion.div
          key="pay-step-3"
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 14 }}
          transition={{ duration: 0.18 }}
          className="flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar px-5 py-4 overscroll-contain touch-pan-y"
        >
          {/* Header con volver */}
          <div className="space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                aria-label="Volver"
                className="w-9 h-9 rounded-full bg-[#141720] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-zinc-400">
                Revisión
              </span>
              <div className="w-9" />
            </div>

            {/* Monto destacado */}
            <div className="text-center py-2 space-y-0.5">
              <div className="text-4xl sm:text-5xl font-black text-[#00DF1A] tracking-tight tabular-nums">
                $ {formatNumber(parsedAmount, 0)}{" "}
                <span className="text-xl font-mono text-white">PRt</span>
              </div>
            </div>

            {/* Resumen de la operación */}
            <div className="rounded-[22px] bg-[#13161F] border border-white/10 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Para</span>
                <span className="font-semibold text-white">
                  {selectedRecipient.displayName} ({selectedRecipient.alias})
                </span>
              </div>

              {selectedRecipient.cuit && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">CUIT</span>
                  <span className="font-mono text-zinc-300">
                    {selectedRecipient.cuit}
                  </span>
                </div>
              )}

              {conceptNote && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Motivo</span>
                  <span className="text-zinc-200 truncate max-w-[180px]">
                    {conceptNote}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Comisión</span>
                <span className="font-mono text-[#00DF1A] font-semibold">
                  $ 0
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <span className="text-zinc-400">Saldo restante</span>
                <span className="font-mono font-bold text-white">
                  {formatNumber(Math.max(0, userBalancePrt - parsedAmount), 0)} PRt
                </span>
              </div>
            </div>
          </div>

          {/* Deslizar para pagar */}
          <div className="pt-4 shrink-0">
            <SlideToPay
              label="Deslizá para pagar"
              onConfirm={handleExecutePayment}
              disabled={parsedAmount <= 0 || isOverBalance}
            />
          </div>
        </motion.div>
      )}

      {/* ======================================================================
          PANTALLA 4: COMPROBANTE DIGITAL EXITOSO
          ====================================================================== */}
      {step === 4 && confirmedTx && (
        <motion.div
          key="pay-step-4"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar px-5 py-6 text-center overscroll-contain touch-pan-y"
        >
          <div className="space-y-4 my-auto">
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
              className="mx-auto w-16 h-16 rounded-full bg-[#00DF1A] text-[#090D0A] flex items-center justify-center shadow-[0_0_35px_rgba(0,223,26,0.5)]"
            >
              <Check className="w-8 h-8 stroke-[3]" />
            </motion.div>

            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-[#00DF1A] uppercase tracking-wider block">
                Transferencia enviada
              </span>
              <div className="text-3xl font-black text-white tracking-tight tabular-nums">
                $ {formatNumber(confirmedTx.amount, 0)} {confirmedTx.symbol}
              </div>
              <p className="text-xs text-zinc-400">
                A {confirmedTx.counterparty.displayName} ({confirmedTx.counterparty.alias})
              </p>
            </div>

            <div className="rounded-[22px] bg-[#13161F] border border-white/10 p-3.5 space-y-2 text-xs text-left max-w-sm mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-mono">Comprobante</span>
                <span className="font-mono text-zinc-200">
                  #{confirmedTx.id.replace("tx_", "")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-mono">Hora</span>
                <span className="font-mono text-zinc-200">
                  {confirmedTx.timeLabel} · Hoy
                </span>
              </div>
              {confirmedTx.note && (
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-1.5">
                  <span className="text-zinc-400">Motivo</span>
                  <span className="text-zinc-200 truncate max-w-[170px]">
                    {confirmedTx.note}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 shrink-0 pt-3">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setSelectedRecipient(null);
                setAmountInput("1500");
                setConceptNote("");
              }}
              className="w-full h-11 rounded-full bg-[#171B26] border border-white/10 text-white font-semibold text-xs flex items-center justify-center cursor-pointer hover:bg-[#1E2332] transition-colors"
            >
              Nueva transferencia
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-full bg-[#00DF1A] text-[#090D0A] font-bold text-sm cursor-pointer hover:bg-[#00DF1A]/90 transition-all shadow-[0_6px_20px_rgba(0,223,26,0.3)]"
            >
              Listo
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
