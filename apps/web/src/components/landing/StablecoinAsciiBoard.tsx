"use client";

import React, { useEffect, useRef } from "react";
import {
  ASCII_RAMPS,
  GlyphRampKey,
  STABLECOIN_ASSETS,
  StablecoinAsset,
  SupportedCurrency,
} from "@/lib/mock-vaults-data";

/* ═══════════════════════════════════════════════════════════════════════════
   MEDALLÓN 3D EN CARACTERES ASCII LIBRE EN EL ESPACIO (Sin contenedores)
   Renderiza un cilindro 3D biselado a gran escala flotando directo sobre #000000
   ═══════════════════════════════════════════════════════════════════════════ */
interface AsciiCoinMedallionProps {
  symbolText: string;
  glyphRamp: GlyphRampKey;
  isSelected: boolean;
  accentColor?: string;
  highlightColor?: string;
}

function AsciiCoinMedallion({
  symbolText,
  glyphRamp,
  isSelected,
  accentColor = "#3B82F6",
  highlightColor = "#93C5FD",
}: AsciiCoinMedallionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rampRef = useRef<GlyphRampKey>(glyphRamp);
  rampRef.current = glyphRamp;

  const stateRef = useRef({
    yaw: 0.34,
    pitch: -0.18,
    targetYaw: 0.34,
    targetPitch: -0.18,
    vYaw: 0,
    vPitch: 0,
    pointerX: -999,
    pointerY: -999,
    isHovered: false,
    burst: 0,
    isVisible: true,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 300;
    const H = 250;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = 64;
    maskCanvas.height = 64;
    const mCtx = maskCanvas.getContext("2d")!;
    mCtx.fillStyle = "#000";
    mCtx.fillRect(0, 0, 64, 64);
    mCtx.fillStyle = "#fff";
    mCtx.font =
      symbolText.length > 1
        ? '900 34px ui-monospace, "SF Mono", Consolas, monospace'
        : '900 42px ui-monospace, "SF Mono", Consolas, monospace';
    mCtx.textAlign = "center";
    mCtx.textBaseline = "middle";
    mCtx.fillText(symbolText, 32, 33);
    const maskData = mCtx.getImageData(0, 0, 64, 64).data;

    const sampleSymbol = (u: number, v: number): number => {
      const mx = Math.floor((u * 0.5 + 0.5) * 64);
      const my = Math.floor((v * 0.5 + 0.5) * 64);
      if (mx < 0 || mx >= 64 || my < 0 || my >= 64) return 0;
      return maskData[(my * 64 + mx) * 4] / 255;
    };

    let rafId = 0;
    let prevTime = performance.now();

    const io = new IntersectionObserver(
      (entries) => {
        stateRef.current.isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      const st = stateRef.current;
      if (!st.isVisible) return;

      const dt = Math.min(2.5, (now - prevTime) / 16.67);
      prevTime = now;

      if (!st.isHovered) {
        st.targetYaw = Math.sin(now * 0.0011) * 0.4;
        st.targetPitch = Math.cos(now * 0.0008) * 0.18;
      }

      st.vYaw =
        (st.vYaw + (st.targetYaw - st.yaw) * 0.14 * dt) * Math.pow(0.82, dt);
      st.vPitch =
        (st.vPitch + (st.targetPitch - st.pitch) * 0.14 * dt) *
        Math.pow(0.82, dt);
      st.yaw += st.vYaw * dt;
      st.pitch += st.vPitch * dt;
      st.burst *= Math.pow(0.88, dt);

      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const ramp = ASCII_RAMPS[rampRef.current] || ASCII_RAMPS.Classic;
      const maxIdx = ramp.length - 1;

      const cellW = 8.4;
      const cellH = 11.0;
      const cols = Math.floor(W / cellW);
      const rows = Math.floor(H / cellH);
      const ox = (W - cols * cellW) * 0.5;
      const oy = (H - rows * cellH) * 0.5;

      const cosY = Math.cos(st.yaw);
      const sinY = Math.sin(st.yaw);
      const cosP = Math.cos(st.pitch);
      const sinP = Math.sin(st.pitch);

      ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const coinRadius = 88 + st.burst * 12;

      for (let r = 0; r < rows; r++) {
        const py = oy + (r + 0.5) * cellH;
        const dy = py - H * 0.5;

        for (let c = 0; c < cols; c++) {
          const px = ox + (c + 0.5) * cellW;
          const dx = px - W * 0.5;

          const localX = dx / Math.max(0.32, cosY) / coinRadius;
          const localY = dy / Math.max(0.32, cosP) / coinRadius;
          const distSq = localX * localX + localY * localY;

          if (distSq > 1.0) {
            const orbitDist = Math.abs(Math.sqrt(distSq) - 1.15);
            if (
              (st.isHovered || isSelected) &&
              orbitDist < 0.045 &&
              (r + c) % 2 === 0
            ) {
              ctx.fillStyle = accentColor;
              ctx.fillText("·", px, py);
            }
            continue;
          }

          const dist = Math.sqrt(distSq);
          const isRim = dist > 0.84;
          const isInnerRing = Math.abs(dist - 0.74) < 0.045;
          const emboss =
            dist < 0.68 ? sampleSymbol(localX / 0.65, localY / 0.65) : 0;

          let nx = localX * 0.4 + sinY * 0.65;
          let ny = localY * 0.4 + sinP * 0.65;
          if (isRim) {
            const angle = Math.atan2(localY, localX);
            const reed = Math.sin(angle * 28) * 0.25;
            nx += reed;
          }
          if (emboss > 0.2) {
            nx += 0.35;
            ny -= 0.35;
          }

          let heat = 0;
          if (st.isHovered) {
            const dPointer = Math.hypot(px - st.pointerX, py - st.pointerY);
            if (dPointer < 80) {
              heat = Math.pow(1 - dPointer / 80, 2) * 0.68;
            }
          }

          let lum =
            0.32 +
            nx * 0.38 -
            ny * 0.32 +
            (isRim ? 0.22 : 0) +
            (isInnerRing ? 0.18 : 0) +
            emboss * 0.48 +
            heat +
            st.burst * 0.35;

          lum = Math.max(0.08, Math.min(1, lum));
          const glyphIdx = Math.max(
            1,
            Math.min(maxIdx, Math.floor(lum * maxIdx))
          );

          if (emboss > 0.35) {
            ctx.fillStyle = "#FFFFFF";
          } else if (lum > 0.8 || heat > 0.25) {
            ctx.fillStyle = highlightColor;
          } else if (isRim || lum > 0.5) {
            ctx.fillStyle = accentColor;
          } else {
            ctx.fillStyle = "#52525B";
          }

          ctx.fillText(ramp[glyphIdx], px, py);
        }
      }
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(rafId);
      io.disconnect();
    };
  }, [symbolText, isSelected, accentColor, highlightColor]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 300;
    const y = ((e.clientY - rect.top) / rect.height) * 250;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    stateRef.current.isHovered = true;
    stateRef.current.pointerX = x;
    stateRef.current.pointerY = y;
    stateRef.current.targetYaw = nx * 1.1;
    stateRef.current.targetPitch = -ny * 0.9;
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        stateRef.current.isHovered = false;
      }}
      onPointerDown={() => {
        stateRef.current.burst = 1.0;
      }}
      className="relative w-full h-[250px] flex items-center justify-center select-none transition-transform duration-300 group-hover:scale-105"
    >
      <canvas
        ref={canvasRef}
        style={{ width: 300, height: 250 }}
        aria-label={`Moneda 3D en caracteres ASCII de ${symbolText}`}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECCIÓN DE MONEDAS 3D ASCII LIBRES (Sin tarjetas ni contenedores pesados)
   ═══════════════════════════════════════════════════════════════════════════ */
export interface StablecoinAsciiBoardProps {
  activeCurrency: SupportedCurrency;
  onSelectCurrency: (currency: SupportedCurrency) => void;
  glyphRamp: GlyphRampKey;
}

export function StablecoinAsciiBoard({
  activeCurrency,
  onSelectCurrency,
  glyphRamp,
}: StablecoinAsciiBoardProps) {
  const handleSelectAsset = (asset: StablecoinAsset) => {
    if (
      asset.symbol === "ARGt" ||
      asset.symbol === "USDT" ||
      asset.symbol === "USDC" ||
      asset.symbol === "BRAt"
    ) {
      onSelectCurrency(asset.symbol);
    }
  };

  return (
    <section
      id="stablecoins"
      aria-labelledby="stablecoins-heading"
      className="relative w-full py-24 sm:py-32 border-b border-zinc-900 bg-[#000000]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Encabezado de Gran Escala sin Cajas */}
        <div className="max-w-3xl mb-16 sm:mb-20">
          <span className="font-mono text-xs uppercase tracking-widest text-pinterest-bright block mb-3">
            02 // Rieles Monetarios Onchain
          </span>
          <h2
            id="stablecoins-heading"
            className="text-[clamp(2.2rem,4.5vw,3.8rem)] font-semibold tracking-[-0.03em] text-white leading-[1.04]"
          >
            Monedas 3D programables.{" "}
            <span className="text-zinc-400 font-normal">
              Tocá cualquiera para elegir tu moneda de custodia.
            </span>
          </h2>
        </div>

        {/* Galería Abierta de Monedas 3D ASCII (Cero contenedores alrededor de las monedas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
          {STABLECOIN_ASSETS.map((asset) => {
            const isSelected = asset.symbol === activeCurrency;
            return (
              <div
                key={asset.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectAsset(asset)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectAsset(asset);
                  }
                }}
                className="group flex flex-col items-center text-center cursor-pointer focus-visible:outline-none"
              >
                {/* Moneda 3D ASCII Flotando Libre en Negro Puro */}
                <AsciiCoinMedallion
                  symbolText={asset.asciiGlyph}
                  glyphRamp={glyphRamp}
                  isSelected={isSelected}
                  accentColor={asset.accentColor}
                  highlightColor={asset.highlightColor}
                />

                {/* Firma Tipográfica Limpia Debajo de la Escultura */}
                <div className="mt-3 flex flex-col items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      {asset.symbol}
                    </span>
                    <span
                      className={`font-mono text-[11px] px-2.5 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? "bg-pinterest-primary text-[var(--accent-ink)] font-semibold"
                          : "bg-zinc-900 text-zinc-300"
                      }`}
                    >
                      {isSelected
                        ? "Activa"
                        : asset.pegLabel.split("//")[0].trim()}
                    </span>
                  </div>

                  <span className="text-sm text-zinc-400 mt-1">
                    {asset.name} · {asset.issuer}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
