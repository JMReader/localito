"use client";

import React, { useRef } from "react";
import {
  Mic,
  Brain,
  Volume2,
  Sparkles,
  RefreshCw,
  Terminal,
  Lock,
  Compass,
  Palette,
} from "lucide-react";
import { OrbMode } from "./AsciiSphereOrb";
import {
  GlyphRampKey,
  PINTEREST_PALETTES,
  PinterestPaletteKey,
} from "@/lib/mock-vaults-data";
import gsap from "gsap";

export interface BenchoDockProps {
  mode: OrbMode;
  onModeChange: (m: OrbMode) => void;
  glyphRamp?: GlyphRampKey;
  onGlyphRampChange?: (ramp: GlyphRampKey) => void;
  pinterestPalette?: PinterestPaletteKey;
  onPinterestPaletteChange?: (palette: PinterestPaletteKey) => void;
  seed?: string;
  onSeedRandomize?: () => void;
  activeSection?: string;
  onQuickLockClick?: () => void;
  // Props opcionales de compatibilidad hacia atrás
  paletteIndex?: number;
  onPaletteCycle?: () => void;
  layoutMode?: "hero" | "split";
  onLayoutToggle?: () => void;
  showOrbitRing?: boolean;
  onOrbitToggle?: () => void;
  orbType?: "sphere" | "blob";
  onOrbTypeToggle?: () => void;
  onReplayGenesis?: () => void;
}

const GLYPH_RAMP_ORDER: GlyphRampKey[] = [
  "Classic",
  "Blocks",
  "Dots",
  "Binary",
];

const PALETTE_ORDER: PinterestPaletteKey[] = [
  "cobalt",
  "emerald",
  "cyan",
  "amber",
  "monochrome",
];

const GLYPH_RAMP_PREVIEW: Record<GlyphRampKey, string> = {
  Classic: ".:+*#%@",
  Blocks: "░▒▓█",
  Dots: "·•●",
  Binary: "01",
};

const QUICK_SECTIONS = [
  { id: "boveda", code: "01", label: "Guardián" },
  { id: "stablecoins", code: "02", label: "Monedas" },
  { id: "como-funciona", code: "03", label: "Flujo" },
  { id: "simulador", code: "04", label: "Simulador" },
  { id: "explorador-pilar", code: "05", label: "Bóvedas" },
];

export function BenchoDock({
  mode,
  onModeChange,
  glyphRamp = "Classic",
  onGlyphRampChange,
  pinterestPalette = "cobalt",
  onPinterestPaletteChange,
  seed = "CriteriaLock-Agent-02",
  onSeedRandomize,
  activeSection,
  onQuickLockClick,
}: BenchoDockProps) {
  const dockRef = useRef<HTMLElement>(null);
  const currentPaletteCfg = PINTEREST_PALETTES[pinterestPalette];

  const modeOptions: { id: OrbMode; label: string; icon: React.ReactNode }[] = [
    { id: "idle", label: "Idle", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "voice", label: "Voice", icon: <Mic className="w-3.5 h-3.5" /> },
    { id: "thinking", label: "Think", icon: <Brain className="w-3.5 h-3.5" /> },
    { id: "speaking", label: "Speak", icon: <Volume2 className="w-3.5 h-3.5" /> },
  ];

  const animatePress = (el: HTMLElement) => {
    gsap.fromTo(
      el,
      { scale: 0.94 },
      { scale: 1.0, duration: 0.25, ease: "back.out(2.2)" }
    );
  };

  const handleModeClick = (
    id: OrbMode,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    animatePress(e.currentTarget);
    onModeChange(id);
  };

  const handleCycleGlyphRamp = (e: React.MouseEvent<HTMLButtonElement>) => {
    animatePress(e.currentTarget);
    if (!onGlyphRampChange) return;
    const currentIdx = GLYPH_RAMP_ORDER.indexOf(glyphRamp);
    const nextRamp =
      GLYPH_RAMP_ORDER[(currentIdx + 1) % GLYPH_RAMP_ORDER.length];
    onGlyphRampChange(nextRamp);
  };

  const handleCyclePalette = (e: React.MouseEvent<HTMLButtonElement>) => {
    animatePress(e.currentTarget);
    if (!onPinterestPaletteChange) return;
    const currentIdx = PALETTE_ORDER.indexOf(pinterestPalette);
    const nextPalette = PALETTE_ORDER[(currentIdx + 1) % PALETTE_ORDER.length];
    onPinterestPaletteChange(nextPalette);
  };

  const handleJumpSection = (
    sectionId: string,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    animatePress(e.currentTarget);
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      ref={dockRef}
      data-anim="bencho-dock"
      aria-label="Dock de control interactivo Bencho"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 rounded-full bg-[#09090b]/90 backdrop-blur-2xl border border-[#27272a] shadow-[0_24px_60px_rgba(0,0,0,0.92)] max-w-[96vw] overflow-x-auto select-none"
    >
      {/* 1. Navegación Rápida por Secciones (01 a 05) */}
      <div className="hidden lg:flex items-center gap-0.5 bg-[#000000]/80 p-0.5 rounded-full border border-[#1f1f23]">
        <span className="pl-2.5 pr-1.5 py-1 text-[10px] font-mono text-zinc-400 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-pinterest-bright" />
        </span>
        {QUICK_SECTIONS.map((sec) => {
          const isCurrent = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={(e) => handleJumpSection(sec.id, e)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                isCurrent
                  ? "bg-pinterest-primary font-semibold ios-bevel-accent"
                  : "text-zinc-300 hover:text-white hover:bg-[#141418]"
              }`}
            >
              <span className={isCurrent ? "opacity-80" : "text-zinc-400"}>
                {sec.code}
              </span>
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      <div className="hidden lg:block w-[1px] h-4 bg-[#27272a] mx-0.5" />

      {/* 2. Ciclador de Color Principal del Tablero de Pinterest */}
      {onPinterestPaletteChange && (
        <button
          type="button"
          onClick={handleCyclePalette}
          title={`Cambiar color principal de Pinterest (${currentPaletteCfg.label} · ${currentPaletteCfg.pinSource})`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141418] hover:bg-[#1f1f25] border border-pinterest-accent text-xs font-mono text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <span
            className="w-3 h-3 rounded-full border border-white/40 shrink-0"
            style={{ backgroundColor: currentPaletteCfg.primaryHex }}
          />
          <span className="text-[11px] font-semibold text-pinterest-ice hidden sm:inline">
            {currentPaletteCfg.label}
          </span>
          <Palette className="w-3.5 h-3.5 text-zinc-300 sm:hidden" />
        </button>
      )}

      {/* 3. Selector / Ciclador Global de Rampa ASCII en Vivo */}
      <div className="flex items-center gap-1 bg-[#000000]/80 p-0.5 rounded-full border border-[#1f1f23]">
        <button
          type="button"
          onClick={handleCycleGlyphRamp}
          title="Cambiar rampa global de caracteres ASCII en toda la página"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141418] hover:bg-[#1f1f25] border border-[#27272a] text-xs font-mono text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <Terminal className="w-3.5 h-3.5 text-pinterest-bright" />
          <span className="font-semibold text-white">{glyphRamp}</span>
          <span className="text-[10px] text-zinc-300 px-1.5 py-0.2 rounded bg-black border border-[#27272a] hidden sm:inline">
            {GLYPH_RAMP_PREVIEW[glyphRamp]}
          </span>
        </button>
      </div>

      <div className="w-[1px] h-4 bg-[#27272a] mx-0.5" />

      {/* 4. Estados del Guardián Orbe (Idle / Voice / Think / Speak) */}
      <div
        role="group"
        aria-label="Modo del Guardián ASCII"
        className="flex items-center gap-0.5 bg-[#000000]/80 p-0.5 rounded-full border border-[#1f1f23]"
      >
        {modeOptions.map((opt) => {
          const isActive = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => handleModeClick(opt.id, e)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all duration-150 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-300 hover:text-white hover:bg-[#141418]"
              }`}
            >
              {opt.icon}
              <span className="font-mono text-[11px] hidden md:inline">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5. Chip de Semilla Biomórfica */}
      {onSeedRandomize && (
        <>
          <div className="hidden xl:block w-[1px] h-4 bg-[#27272a] mx-0.5" />
          <div className="hidden xl:flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-[#000000]/80 border border-[#1f1f23] text-[11px] text-zinc-300 font-mono">
            <span className="text-zinc-400">SEED:</span>
            <span className="font-semibold text-zinc-200 truncate max-w-[92px]">
              {seed}
            </span>
            <button
              type="button"
              onClick={(e) => {
                animatePress(e.currentTarget);
                onSeedRandomize();
              }}
              title="Mutar semilla geométrica del Guardián"
              className="p-1 rounded-full hover:bg-[#18181b] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </>
      )}

      <div className="w-[1px] h-4 bg-[#27272a] mx-0.5" />

      {/* 6. Pill CTA Táctil con el Color Principal de Pinterest: [ + Bloquear ] */}
      <button
        type="button"
        onClick={(e) => {
          animatePress(e.currentTarget);
          if (onQuickLockClick) {
            onQuickLockClick();
          } else {
            document
              .getElementById("simulador")
              ?.scrollIntoView({ behavior: "smooth" });
          }
        }}
        className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-pinterest-primary font-sans font-semibold text-xs tracking-tight transition-all hover:brightness-110 cursor-pointer whitespace-nowrap ios-bevel-accent"
      >
        <Lock className="w-3.5 h-3.5 stroke-[2.4]" />
        <span className="hidden sm:inline">+ Bloquear</span>
      </button>
    </nav>
  );
}
