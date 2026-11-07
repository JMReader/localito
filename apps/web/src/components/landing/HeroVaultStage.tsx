"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Lock, ArrowDown } from "lucide-react";
import { IosTactileButton } from "@/components/ui/IosTactileButton";
import { OrbMode } from "@/components/AsciiSphereOrb";
import {
  GlyphRampKey,
  PINTEREST_PALETTES,
  PinterestPaletteKey,
  SupportedCurrency,
} from "@/lib/mock-vaults-data";

const AsciiBlobOrb = dynamic(
  () => import("@/components/AsciiBlobOrb").then((mod) => mod.AsciiBlobOrb),
  { ssr: false }
);

const AsciiSphereOrb = dynamic(
  () => import("@/components/AsciiSphereOrb").then((mod) => mod.AsciiSphereOrb),
  { ssr: false }
);

const AsciiWake = dynamic(
  () => import("@/components/ASCIIWake").then((mod) => mod.AsciiWake),
  { ssr: false }
);

export type GuardianVisualizerMode = "blobatar" | "sphere-3d" | "cube-wake";

export interface HeroVaultStageProps {
  activeCurrency: SupportedCurrency;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  quickLockAmount: string;
  onQuickLockAmountChange: (amount: string) => void;
  onQuickLockSubmit: () => void;
  onExploreVaultsClick?: () => void;
  orbMode: OrbMode;
  glyphRamp: GlyphRampKey;
  pinterestPalette?: PinterestPaletteKey;
  onPinterestPaletteChange?: (palette: PinterestPaletteKey) => void;
  seed?: string;
}

export function HeroVaultStage({
  activeCurrency,
  quickLockAmount,
  onQuickLockSubmit,
  onExploreVaultsClick,
  orbMode,
  glyphRamp,
  pinterestPalette = "cobalt",
  seed = "CriteriaLock-Agent-02",
}: HeroVaultStageProps) {
  const [guardianView, setGuardianView] =
    useState<GuardianVisualizerMode>("blobatar");

  const activePaletteCfg = PINTEREST_PALETTES[pinterestPalette];

  return (
    <section
      id="boveda"
      aria-labelledby="hero-heading"
      className="relative w-full min-h-[92vh] pt-24 pb-20 sm:pt-28 sm:pb-28 flex flex-col items-center justify-center bg-[#000000] border-b border-zinc-900 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-8 w-full flex flex-col items-center text-center">
        {/* 1. Título Monumental Limpio */}
        <div data-anim="hero-copy" className="max-w-4xl mx-auto mb-4 sm:mb-6 z-10">
          <h1
            id="hero-heading"
            className="text-[clamp(2.5rem,6.4vw,5.4rem)] font-semibold tracking-[-0.04em] text-white leading-[0.98]"
          >
            Bloqueá la plata.{" "}
            <span className="text-zinc-400 font-normal">Fijá las reglas.</span>{" "}
            <span className="text-pinterest-bright block sm:inline">
              Cobrá al segundo.
            </span>
          </h1>
        </div>

        {/* 2. EL BLOBATAR ASCII GIGANTE EN PANTALLA ABIERTA (Sin contenedores ni bordes) */}
        <div
          data-anim="hero-stage"
          className="relative w-[330px] h-[330px] sm:w-[480px] sm:h-[480px] lg:w-[560px] lg:h-[560px] flex items-center justify-center my-2 select-none"
        >
          {guardianView === "blobatar" && (
            <AsciiBlobOrb
              seed={seed}
              mode={orbMode}
              palette={pinterestPalette}
              glyphs={glyphRamp}
              reach={92}
              force={70}
              trail={1.45}
              pull={42}
              showEyes={true}
              className="w-full h-full"
            />
          )}

          {guardianView === "sphere-3d" && (
            <AsciiSphereOrb
              seed={seed}
              mode={orbMode}
              paletteIndex={activePaletteCfg.spherePaletteIndex}
              showOrbitRing={true}
              className="w-full h-full"
            />
          )}

          {guardianView === "cube-wake" && (
            <div
              className="w-full h-full flex items-center justify-center scale-125"
              style={{ color: activePaletteCfg.brightHex }}
            >
              <AsciiWake
                glyphs={glyphRamp}
                size={11}
                reach={65}
                trail={1.4}
                pull={45}
              />
            </div>
          )}
        </div>

        {/* 3. Conmutador Minimalista de Escultura + Acción Directa */}
        <div className="flex flex-col items-center gap-6 mt-2 z-10">
          <div
            role="group"
            aria-label="Cambiar escultura ASCII"
            className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-950 border border-zinc-800/80"
          >
            {(
              [
                { id: "blobatar", label: "Blobatar ASCII" },
                { id: "sphere-3d", label: "Esfera 3D" },
                { id: "cube-wake", label: "Cubo Halftone" },
              ] as const
            ).map((item) => {
              const active = guardianView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGuardianView(item.id)}
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

          <div className="flex flex-wrap items-center justify-center gap-3">
            <IosTactileButton
              variant="primary-accent"
              size="lg"
              showArrow
              onClick={onQuickLockSubmit}
            >
              <Lock className="w-4 h-4" />
              <span>
                Bloquear {quickLockAmount} {activeCurrency}
              </span>
            </IosTactileButton>

            <IosTactileButton
              variant="carbon-matte"
              size="lg"
              onClick={() => {
                if (onExploreVaultsClick) {
                  onExploreVaultsClick();
                } else {
                  document
                    .getElementById("stablecoins")
                    ?.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              <span>Ver Monedas 3D</span>
              <ArrowDown className="w-4 h-4 text-pinterest-bright" />
            </IosTactileButton>
          </div>
        </div>
      </div>
    </section>
  );
}
