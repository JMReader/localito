"use client";

import React, { useState } from "react";
import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowDownRight,
} from "lucide-react";
import { IosTactileButton } from "@/components/ui/IosTactileButton";
import { BenchoSegmentedControl } from "@/components/ui/BenchoSegmentedControl";
import { AsciiTextSpinner } from "@/components/AsciiTextSpinner";
import {
  CRITERIA_PRESETS,
  CURRENCY_RATES_TO_ARS,
  NotionCriteriaBlock,
  SupportedCurrency,
  VaultRecord,
} from "@/lib/mock-vaults-data";

export interface InteractiveVaultSimulatorProps {
  amount: string;
  currency: SupportedCurrency;
  onAmountChange: (val: string) => void;
  onCurrencyChange: (cur: SupportedCurrency) => void;
  onVaultCreated?: (vault: VaultRecord) => void;
}

const LOCKED_ASCII_ART = [
  "      . · : = + * # % @ % # * + = : · .      ",
  "    · : + # @ @ @ @ @ @ @ @ @ @ # + : ·    ",
  "   : + # @ @ ┌───────────────┐ @ @ # + :   ",
  "   + # @ @   │   ╭───────╮   │   @ @ # +   ",
  "   * # @ @   │   │  ███  │   │   @ @ # *   ",
  "   # @ @ ┌───┴───┴───────┴───┴───┐ @ @ #   ",
  "   % @ @ │  [ LOCKED ESCROW ]    │ @ @ %   ",
  "   @ @ @ │      ╭─────────╮      │ @ @ @   ",
  "   % @ @ │      │   (●)   │      │ @ @ %   ",
  "   # @ @ │      ╰───┬─┬───╯      │ @ @ #   ",
  "   * # @ └──────────┴─┴──────────┘ @ # *   ",
  "    · : + # % @ @ @ @ @ @ @ @ % # + : ·    ",
];

const UNLOCKED_ASCII_ART = [
  "    * + # @ ·   [ SHOCKWAVE ]   · @ # + *    ",
  "  + # @ ·         ╭───────╮         · @ # +  ",
  " : # @            │       │            @ # : ",
  " + @     ┌────────┘       │              @ + ",
  " * @     │                │              @ * ",
  " # @ ┌───┴────────────────┴──────┐       @ # ",
  " % @ │   [ UNLOCKED // SENT ]    │       @ % ",
  " @ @ │        ╭─────────╮        │       @ @ ",
  " % @ │        │   (✓)   │        │       @ % ",
  " # @ │        ╰─────────╯        │       @ # ",
  " * # └───────────────────────────┘       # * ",
  "   · : = + * # % @ @ @ @ @ % # * + = : ·   ",
];

export function InteractiveVaultSimulator({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  onVaultCreated,
}: InteractiveVaultSimulatorProps) {
  const [contractTitle, setContractTitle] = useState(
    "Desarrollo MVP E-Commerce + Liquidación ARGt"
  );
  const [customRuleTitle, setCustomRuleTitle] = useState("");

  const [criteria, setCriteria] = useState<NotionCriteriaBlock[]>([
    {
      id: "sim-c1",
      code: "01",
      title: "Suite de Tests E2E pasando al 100%",
      oracleType: "github-ci",
      oracleLabel: "GitHub CI",
      quorumProp: "Auto",
      targetHash: "0x8f4a...c91e",
      status: "verified",
    },
    {
      id: "sim-c2",
      code: "02",
      title: "Auditoría Slither: 0 vulnerabilidades críticas",
      oracleType: "slither-audit",
      oracleLabel: "Slither AST",
      quorumProp: "Auto",
      targetHash: "0x2d77...90a1",
      status: "verified",
    },
    {
      id: "sim-c3",
      code: "03",
      title: "Firma 2/2 aprobando entrega en producción",
      oracleType: "multisig",
      oracleLabel: "Multisig 2/2",
      quorumProp: "Quórum",
      targetHash: "0x5e19...b220",
      status: "pending",
    },
  ]);

  const [isVerifying, setIsVerifying] = useState(false);

  const verifiedCount = criteria.filter((c) => c.status === "verified").length;
  const totalCount = criteria.length;
  const isAllUnlocked = totalCount > 0 && verifiedCount === totalCount;

  const rawNumeric = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const arsRate = CURRENCY_RATES_TO_ARS[currency] || 1;
  const arsTotal = rawNumeric * arsRate;
  const usdtEquivalent = arsTotal / 1180;

  const handleToggleCriterion = (id: string) => {
    if (isVerifying) return;
    setCriteria((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          status: c.status === "verified" ? "pending" : "verified",
        };
      })
    );
  };

  const handleDeleteCriterion = (id: string) => {
    if (isVerifying) return;
    setCriteria((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c, idx) => ({
          ...c,
          code: `0${idx + 1}`,
        }))
    );
  };

  const handleAddCustomRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRuleTitle.trim() || isVerifying) return;
    const nextNum = criteria.length + 1;
    setCriteria((prev) => [
      ...prev,
      {
        id: `sim-custom-${Date.now()}`,
        code: `0${nextNum}`,
        title: customRuleTitle.trim(),
        oracleType: "github-ci",
        oracleLabel: "Oráculo Onchain",
        quorumProp: "Auto",
        targetHash: "0x9a12...f401",
        status: "pending",
      },
    ]);
    setCustomRuleTitle("");
  };

  const handleRunOracleVerification = () => {
    if (isVerifying || criteria.length === 0) return;
    setIsVerifying(true);
    setCriteria((prev) =>
      prev.map((c) =>
        c.status === "pending" ? { ...c, status: "verifying" } : c
      )
    );

    setTimeout(() => {
      setCriteria((prev) =>
        prev.map((c) => ({
          ...c,
          status: "verified",
        }))
      );
      setIsVerifying(false);
    }, 900);
  };

  const handleResetSimulation = () => {
    if (isVerifying) return;
    setCriteria((prev) =>
      prev.map((c, i) => ({
        ...c,
        status: i === prev.length - 1 ? "pending" : "verified",
      }))
    );
  };

  const handlePublishToExplorer = () => {
    const newId = `TW-${Math.floor(8850 + Math.random() * 140)}`;
    const newVault: VaultRecord = {
      id: newId,
      title: contractTitle || "Acuerdo de Custodia",
      category: "Simulador",
      clientName: "Billetera Local",
      clientAddress: "0x88a1...4f20",
      beneficiaryName: "Estudio Binario",
      beneficiaryAddress: "0x9f2c...31a0",
      amountNumeric: rawNumeric || 500000,
      amountFormatted: amount || "500,000",
      currency,
      criteriaPassed: verifiedCount,
      criteriaTotal: Math.max(1, totalCount),
      oracleEngine: criteria[0]?.oracleLabel || "GitHub CI + Multisig",
      status: isAllUnlocked ? "LIBERADO" : "CUSTODIA_ACTIVA",
      createdAt: "Recién creado",
      txHash: "0x9a71c402...e24d",
      blockNumber: "#49,201,618",
      asciiSeed: `Custom-${newId}`,
      summary: `Bóveda por ${amount} ${currency} con ${criteria.length} reglas verificables.`,
      criteriaList: criteria.map((c) => ({ ...c })),
      activityTimeline: [
        {
          time: "Ahora",
          title: isAllUnlocked
            ? `Plata liberada (${amount} ${currency})`
            : `Plata bloqueada (${amount} ${currency})`,
          detail: `${criteria.length} reglas activas`,
          isHighlight: true,
        },
      ],
    };

    onVaultCreated?.(newVault);
    setTimeout(() => {
      document
        .getElementById("explorador-pilar")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  return (
    <section
      id="simulador"
      aria-labelledby="simulator-heading"
      className="relative w-full py-24 sm:py-32 border-b border-zinc-900 bg-[#000000]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Encabezado Limpio de Gran Escala */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-pinterest-bright block mb-3">
              03 // Simulador Interactivo
            </span>
            <h2
              id="simulator-heading"
              className="text-[clamp(2.2rem,4.5vw,3.8rem)] font-semibold tracking-[-0.03em] text-white leading-[1.04]"
            >
              Armá tu bloqueo{" "}
              <span className="text-zinc-400 font-normal">
                y destrabá el candado en vivo.
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={handleResetSimulation}
            className="inline-flex items-center gap-2 font-mono text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer self-start md:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 text-pinterest-bright" />
            <span>Reiniciar candado</span>
          </button>
        </div>

        {/* Layout Limpio en 2 Columnas Abiertas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* ══════════════════════════════════════════════════════════════════
              COLUMNA IZQUIERDA (5 COLS): CANDADO ASCII LIBRE + MONTO GRANDE
              ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 flex flex-col">
            {/* Arte ASCII del Candado Flotando sin Caja */}
            <div className="py-6 mb-8 flex flex-col items-center justify-center border-b border-zinc-900">
              <pre
                aria-label={
                  isAllUnlocked ? "Candado abierto" : "Candado cerrado"
                }
                className={`font-mono text-xs sm:text-sm leading-[1.25] select-none transition-colors duration-300 ${
                  isAllUnlocked
                    ? "text-[#1FE05A] font-bold"
                    : "text-pinterest-bright"
                }`}
              >
                {(isAllUnlocked ? UNLOCKED_ASCII_ART : LOCKED_ASCII_ART).join(
                  "\n"
                )}
              </pre>

              <div className="mt-4 inline-flex items-center gap-2 font-mono text-xs">
                {isAllUnlocked ? (
                  <span className="text-[#1FE05A] flex items-center gap-1.5 font-semibold">
                    <Unlock className="w-3.5 h-3.5" /> PLATA LIBERADA ({verifiedCount}/{totalCount})
                  </span>
                ) : (
                  <span className="text-pinterest-ice flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> CUSTODIA INMOVILIZADA ({verifiedCount}/{totalCount})
                  </span>
                )}
              </div>
            </div>

            {/* Selector de Moneda */}
            <div className="mb-6">
              <BenchoSegmentedControl<SupportedCurrency>
                ariaLabel="Moneda de custodia"
                value={currency}
                onChange={onCurrencyChange}
                variant="accent-pill"
                size="md"
                options={[
                  { id: "ARGt", label: "ARGt" },
                  { id: "USDT", label: "USDT" },
                  { id: "USDC", label: "USDC" },
                  { id: "BRAt", label: "BRAt" },
                ]}
              />
            </div>

            {/* Input Tipográfico Gigante para el Monto */}
            <div className="pb-6 mb-6 border-b border-zinc-900">
              <div className="flex items-baseline justify-between mb-2">
                <label
                  htmlFor="sim-amount-input"
                  className="font-mono text-xs uppercase text-zinc-400"
                >
                  Monto a bloquear
                </label>
                <span className="font-mono text-xs text-pinterest-ice tabular-nums">
                  {currency === "ARGt"
                    ? `≈ ${usdtEquivalent.toLocaleString("es-AR", {
                        maximumFractionDigits: 0,
                      })} USDT`
                    : `≈ $ ${arsTotal.toLocaleString("es-AR", {
                        maximumFractionDigits: 0,
                      })} ARGt`}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="font-mono text-3xl sm:text-5xl text-pinterest-bright font-semibold select-none">
                  {currency === "ARGt" ? "$" : currency === "BRAt" ? "R$" : "US$"}
                </span>
                <input
                  id="sim-amount-input"
                  type="text"
                  value={amount}
                  onChange={(e) => onAmountChange(e.target.value)}
                  className="w-full bg-transparent font-mono text-4xl sm:text-6xl font-bold text-white focus:outline-none tabular-nums tracking-tight"
                />
              </div>
            </div>

            {/* Concepto Editable Limpio */}
            <div>
              <label
                htmlFor="sim-title-input"
                className="block font-mono text-xs uppercase text-zinc-400 mb-2"
              >
                Concepto del acuerdo
              </label>
              <input
                id="sim-title-input"
                type="text"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                className="w-full bg-transparent border-b border-zinc-800 focus:border-[var(--accent-bright)] py-2 text-base text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              COLUMNA DERECHA (7 COLS): REGLAS DE LIBERACIÓN LIMPIAS
              ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-900">
              <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Condiciones para liberar el pago
              </h3>
              <span className="font-mono text-xs text-pinterest-ice tabular-nums">
                {verifiedCount} de {totalCount} cumplidas
              </span>
            </div>

            {/* Lista de Reglas sin Ruido Visual */}
            <div className="divide-y divide-zinc-900 mb-6">
              {criteria.map((item) => {
                const isVerified = item.status === "verified";
                const isProc = item.status === "verifying";
                return (
                  <div
                    key={item.id}
                    className="py-4 flex items-center justify-between gap-4 group"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleCriterion(item.id)}
                      className="flex items-center gap-4 text-left flex-1 cursor-pointer focus-visible:outline-none"
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isVerified
                            ? "bg-pinterest-primary text-[var(--accent-ink)]"
                            : isProc
                            ? "bg-amber-950 text-amber-300"
                            : "border border-zinc-700 text-zinc-500 group-hover:border-white"
                        }`}
                      >
                        {isVerified ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isProc ? (
                          <AsciiTextSpinner
                            variant={0}
                            className="text-amber-300 text-[10px]"
                          />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </span>

                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-base sm:text-lg block truncate ${
                            isVerified
                              ? "text-white font-medium"
                              : "text-zinc-400"
                          }`}
                        >
                          {item.title}
                        </span>
                      </div>

                      <span className="hidden sm:inline-block font-mono text-xs text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-900">
                        {item.oracleLabel}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCriterion(item.id)}
                      aria-label={`Eliminar regla ${item.code}`}
                      className="p-2 text-zinc-600 hover:text-white transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Agregar Regla Nueva o Preset en 1 Línea */}
            <form
              onSubmit={handleAddCustomRule}
              className="flex items-center gap-3 pb-8 mb-8 border-b border-zinc-900"
            >
              <input
                type="text"
                value={customRuleTitle}
                onChange={(e) => setCustomRuleTitle(e.target.value)}
                placeholder="Sumar otra condición (ej. Entrega de llaves / Deploy final)..."
                className="flex-1 bg-transparent border-b border-zinc-800 focus:border-[var(--accent-bright)] py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
              <IosTactileButton type="submit" variant="carbon-matte" size="sm">
                <Plus className="w-3.5 h-3.5" />
                <span>Sumar</span>
              </IosTactileButton>
            </form>

            {/* Botones de Acción Principal */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <IosTactileButton
                variant="primary-accent"
                size="lg"
                isLoading={isVerifying}
                loadingLabel="Verificando en Avalanche..."
                showArrow
                onClick={handleRunOracleVerification}
                className="flex-1"
              >
                {isAllUnlocked
                  ? "Volver a Validar Condiciones"
                  : `Validar Reglas y Liberar ${amount} ${currency}`}
              </IosTactileButton>

              <IosTactileButton
                variant="carbon-matte"
                size="lg"
                onClick={handlePublishToExplorer}
              >
                <span>Publicar en Bóvedas</span>
                <ArrowDownRight className="w-4 h-4 text-pinterest-bright" />
              </IosTactileButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
