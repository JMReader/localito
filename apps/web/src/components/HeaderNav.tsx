"use client";

import React from "react";
import { Lock } from "lucide-react";
import { IosTactileButton } from "@/components/ui/IosTactileButton";
import {
  GlyphRampKey,
  PINTEREST_PALETTES,
  PinterestPaletteKey,
  SupportedCurrency,
} from "@/lib/mock-vaults-data";

export interface HeaderNavProps {
  orbMode?: string;
  activeCurrency?: SupportedCurrency;
  glyphRamp?: GlyphRampKey;
  pinterestPalette?: PinterestPaletteKey;
  onPinterestPaletteChange?: (palette: PinterestPaletteKey) => void;
  onJumpToSimulator?: () => void;
}

const PALETTE_KEYS: PinterestPaletteKey[] = [
  "cobalt",
  "emerald",
  "cyan",
  "amber",
  "monochrome",
];

export function HeaderNav({
  pinterestPalette = "cobalt",
  onPinterestPaletteChange,
  onJumpToSimulator,
}: HeaderNavProps) {
  return (
    <header
      data-anim="header"
      role="banner"
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 sm:px-10 h-16 bg-[#000000]/90 border-b border-zinc-900 select-none"
    >
      {/* 1. Marca Limpia */}
      <a
        href="#boveda"
        className="group flex items-center gap-3 focus-visible:outline-none"
      >
        <span className="font-mono font-bold text-xs px-2 py-1 rounded-md bg-pinterest-primary text-[var(--accent-ink)]">
          [TW]
        </span>
        <span className="font-sans font-semibold text-base tracking-tight text-white">
          CriteriaLock
        </span>
      </a>

      {/* 2. Navegación Minimalista sin Cajas */}
      <nav
        aria-label="Secciones principales"
        className="hidden lg:flex items-center gap-7"
      >
        {[
          { href: "#boveda", label: "Guardián" },
          { href: "#stablecoins", label: "Monedas 3D" },
          { href: "#como-funciona", label: "Cómo Funciona" },
          { href: "#simulador", label: "Simulador" },
          { href: "#explorador-pilar", label: "Bóvedas" },
          { href: "/localito", label: "App Localito (Lemon UI)" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="text-xs font-mono text-zinc-400 hover:text-white transition-colors"
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* 3. Puntos de Color Pinterest + Acción Principal */}
      <div className="flex items-center gap-4">
        {onPinterestPaletteChange && (
          <div
            role="group"
            aria-label="Color principal del tablero de Pinterest"
            className="hidden sm:flex items-center gap-2"
          >
            {PALETTE_KEYS.map((key) => {
              const cfg = PINTEREST_PALETTES[key];
              const isSelected = pinterestPalette === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPinterestPaletteChange(key)}
                  title={`${cfg.label} (${cfg.pinSource})`}
                  aria-label={`Color ${cfg.label}`}
                  aria-pressed={isSelected}
                  className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${
                    isSelected
                      ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-black"
                      : "opacity-55 hover:opacity-100 hover:scale-110"
                  }`}
                  style={{ backgroundColor: cfg.primaryHex }}
                />
              );
            })}
          </div>
        )}

        <IosTactileButton
          variant="primary-accent"
          size="sm"
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
          <Lock className="w-3.5 h-3.5" />
          <span>Bloquear Plata</span>
        </IosTactileButton>
      </div>
    </header>
  );
}
