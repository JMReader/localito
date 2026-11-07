"use client";

import React, { useState, useRef } from "react";
import { Lock, Unlock, CheckCircle2, Clock, ArrowRight, ShieldCheck, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { AsciiTextSpinner } from "./AsciiTextSpinner";
import gsap from "gsap";

interface CriteriaItem {
  id: string;
  title: string;
  detail: string;
  status: "verified" | "pending" | "processing";
  verifiedAt?: string;
}

export function CriteriaLockCard() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(true);

  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const [criteria, setCriteria] = useState<CriteriaItem[]>([
    {
      id: "C1",
      title: "Suite de Tests Automatizada",
      detail: "100% passing tests & 92% branch coverage via GitHub Action Oracle",
      status: "verified",
      verifiedAt: "Bloque #49,201,182",
    },
    {
      id: "C2",
      title: "Auditoría Slither & Mythril",
      detail: "0 vulnerabilidades críticas o de severidad alta en smart contracts",
      status: "verified",
      verifiedAt: "Bloque #49,201,310",
    },
    {
      id: "C3",
      title: "Aprobación de Criterios por Cliente",
      detail: "Firma multisig (2 de 3) confirmando aceptación de hitos de entrega",
      status: "pending",
    },
  ]);

  const handleSimulateApproval = () => {
    if (isUnlocked || isVerifying) return;
    setIsVerifying(true);
    setTerminalLogs([]);

    if (buttonRef.current) {
      gsap.to(buttonRef.current, { scale: 0.97, duration: 0.1, yoyo: true, repeat: 1 });
    }

    // Step 1: Set C3 to processing
    setCriteria((prev) =>
      prev.map((c) => (c.id === "C3" ? { ...c, status: "processing" } : c))
    );

    // Stream live oracle terminal logs
    const logs = [
      "> [AVAX-RPC] Conectando a Avalanche C-Chain bloque #49,201,455...",
      "> [TWIN-ORACLE] Verificando paridad ARGt / USDT: 1.00000 (Delta: 0.00%)",
      "> [GITHUB-ACTION] PR #142 commit 9f8a2c: 84/84 tests PASSED (94.2% cov)",
      "> [SLITHER-AUDIT] AST verificado: 0 vulnerabilidades de severidad alta",
      "> [MULTISIG] Clave 0x4f2b... firmó. Quórum 2/3 alcanzado",
      "> [CRITERIALOCK] Hitos cumplidos. Liberando 50,000 ARGt...",
      "> [TRANSACCIÓN] Hash: 0x9a71...e24d • Estado: SUCCESS"
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setTerminalLogs((prev) => [...prev, log]);
      }, (index + 1) * 320);
    });

    // Complete verification
    setTimeout(() => {
      setCriteria((prev) =>
        prev.map((c) =>
          c.id === "C3"
            ? { ...c, status: "verified", verifiedAt: "Bloque #49,201,455" }
            : c
        )
      );
      setIsVerifying(false);
      setIsUnlocked(true);

      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { borderColor: "#00FF66" },
          { borderColor: "#27272a", duration: 1.5, ease: "power2.out" }
        );
      }
    }, logs.length * 320 + 200);
  };

  return (
    <div
      ref={cardRef}
      className="w-full flex flex-col gap-3.5 p-5 rounded-xl bg-[#09090b] border border-[#27272a] text-zinc-100 select-none transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1f1f23]">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
              isUnlocked
                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400"
                : "bg-blue-950/30 border-blue-500/40 text-blue-400"
            }`}
          >
            {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white font-sans">
                CriteriaLock Escrow
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                #TW-8841
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-500">
              0x794A...3e82 • Avalanche C-Chain
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-mono tracking-wider uppercase text-zinc-500">
            Fondo en Custodia
          </div>
          <div className="text-base font-mono font-bold text-white tracking-tight">
            50,000 <span className="text-xs text-emerald-400 font-semibold">ARGt</span>
          </div>
        </div>
      </div>

      {/* Custody Banner */}
      <div
        className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs font-mono transition-colors ${
          isUnlocked
            ? "bg-[#061e12] border-emerald-500/30 text-emerald-300"
            : "bg-[#081224] border-blue-500/25 text-blue-300"
        }`}
      >
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1 font-sans">
          {isUnlocked ? (
            <p className="font-medium text-emerald-200">
              ¡Fondos Liberados Onchain! El contrato CriteriaLock validó el 100% de los criterios y acreditó los 50,000 ARGt al destinatario.
            </p>
          ) : (
            <p className="text-zinc-300">
              Fondos bloqueados por contrato inteligente. La liberación se gatilla de forma automática e irrevocable cuando los criterios pasan la validación de oráculos.
            </p>
          )}
        </div>
      </div>

      {/* Criteria Checklist */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 uppercase tracking-wider px-0.5">
          <span>Criterios de Aceptación</span>
          <span>Estado Oráculo</span>
        </div>

        {criteria.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-[#0d0d10] border border-[#1f1f23] hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">
                {item.status === "verified" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : item.status === "processing" ? (
                  <AsciiTextSpinner variant={0} className="text-amber-400 text-sm" />
                ) : (
                  <Clock className="w-4 h-4 text-zinc-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200 font-sans">{item.title}</span>
                  {item.verifiedAt && (
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                      {item.verifiedAt}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5 font-sans leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded shrink-0 ${
                item.status === "verified"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : item.status === "processing"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-zinc-900 text-zinc-500 border border-zinc-800"
              }`}
            >
              {item.status === "verified" ? "VERIFICADO" : item.status === "processing" ? "VALIDANDO..." : "PENDIENTE"}
            </span>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div>
        <button
          ref={buttonRef}
          onClick={handleSimulateApproval}
          disabled={isUnlocked || isVerifying}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-xs font-sans transition-all duration-150 cursor-pointer ${
            isUnlocked
              ? "bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed"
              : isVerifying
              ? "bg-blue-600/25 border border-blue-500/40 text-blue-300 cursor-wait"
              : "bg-[#0066FF] hover:bg-[#0055DD] text-white shadow-md active:scale-[0.98]"
          }`}
        >
          {isUnlocked ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Contrato Ejecutado • Fondos Transferidos</span>
            </>
          ) : isVerifying ? (
            <>
              <AsciiTextSpinner variant={1} className="text-white text-xs" />
              <span>Verificando Oráculo & Firmando Transacción...</span>
            </>
          ) : (
            <>
              <span>Simular Aprobación de Criterios y Liberación</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Live Oracle Terminal Output (Pinterest Pin 4 & Pin 16) */}
      {(terminalLogs.length > 0 || isUnlocked) && (
        <div
          ref={terminalRef}
          className="mt-1 p-3 rounded-lg bg-[#000000] border border-[#1f1f23] font-mono text-[10.5px] text-zinc-400 flex flex-col gap-1 max-h-36 overflow-y-auto"
        >
          <div className="flex items-center justify-between text-[10px] text-zinc-500 pb-1 border-b border-zinc-900">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-blue-400" />
              <span>ORACLE_STREAM // AVALANCHE_C_CHAIN</span>
            </span>
            <span className="text-emerald-400 font-semibold">LIVE</span>
          </div>
          {terminalLogs.map((log, idx) => (
            <div
              key={idx}
              className={`${
                log.includes("SUCCESS") || log.includes("Liberando")
                  ? "text-emerald-400 font-semibold"
                  : log.includes("AVAX")
                  ? "text-blue-400"
                  : "text-zinc-300"
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
