"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { HeaderNav } from "@/components/HeaderNav";
import { BenchoDock } from "@/components/BenchoDock";
import { HeroVaultStage } from "@/components/landing/HeroVaultStage";
import { AsciiWakeStepsBento } from "@/components/landing/AsciiWakeStepsBento";
import { InteractiveVaultSimulator } from "@/components/landing/InteractiveVaultSimulator";
import { PilarCostadoExplorer } from "@/components/landing/PilarCostadoExplorer";
import { StablecoinAsciiBoard } from "@/components/landing/StablecoinAsciiBoard";
import { LemonVsTraditionalMatrix } from "@/components/landing/LemonVsTraditionalMatrix";
import { OrbMode } from "@/components/AsciiSphereOrb";
import {
  GlyphRampKey,
  INITIAL_VAULTS,
  PinterestPaletteKey,
  SupportedCurrency,
  VaultRecord,
} from "@/lib/mock-vaults-data";

const GUARDIAN_SEEDS = [
  "CriteriaLock-Agent-02",
  "BeloFlow-Stable-04",
  "HackaTwin-Sphere-01",
  "Twin-ARGt-Vault-09",
  "Avalanche-Escrow-77",
];

export default function Home() {
  // Estado global reactivo compartido entre las 6 secciones de la Landing
  const [activeCurrency, setActiveCurrency] =
    useState<SupportedCurrency>("ARGt");
  const [quickLockAmount, setQuickLockAmount] = useState<string>("1,500,000");
  const [orbMode, setOrbMode] = useState<OrbMode>("idle");
  const [glyphRamp, setGlyphRamp] = useState<GlyphRampKey>("Classic");
  const [pinterestPalette, setPinterestPalette] =
    useState<PinterestPaletteKey>("cobalt");
  const [currentSeed, setCurrentSeed] = useState<string>(GUARDIAN_SEEDS[0]);
  const [vaults, setVaults] = useState<VaultRecord[]>(INITIAL_VAULTS);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(
    "TW-8841"
  );
  const [activeSection, setActiveSection] = useState<string>("boveda");

  const mainRef = useRef<HTMLElement | null>(null);

  // [F-11] Coreografía de entrada GSAP con soporte prefers-reduced-motion
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        motionOk: "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { reduced } = context.conditions as {
          motionOk: boolean;
          reduced: boolean;
        };

        if (reduced) {
          gsap.set(
            [
              '[data-anim="header"]',
              '[data-anim="hero-copy"]',
              '[data-anim="hero-stage"]',
              '[data-anim="bencho-dock"]',
            ],
            { clearProps: "all", autoAlpha: 1 }
          );
          return;
        }

        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
        });

        tl.fromTo(
          '[data-anim="header"]',
          { y: -16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.45 },
          0
        )
          .fromTo(
            '[data-anim="hero-copy"]',
            { y: 20, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.55 },
            0.08
          )
          .fromTo(
            '[data-anim="hero-stage"]',
            { scale: 0.97, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.65 },
            0.14
          )
          .fromTo(
            '[data-anim="bencho-dock"]',
            { y: 28, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.55, ease: "back.out(1.6)" },
            0.26
          );
      },
      root
    );

    return () => mm.revert();
  }, []);

  // Observador de sección activa para iluminar el indicador en BenchoDock
  useEffect(() => {
    const sectionIds = [
      "boveda",
      "como-funciona",
      "simulador",
      "explorador-pilar",
      "stablecoins",
    ];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0.05 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Saltos suaves hacia las secciones interactivas
  const scrollToSimulator = () => {
    document
      .getElementById("simulador")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToPilarExplorer = () => {
    document
      .getElementById("explorador-pilar")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  // Mutar semilla geométrica del Guardián ASCII
  const handleSeedRandomize = () => {
    const idx = GUARDIAN_SEEDS.indexOf(currentSeed);
    const nextSeed = GUARDIAN_SEEDS[(idx + 1) % GUARDIAN_SEEDS.length];
    setCurrentSeed(nextSeed);
  };

  // Cuando el usuario bloquea/publica una bóveda en el Simulador (Sección 3),
  // se inserta al inicio del Explorador «Pilar» + «Costado» (Sección 4) y se abre su ficha
  const handleVaultCreated = (newVault: VaultRecord) => {
    setVaults((prev) => [newVault, ...prev]);
    setSelectedVaultId(newVault.id);
    setOrbMode("speaking");
    setTimeout(() => {
      setOrbMode("idle");
    }, 2400);
  };

  // Actualizar una bóveda existente cuando se audita o libera desde el panel Costado
  const handleUpdateVault = (updated: VaultRecord) => {
    setVaults((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  return (
    <main
      ref={mainRef}
      data-pinterest-theme={pinterestPalette}
      className="relative min-h-screen w-full bg-[#000000] text-zinc-100 overflow-x-hidden font-sans selection:bg-[#0047FF] selection:text-white"
    >
      {/* 0. Barra Superior Editorial con Selector de Color Principal Pinterest */}
      <HeaderNav
        orbMode={orbMode}
        activeCurrency={activeCurrency}
        glyphRamp={glyphRamp}
        pinterestPalette={pinterestPalette}
        onPinterestPaletteChange={setPinterestPalette}
        onJumpToSimulator={scrollToSimulator}
      />

      {/* 1. SECCIÓN 01: HERO MONUMENTAL (Blobatar ASCII Gigante en Pantalla + Solo Título) */}
      <HeroVaultStage
        activeCurrency={activeCurrency}
        onCurrencyChange={setActiveCurrency}
        quickLockAmount={quickLockAmount}
        onQuickLockAmountChange={setQuickLockAmount}
        onQuickLockSubmit={scrollToSimulator}
        onExploreVaultsClick={() => {
          document
            .getElementById("stablecoins")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
        orbMode={orbMode}
        glyphRamp={glyphRamp}
        seed={currentSeed}
        pinterestPalette={pinterestPalette}
        onPinterestPaletteChange={setPinterestPalette}
      />

      {/* 2. SECCIÓN 02: GALERÍA DE MONEDAS 3D ASCII LIBRES SIN CONTENEDORES */}
      <StablecoinAsciiBoard
        activeCurrency={activeCurrency}
        onSelectCurrency={setActiveCurrency}
        glyphRamp={glyphRamp}
      />

      {/* 3. SECCIÓN 03: FLUJO COMBINADO CON ELEMENTOS GRÁFICOS Y ESCALA (ASCIIWAKE + PARTICLES) */}
      <AsciiWakeStepsBento
        glyphRamp={glyphRamp}
        pinterestPalette={pinterestPalette}
        onJumpToSimulator={scrollToSimulator}
      />

      {/* 4. SECCIÓN 04: SIMULADOR INTERACTIVO LIMPIO (CANDADO ASCII + REGLAS) */}
      <InteractiveVaultSimulator
        amount={quickLockAmount}
        currency={activeCurrency}
        onAmountChange={setQuickLockAmount}
        onCurrencyChange={setActiveCurrency}
        onVaultCreated={handleVaultCreated}
      />

      {/* 5. SECCIÓN 05: EXPLORADOR EN VIVO «PILAR» + «COSTADO» */}
      <PilarCostadoExplorer
        vaults={vaults}
        onUpdateVault={handleUpdateVault}
        glyphRamp={glyphRamp}
        selectedVaultId={selectedVaultId}
        onSelectVaultId={setSelectedVaultId}
      />

      {/* 6. SECCIÓN 06: COMPARATIVA MINIMALISTA + CIERRE */}
      <LemonVsTraditionalMatrix onCreateVaultClick={scrollToSimulator} />

      {/* 7. DOCK FLOTANTE BENCHO (Navegación + Color Pinterest + Rampa ASCII Global + Orbe) */}
      <BenchoDock
        mode={orbMode}
        onModeChange={setOrbMode}
        glyphRamp={glyphRamp}
        onGlyphRampChange={setGlyphRamp}
        pinterestPalette={pinterestPalette}
        onPinterestPaletteChange={setPinterestPalette}
        seed={currentSeed}
        onSeedRandomize={handleSeedRandomize}
        activeSection={activeSection}
        onQuickLockClick={scrollToSimulator}
      />
    </main>
  );
}
