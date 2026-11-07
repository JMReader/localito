"use client";

import React, { useState, useEffect } from "react";
import { Check, X, Lock, ArrowUp, Terminal } from "lucide-react";
import { IosTactileButton } from "@/components/ui/IosTactileButton";

export interface LemonVsTraditionalMatrixProps {
  onCreateVaultClick?: () => void;
}

interface ComparisonRow {
  criterion: string;
  informal: string;
  platformsWeb2: string;
  criteriaLock: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    criterion: "Riesgo de impago al entregar",
    informal: "Alto (dependés de la buena fe)",
    platformsWeb2: "Medio (disputas subjetivas)",
    criteriaLock: "0%: La plata ya está inmovilizada desde el día 1",
  },
  {
    criterion: "Comisión de intermediación",
    informal: "0% a 7% bancario",
    platformsWeb2: "10% al 20% (Upwork / Fiverr)",
    criteriaLock: "0%: Sin intermediarios (Gas < $0.004 USD)",
  },
  {
    criterion: "Moneda de custodia",
    informal: "Pesos que se devalúan a 30/60 días",
    platformsWeb2: "Solo USD con trabas de retiro",
    criteriaLock: "ARGt (1:1 ARS), USDT, USDC y BRAt onchain",
  },
  {
    criterion: "Velocidad de cobro",
    informal: "De 7 a 90 días",
    platformsWeb2: "5 a 14 días de clearing",
    criteriaLock: "Instantáneo en 0.78 segundos en el mismo bloque",
  },
];

export function LemonVsTraditionalMatrix({
  onCreateVaultClick,
}: LemonVsTraditionalMatrixProps) {
  const [blockHeight, setBlockHeight] = useState(49201840);

  useEffect(() => {
    const timer = setInterval(() => {
      setBlockHeight((b) => b + 1);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      id="comparativa"
      aria-labelledby="matrix-heading"
      className="relative w-full pt-24 sm:pt-32 pb-36 bg-[#000000]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Encabezado de Gran Escala */}
        <div className="max-w-3xl mb-16">
          <span className="font-mono text-xs uppercase tracking-widest text-pinterest-bright block mb-3">
            05 // Por qué CriteriaLock
          </span>
          <h2
            id="matrix-heading"
            className="text-[clamp(2.2rem,4.5vw,3.8rem)] font-semibold tracking-[-0.03em] text-white leading-[1.04]"
          >
            Bloquear en código{" "}
            <span className="text-zinc-400 font-normal">
              supera a cualquier intermediario.
            </span>
          </h2>
        </div>

        {/* Tabla Comparativa Minimalista sin Caja Exterior */}
        <div className="overflow-x-auto mb-28 border-t border-zinc-900">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-900 font-mono text-xs uppercase">
                <th className="py-5 pr-6 text-zinc-400 w-[24%]">Criterio</th>
                <th className="py-5 px-6 text-zinc-500 w-[24%]">De Palabra</th>
                <th className="py-5 px-6 text-zinc-500 w-[24%]">
                  Web2 (20% Fee)
                </th>
                <th className="py-5 px-6 text-pinterest-ice font-bold w-[28%]">
                  CriteriaLock // Onchain
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-sm">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="group">
                  <td className="py-6 pr-6 font-medium text-white">
                    {row.criterion}
                  </td>
                  <td className="py-6 px-6 text-zinc-500">
                    <span className="inline-flex items-center gap-2">
                      <X className="w-4 h-4 text-zinc-600 shrink-0" />
                      <span>{row.informal}</span>
                    </span>
                  </td>
                  <td className="py-6 px-6 text-zinc-500">
                    <span className="inline-flex items-center gap-2">
                      <X className="w-4 h-4 text-zinc-600 shrink-0" />
                      <span>{row.platformsWeb2}</span>
                    </span>
                  </td>
                  <td className="py-6 px-6 text-white font-medium">
                    <span className="inline-flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-pinterest-primary text-[var(--accent-ink)] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                      <span>{row.criteriaLock}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cierre Monumental sin Contenedor */}
        <div className="py-16 border-t border-zinc-900 flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-16">
          <div className="max-w-3xl">
            <h3 className="text-[clamp(2.2rem,5vw,4.2rem)] font-semibold tracking-[-0.035em] text-white leading-[1.02]">
              Tu próximo acuerdo no se negocia en el aire.{" "}
              <span className="text-pinterest-bright">
                Se bloquea en código.
              </span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <IosTactileButton
              variant="primary-accent"
              size="lg"
              showArrow
              onClick={() => {
                if (onCreateVaultClick) {
                  onCreateVaultClick();
                } else {
                  document
                    .getElementById("simulador")
                    ?.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              <Lock className="w-4 h-4" />
              <span>Crear Bloqueo Ahora</span>
            </IosTactileButton>

            <IosTactileButton
              variant="carbon-matte"
              size="lg"
              onClick={() => {
                document
                  .getElementById("boveda")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span>Subir al Guardián</span>
              <ArrowUp className="w-4 h-4" />
            </IosTactileButton>
          </div>
        </div>

        {/* Footer Minimalista */}
        <footer className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-pinterest-primary text-[var(--accent-ink)] font-bold">
              [TW]
            </span>
            <span>CriteriaLock · Twin Finance × Avalanche</span>
          </div>

          <div className="flex items-center gap-2 tabular-nums text-zinc-400">
            <Terminal className="w-3.5 h-3.5 text-[#1FE05A]" />
            <span>AVAX BLOCK #{blockHeight.toLocaleString("es-AR")}</span>
          </div>
        </footer>
      </div>
    </section>
  );
}
