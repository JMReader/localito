"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  GlyphRampKey,
  PINTEREST_PALETTES,
  PinterestPaletteKey,
} from "@/lib/mock-vaults-data";
import { IosTactileButton } from "@/components/ui/IosTactileButton";

const AsciiWake = dynamic(
  () => import("@/components/ASCIIWake").then((mod) => mod.AsciiWake),
  { ssr: false }
);

const Particles = dynamic(
  () => import("@/components/Particles").then((mod) => mod.Particles),
  { ssr: false }
);

export interface AsciiWakeStepsBentoProps {
  glyphRamp: GlyphRampKey;
  pinterestPalette?: PinterestPaletteKey;
  onJumpToSimulator?: () => void;
}

type ParticleStageShape = "Circle" | "Square" | "Flower";

export function AsciiWakeStepsBento({
  glyphRamp,
  pinterestPalette = "cobalt",
  onJumpToSimulator,
}: AsciiWakeStepsBentoProps) {
  const paletteCfg = PINTEREST_PALETTES[pinterestPalette];
  const [particleShape, setParticleShape] =
    useState<ParticleStageShape>("Square");

  return (
    <section
      id="como-funciona"
      aria-labelledby="bento-steps-heading"
      className="relative w-full bg-[#000000] border-b border-zinc-900"
    >
      {/* ══════════════════════════════════════════════════════════════════════
          BLOQUE GRÁFICO 01: ESCALA EDITORIAL + CUBO HALFTONE LIBRE (ASCIIWAKE)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Columna Tipográfica de Gran Escala (6 cols) */}
          <div className="lg:col-span-6">
            <span className="font-mono text-6xl sm:text-8xl font-bold tracking-tighter text-pinterest-bright opacity-90 block leading-none mb-6">
              01.
            </span>
            <h2
              id="bento-steps-heading"
              className="text-[clamp(2rem,4vw,3.4rem)] font-semibold tracking-[-0.03em] text-white leading-[1.06] mb-5"
            >
              Depositá y congelá la plata en una{" "}
              <span className="text-pinterest-ice">bóveda neutral.</span>
            </h2>
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl">
              Los fondos en <strong className="text-white">ARGt o USDT</strong>{" "}
              quedan visibles e inmovilizados en Avalanche: quien trabaja sabe
              que la plata ya está lista y quien paga sabe que nadie puede
              retirarla sin cumplir.
            </p>
          </div>

          {/* Elemento Gráfico Abierto: Cubo Halftone AsciiWake sin Contenedor (6 cols) */}
          <div
            className="lg:col-span-6 flex flex-col items-center justify-center py-6 select-none"
            style={{ color: paletteCfg.brightHex }}
          >
            <div className="scale-110 sm:scale-125 flex items-center justify-center">
              <AsciiWake
                glyphs={glyphRamp}
                size={11}
                reach={62}
                trail={1.35}
                pull={42}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOQUE GRÁFICO 02: ENJAMBRE DE PARTÍCULAS LIBRE + LIQUIDACIÓN 0.78s
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-24 sm:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Elemento Gráfico Abierto: Enjambre Particles sin Caja (6 cols) */}
            <div
              className="lg:col-span-6 order-2 lg:order-1 flex flex-col items-center justify-center overflow-hidden select-none"
              style={{ color: paletteCfg.brightHex }}
            >
              <Particles
                shape={particleShape}
                reach={95}
                force={70}
                grain="Coarse"
              />

              {/* Píldoras Minimalistas para Cambiar la Geometría del Enjambre */}
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-950 border border-zinc-800/80 mt-6">
                {(
                  [
                    { id: "Circle", label: "1. Orden" },
                    { id: "Square", label: "2. Bóveda" },
                    { id: "Flower", label: "3. Liberación" },
                  ] as const
                ).map((item) => {
                  const active = particleShape === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setParticleShape(item.id)}
                      className={`px-4 py-1.5 rounded-full font-mono text-xs transition-all cursor-pointer ${
                        active
                          ? "bg-pinterest-primary font-semibold text-[var(--accent-ink)]"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Columna Tipográfica de Gran Escala (6 cols) */}
            <div className="lg:col-span-6 order-1 lg:order-2">
              <span className="font-mono text-6xl sm:text-8xl font-bold tracking-tighter text-pinterest-bright opacity-90 block leading-none mb-6">
                02.
              </span>
              <h3 className="text-[clamp(2rem,4vw,3.4rem)] font-semibold tracking-[-0.03em] text-white leading-[1.06] mb-5">
                Cuando las reglas dan{" "}
                <span className="font-mono text-pinterest-ice">[OK]</span>,
                cobrás en 0.78 segundos.
              </h3>
              <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl mb-8">
                Sin intermediarios ni esperas de 30 días. Los oráculos validan el
                entregable (GitHub CI, firma 2/2 o QR) y el contrato transfiere
                la plata automáticamente en el mismo bloque.
              </p>

              <IosTactileButton
                variant="primary-accent"
                size="lg"
                showArrow
                onClick={() => {
                  if (onJumpToSimulator) {
                    onJumpToSimulator();
                  } else {
                    document
                      .getElementById("simulador")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                Armar un Bloqueo en Vivo
              </IosTactileButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
