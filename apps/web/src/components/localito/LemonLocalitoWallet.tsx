"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Delete,
  Eye,
  EyeOff,
  Camera,
  FileCheck,
  Lock,
  QrCode,
  Receipt,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Wallet,
  X,
} from "lucide-react";
import { LemonPayFlow } from "./LemonPayFlow";
import { QrScannerModal, ScannedQrData } from "./QrScannerModal";
import {
  AsciiCoinBadge,
  LOCAL_ASCII_COINS,
} from "../AssetSwap";
import {
  DEMO_COUNTERPARTIES,
  INITIAL_LOCALITO_TRANSACTIONS,
  LemonActivityFeed,
  LemonDigitalTicketModal,
  LemonRecentActivityPreview,
  LocalitoTransaction,
  TransactionCounterparty,
} from "./LemonActivityFeed";

/* ============================================================================
   ACTIVOS Y STABLECOINS (ESTILO LEMON CASH)
   ============================================================================ */
export interface CoinAsset {
  id: string;
  symbol: string;
  name: string;
  glyph: string;
  balance: number;
  arsRate: number;
  change24h: string;
  isPositive: boolean;
  accentHex: string;
  highlightHex: string;
  shadowHex: string;
  creditLineArs?: number;
}

const COINS: CoinAsset[] = [
  {
    id: "tl",
    symbol: "TL",
    name: "Token Localito",
    glyph: "L",
    balance: 950000.0,
    arsRate: 1,
    change24h: "1:1 ARS",
    isPositive: true,
    accentHex: "#CFFF2E",
    highlightHex: "#FFFFFF",
    shadowHex: "#4D6600",
    creditLineArs: 950000,
  },
  {
    id: "argt",
    symbol: "ARGt",
    name: "Peso Digital Twin",
    glyph: "A",
    balance: 485000.0,
    arsRate: 1,
    change24h: "1:1 ARS",
    isPositive: true,
    accentHex: "#00D8EC",
    highlightHex: "#CFFAFE",
    shadowHex: "#064E5B",
    creditLineArs: 485000,
  },
  {
    id: "usdt",
    symbol: "USDT",
    name: "Tether USD",
    glyph: "₮",
    balance: 1420.5,
    arsRate: 1180,
    change24h: "+8.4% TNA",
    isPositive: true,
    accentHex: "#00DF1A",
    highlightHex: "#CFFF2E",
    shadowHex: "#005C0B",
    creditLineArs: 850000,
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    glyph: "$",
    balance: 680.0,
    arsRate: 1180,
    change24h: "+7.9% TNA",
    isPositive: true,
    accentHex: "#2775CA",
    highlightHex: "#93C5FD",
    shadowHex: "#103566",
    creditLineArs: 520000,
  },
  {
    id: "brat",
    symbol: "BRAt",
    name: "Real Digital Twin",
    glyph: "R",
    balance: 1840.0,
    arsRate: 235,
    change24h: "1:1 BRL",
    isPositive: true,
    accentHex: "#FFDF00",
    highlightHex: "#00DF1A",
    shadowHex: "#004D1C",
    creditLineArs: 430000,
  },
];

/* ============================================================================
   MOTOR DE MONEDA 3D ASCII + PUNTOS DE ALTA DEFINICION (GRAN ESCALA)
   ============================================================================ */
interface HighDefAsciiCoinProps {
  glyph: string;
  ticker: string;
  accentColor: string;
  highlightColor: string;
  shadowColor: string;
  size?: number;
  denseMode?: boolean;
}

function HighDefAsciiCoin({
  glyph,
  ticker,
  accentColor,
  highlightColor,
  shadowColor,
  size = 290,
  denseMode = true,
}: HighDefAsciiCoinProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    yaw: 0.38,
    pitch: -0.22,
    targetYaw: 0.38,
    targetPitch: -0.22,
    vYaw: 0,
    vPitch: 0,
    gyroYaw: 0,
    gyroPitch: 0,
    hasGyro: false,
    baseGamma: null as number | null,
    baseBeta: null as number | null,
    scrollImpulse: 0,
    pointerX: -999,
    pointerY: -999,
    isHovered: false,
    burst: 0.6,
  });

  useEffect(() => {
    stateRef.current.burst = 0.85;
    stateRef.current.vYaw += 0.18;
  }, [glyph, ticker]);

  // Giroscopio pasivo (sin pedir permisos) + impulso tactil/scroll global estilo Luma
  useEffect(() => {
    const st = stateRef.current;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      if (st.baseGamma === null || st.baseBeta === null) {
        st.baseGamma = e.gamma;
        st.baseBeta = e.beta;
      }
      // Recalibracion suave hacia la postura actual de la mano
      st.baseGamma += (e.gamma - st.baseGamma) * 0.015;
      st.baseBeta += (e.beta - st.baseBeta) * 0.015;

      const dGamma = Math.max(-35, Math.min(35, e.gamma - st.baseGamma));
      const dBeta = Math.max(-35, Math.min(35, e.beta - st.baseBeta));

      st.hasGyro = true;
      st.gyroYaw = (dGamma / 35) * 0.88;
      st.gyroPitch = -(dBeta / 35) * 0.68;
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || st.hasGyro) return;
      // Fallback con acelerometro pasivo sin popup de permisos
      const nx = Math.max(-6, Math.min(6, acc.x)) / 6;
      const ny = Math.max(-6, Math.min(6, acc.y - 5)) / 6;
      st.gyroYaw = -nx * 0.72;
      st.gyroPitch = ny * 0.55;
    };

    let lastTouchX = 0;
    let lastTouchY = 0;
    const handleGlobalTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - lastTouchX;
      const dy = t.clientY - lastTouchY;
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
      st.vYaw += Math.max(-0.06, Math.min(0.06, dx * 0.0014));
      st.vPitch += Math.max(-0.05, Math.min(0.05, -dy * 0.0012));
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    window.addEventListener("devicemotion", handleMotion, true);
    window.addEventListener("touchstart", handleGlobalTouchStart, { passive: true });
    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: true });

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
      window.removeEventListener("devicemotion", handleMotion, true);
      window.removeEventListener("touchstart", handleGlobalTouchStart);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = size;
    const H = size;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // Mascara de alta resolucion (160x160) para que el simbolo central se vea super nitido
    const maskSize = 160;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = maskSize;
    maskCanvas.height = maskSize;
    const mCtx = maskCanvas.getContext("2d")!;
    mCtx.fillStyle = "#000";
    mCtx.fillRect(0, 0, maskSize, maskSize);

    mCtx.fillStyle = "#fff";
    mCtx.textAlign = "center";
    mCtx.textBaseline = "middle";
    mCtx.font = '900 92px ui-sans-serif, system-ui, -apple-system, sans-serif';
    mCtx.fillText(glyph, maskSize / 2, maskSize / 2 - 4);

    // Sub-etiqueta de ticker grabada abajo en la moneda
    mCtx.font = '800 20px ui-monospace, "SF Mono", Consolas, monospace';
    mCtx.fillText(ticker, maskSize / 2, maskSize * 0.79);

    const maskData = mCtx.getImageData(0, 0, maskSize, maskSize).data;

    const sampleEmblem = (u: number, v: number): number => {
      const mx = Math.floor((u * 0.5 + 0.5) * maskSize);
      const my = Math.floor((v * 0.5 + 0.5) * maskSize);
      if (mx < 0 || mx >= maskSize || my < 0 || my >= maskSize) return 0;
      return maskData[(my * maskSize + mx) * 4] / 255;
    };

    // Rampa de alta definicion: combina micro-puntos y caracteres densos en los relieves
    const ramp = denseMode
      ? " ·.:;+*#%@"
      : " .:-=+*#%@";
    const maxIdx = ramp.length - 1;

    let rafId = 0;
    let prevTime = performance.now();

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      const st = stateRef.current;
      const dt = Math.min(2.5, (now - prevTime) / 16.67);
      prevTime = now;

      if (!st.isHovered) {
        // Movimiento orbital figura-8 estilo Luma + inclinacion en vivo del giroscopio
        const autoYaw =
          Math.sin(now * 0.0015) * 0.46 + Math.cos(now * 0.0007) * 0.16;
        const autoPitch =
          Math.cos(now * 0.0012) * 0.26 + Math.sin(now * 0.0021) * 0.1;

        st.targetYaw = Math.max(-0.92, Math.min(0.92, autoYaw + st.gyroYaw));
        st.targetPitch = Math.max(
          -0.75,
          Math.min(0.75, autoPitch + st.gyroPitch)
        );
      }

      st.vYaw = (st.vYaw + (st.targetYaw - st.yaw) * 0.14 * dt) * Math.pow(0.82, dt);
      st.vPitch = (st.vPitch + (st.targetPitch - st.pitch) * 0.14 * dt) * Math.pow(0.82, dt);
      st.yaw += st.vYaw * dt;
      st.pitch += st.vPitch * dt;
      st.burst *= Math.pow(0.88, dt);

      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Grilla de alta densidad (muchos mas puntos para definicion nitida)
      const cellW = denseMode ? 4.3 : 5.6;
      const cellH = denseMode ? 5.2 : 6.8;
      const cols = Math.floor(W / cellW);
      const rows = Math.floor(H / cellH);
      const ox = (W - cols * cellW) * 0.5;
      const oy = (H - rows * cellH) * 0.5;

      const cosY = Math.cos(st.yaw);
      const sinY = Math.sin(st.yaw);
      const cosP = Math.cos(st.pitch);
      const sinP = Math.sin(st.pitch);

      ctx.font = `${denseMode ? "700 6.8px" : "700 8.5px"} ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const coinRadius = W * 0.42 + st.burst * 8;
      // Desplazamiento del canto 3D (espesor real de la moneda cuando rota)
      const thicknessX = -sinY * 18;
      const thicknessY = -sinP * 14;

      for (let r = 0; r < rows; r++) {
        const py = oy + (r + 0.5) * cellH;
        const dy = py - H * 0.5;

        for (let c = 0; c < cols; c++) {
          const px = ox + (c + 0.5) * cellW;
          const dx = px - W * 0.5;

          // 1. Cara frontal de la moneda
          const localX = dx / Math.max(0.38, cosY) / coinRadius;
          const localY = dy / Math.max(0.38, cosP) / coinRadius;
          const distSq = localX * localX + localY * localY;

          // 2. Cara trasera desplazada (para dibujar el canto/espesor 3D cilíndrico)
          const backX = (dx - thicknessX) / Math.max(0.38, cosY) / coinRadius;
          const backY = (dy - thicknessY) / Math.max(0.38, cosP) / coinRadius;
          const backDistSq = backX * backX + backY * backY;

          if (distSq > 1.0) {
            // Si cae en el canto 3D de la moneda, dibujamos el borde estriado metalico
            if (backDistSq <= 1.0) {
              const edgeAngle = Math.atan2(backY, backX);
              const flute = Math.sin(edgeAngle * 42) > 0;
              ctx.fillStyle = flute ? accentColor : shadowColor;
              ctx.fillText(flute ? "#" : ":", px, py);
            }
            continue;
          }

          const dist = Math.sqrt(distSq);
          const angle = Math.atan2(localY, localX);

          // Geometria de precision de la moneda
          const isOuterRim = dist > 0.87;
          const isBeadedRing = Math.abs(dist - 0.81) < 0.024;
          const isInnerGroove = Math.abs(dist - 0.74) < 0.022;
          const emboss = dist < 0.72 ? sampleEmblem(localX / 0.7, localY / 0.7) : 0;

          // Normales 3D y estrias del borde
          let nx = localX * 0.35 + sinY * 0.7;
          let ny = localY * 0.35 + sinP * 0.7;

          if (isOuterRim) {
            nx += Math.sin(angle * 48) * 0.32;
          }

          const beadDot = isBeadedRing && Math.sin(angle * 36) > 0.2;

          let heat = 0;
          if (st.isHovered) {
            const dPointer = Math.hypot(px - st.pointerX, py - st.pointerY);
            if (dPointer < 75) {
              heat = Math.pow(1 - dPointer / 75, 2) * 0.65;
            }
          }

          // Reflejo especular holografico (estilo tarjeta Luma) sincronizado con la inclinacion 3D
          const sheenCenter = (st.yaw * 1.35 - st.pitch * 0.9) * 0.65;
          const sheenCoord = localX * 0.78 + localY * 0.62;
          const sheenDist = Math.abs(sheenCoord - sheenCenter);
          const lumaGlint =
            sheenDist < 0.28 ? Math.pow(1 - sheenDist / 0.28, 2) * 0.48 : 0;

          let lum =
            0.28 +
            nx * 0.34 -
            ny * 0.3 +
            (isOuterRim ? 0.28 : 0) +
            (beadDot ? 0.35 : 0) -
            (isInnerGroove ? 0.16 : 0) +
            emboss * 0.62 +
            heat +
            lumaGlint +
            st.burst * 0.3;

          lum = Math.max(0.06, Math.min(1, lum));
          const glyphIdx = Math.max(1, Math.min(maxIdx, Math.floor(lum * maxIdx)));

          // Coloreado con alto contraste + destello especular al inclinar el celular
          if (emboss > 0.42) {
            ctx.fillStyle = lumaGlint > 0.22 ? highlightColor : "#FFFFFF";
            ctx.fillText("@", px, py);
          } else if (lumaGlint > 0.3 || beadDot || (isOuterRim && lum > 0.62)) {
            ctx.fillStyle = highlightColor;
            ctx.fillText(ramp[glyphIdx], px, py);
          } else if (isOuterRim || lum > 0.44 || heat > 0.2 || lumaGlint > 0.14) {
            ctx.fillStyle = accentColor;
            ctx.fillText(ramp[glyphIdx], px, py);
          } else if (isInnerGroove) {
            ctx.fillStyle = "#1F2229";
            ctx.fillText("·", px, py);
          } else {
            ctx.fillStyle = shadowColor;
            ctx.fillText(denseMode ? "·" : ramp[Math.max(1, glyphIdx - 2)], px, py);
          }
        }
      }
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [glyph, ticker, accentColor, highlightColor, shadowColor, size, denseMode]);

  return (
    <div
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * size;
        const y = ((e.clientY - rect.top) / rect.height) * size;
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        stateRef.current.isHovered = true;
        stateRef.current.pointerX = x;
        stateRef.current.pointerY = y;
        stateRef.current.targetYaw = nx * 1.15;
        stateRef.current.targetPitch = -ny * 0.95;
      }}
      onPointerLeave={() => {
        stateRef.current.isHovered = false;
      }}
      onPointerDown={() => {
        stateRef.current.burst = 1.0;
      }}
      className="relative flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        aria-label={`Moneda 3D ${ticker}`}
      />
    </div>
  );
}

/* ============================================================================
   SLIDE TO CONFIRM (PISTA TACTIL BENCHO × LEMON CON RESORTE)
   ============================================================================ */
function SlideToConfirm({
  label,
  onConfirm,
  disabled = false,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || done || disabled || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const maxPx = Math.max(120, rect.width - 56);
    const next = Math.max(0, Math.min(maxPx, e.clientX - rect.left - 26));
    setDragX(next);
    if (next >= maxPx * 0.88) {
      setDragging(false);
      setDone(true);
      setDragX(maxPx);
      onConfirm();
    }
  };

  const handleEnd = () => {
    if (!done) {
      setDragging(false);
      setDragX(0);
    }
  };

  return (
    <div
      ref={trackRef}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      className={`relative h-[54px] w-full rounded-full bg-[#0D0F14] border border-white/[0.08] overflow-hidden select-none flex items-center px-1.5 transition-opacity ${
        disabled ? "opacity-45 pointer-events-none" : ""
      }`}
    >
      <motion.div
        animate={{ width: done ? "100%" : `${dragX + 50}px` }}
        transition={
          dragging
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 30 }
        }
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00DF1A]/25 to-[#00DF1A]/10 pointer-events-none"
      />
      <span className="w-full text-center text-xs font-semibold tracking-tight text-zinc-200 pointer-events-none z-10 pl-7">
        {done ? "Confirmado · Procesando" : label}
      </span>
      <motion.button
        type="button"
        disabled={disabled}
        onPointerDown={() => !done && !disabled && setDragging(true)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !done && !disabled) {
            e.preventDefault();
            setDone(true);
            onConfirm();
          }
        }}
        animate={{ x: dragX }}
        whileTap={{ scale: 0.94 }}
        transition={
          dragging
            ? { duration: 0 }
            : { type: "spring", stiffness: 440, damping: 28 }
        }
        aria-label={label}
        className="relative z-20 w-[42px] h-[42px] rounded-full bg-[#00DF1A] text-[#090D0A] flex items-center justify-center shadow-[0_4px_16px_rgba(0,223,26,0.35)] cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {done ? (
            <motion.span
              key="check"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
            >
              <Check className="w-5 h-5 stroke-[2.8]" />
            </motion.span>
          ) : (
            <motion.span
              key="arrow"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
            >
              <ChevronRight className="w-5 h-5 stroke-[2.6]" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

/* ============================================================================
   MATRIZ QR SVG DETERMINISTICA (ESTILO BENCHO × LEMON)
   ============================================================================ */
function DeterministicQrMatrix({
  seed,
  glyph,
  accentHex,
}: {
  seed: string;
  glyph: string;
  accentHex: string;
}) {
  const size = 21;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const isFinder = (r: number, c: number) => {
    const inTL = r < 7 && c < 7;
    const inTR = r < 7 && c >= size - 7;
    const inBL = r >= size - 7 && c < 7;
    if (!inTL && !inTR && !inBL) return null;
    const lr = r < 7 ? r : r - (size - 7);
    const lc = c < 7 ? c : c - (size - 7);
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };

  const isCenterLogo = (r: number, c: number) =>
    r >= 8 && r <= 12 && c >= 8 && c <= 12;

  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isCenterLogo(r, c)) continue;
      const finder = isFinder(r, c);
      if (finder !== null) {
        if (finder) cells.push({ r, c });
        continue;
      }
      if (r === 6 || c === 6) {
        if ((r + c) % 2 === 0) cells.push({ r, c });
        continue;
      }
      const cellSeed = Math.imul(hash ^ (r * 31 + c * 17), 2654435761) >>> 0;
      if (cellSeed % 10 < 5) {
        cells.push({ r, c });
      }
    }
  }

  return (
    <div className="relative w-44 h-44 rounded-[26px] bg-white p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.38)] flex items-center justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full"
        shapeRendering="crispEdges"
        aria-label={`Código QR para ${seed}`}
      >
        {cells.map(({ r, c }) => (
          <rect
            key={`${r}-${c}`}
            x={c + 0.08}
            y={r + 0.08}
            width={0.84}
            height={0.84}
            rx={0.22}
            fill="#090D0A"
          />
        ))}
      </svg>
      <div
        className="absolute w-10 h-10 rounded-xl flex items-center justify-center font-mono text-sm font-black text-[#090D0A] border-[3px] border-white shadow-md"
        style={{ backgroundColor: accentHex }}
      >
        {glyph}
      </div>
    </div>
  );
}

/* ============================================================================
   PANTALLA PRINCIPAL LEMON CASH × BENCHO MOBILE
   ============================================================================ */
export function LemonLocalitoWallet({
  initialTab = "wallet",
}: {
  initialTab?: "wallet" | "activity" | "pay";
} = {}) {
  const [coins, setCoins] = useState<CoinAsset[]>(COINS);
  const [selectedId, setSelectedId] = useState<string>("tl");
  const [hideBalance, setHideBalance] = useState<boolean>(false);
  const [denseMode, setDenseMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"wallet" | "activity" | "pay">(
    initialTab
  );
  const [activeSheet, setActiveSheet] = useState<
    null | "send" | "receive" | "loan" | "done"
  >(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [qrScannerPurpose, setQrScannerPurpose] = useState<"send" | "receive">("send");
  const [customAliasInput, setCustomAliasInput] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("4500");
  const [recipient, setRecipient] = useState<TransactionCounterparty>(
    DEMO_COUNTERPARTIES[0]
  );
  const [pickingRecipient, setPickingRecipient] = useState<boolean>(false);
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [receivePresetArs, setReceivePresetArs] = useState<number>(0);
  const [copiedReceiveTag, setCopiedReceiveTag] = useState<boolean>(false);
  
  // Estados para Scoring y Crédito
  const [loanStep, setLoanStep] = useState<"cuit" | "amount">("cuit");
  const [loanCuit, setLoanCuit] = useState<string>("30-71442119-8");
  const [isCheckingScore, setIsCheckingScore] = useState<boolean>(false);
  const [cuitError, setCuitError] = useState<string | null>(null);
  const [cuitScoreProfile, setCuitScoreProfile] = useState<{
    cuit: string;
    razonSocial: string;
    categoria: string;
    scoring: number;
    maxCreditTokens: number;
    minCreditTokens: number;
    tna: number;
    suggestedTermDays: number;
    communityVouchers: string[];
    riskTier: string;
  } | null>(null);

  const [loanSlider, setLoanSlider] = useState<number>(250000);
  const [loanTermDays, setLoanTermDays] = useState<30 | 60 | 90>(90);

  const [transactions, setTransactions] = useState<LocalitoTransaction[]>(
    INITIAL_LOCALITO_TRANSACTIONS
  );
  const [selectedTicket, setSelectedTicket] =
    useState<LocalitoTransaction | null>(null);
  const [lastCreatedTx, setLastCreatedTx] =
    useState<LocalitoTransaction | null>(null);

  useEffect(() => {
    if (!activeSheet) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pickingRecipient) {
          setPickingRecipient(false);
        } else {
          setActiveSheet(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSheet, pickingRecipient]);

  const activeCoin = coins.find((c) => c.id === selectedId) || coins[0];

  const totalArs = coins.reduce((acc, c) => acc + c.balance * c.arsRate, 0);

  const formatNumber = (n: number, decimals = 2) =>
    n.toLocaleString("es-AR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const handleKeyPress = (k: string) => {
    if (k === "DEL") {
      setAmountInput((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
      return;
    }
    setAmountInput((prev) => {
      const next = prev === "0" ? k : `${prev}${k}`;
      return next.length > 7 ? prev : next;
    });
  };

  const handleConfirmSend = () => {
    const val = parseFloat(amountInput) || 0;
    if (val <= 0) return;

    setTimeout(() => {
      const arsEquivalent = val * activeCoin.arsRate;
      const newCoinBalance = Math.max(0, activeCoin.balance - val);
      const now = new Date();
      const timeLabel = `${now
        .getHours()
        .toString()
        .padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      const randomHex = Math.random().toString(16).slice(2, 8);

      const newTx: LocalitoTransaction = {
        id: `tx_${randomHex}`,
        direction: "out",
        counterparty: recipient,
        amount: val,
        arsEquivalent,
        symbol: activeCoin.symbol,
        accentHex: activeCoin.accentHex,
        note: paymentNote.trim() || undefined,
        timeLabel,
        dateGroup: "HOY",
        txHash: `0x${randomHex}a4c91e08f23b`,
      };

      setCoins((prev) =>
        prev.map((c) =>
          c.id === activeCoin.id ? { ...c, balance: newCoinBalance } : c
        )
      );
      setTransactions((prev) => [newTx, ...prev]);
      setLastCreatedTx(newTx);
      setActiveSheet("done");
    }, 300);
  };

  const handleScanQr = (data: ScannedQrData) => {
    const rawAlias = data.alias.trim();
    const formattedAlias = rawAlias.startsWith("$") ? rawAlias : `$${rawAlias}`;
    const matched = DEMO_COUNTERPARTIES.find(
      (c) => c.alias.toLowerCase() === formattedAlias.toLowerCase()
    );
    if (matched) {
      setRecipient(matched);
    } else {
      setRecipient({
        alias: formattedAlias,
        displayName: formattedAlias.replace("$", "").toUpperCase(),
        legalName: `Titular de ${formattedAlias}`,
        avatarText:
          formattedAlias.replace("$", "").slice(0, 2).toUpperCase() || "QR",
        role: "merchant",
        acceptsPrt: true,
      });
    }
    setCustomAliasInput(formattedAlias);
    if (data.amount && data.amount > 0) {
      setAmountInput(data.amount.toString());
    }
    if (data.note) {
      setPaymentNote(data.note);
    }
    setIsQrScannerOpen(false);
    setActiveTab("pay");
  };

  const handleCustomAliasChange = (val: string) => {
    setCustomAliasInput(val);
    const formatted = val.startsWith("$") ? val : `$${val}`;
    const matched = DEMO_COUNTERPARTIES.find(
      (c) => c.alias.toLowerCase() === formatted.toLowerCase()
    );
    if (matched) {
      setRecipient(matched);
    } else if (val.trim().length > 0) {
      setRecipient({
        alias: formatted,
        displayName: formatted.replace("$", "") || "Destinatario",
        avatarText:
          formatted.replace("$", "").slice(0, 2).toUpperCase() || "OK",
        role: "member",
      });
    }
  };

  const handleCheckCuitScore = async (cuitToCheck?: string) => {
    const targetCuit = cuitToCheck || loanCuit;
    const cleanDigits = targetCuit.replace(/\D/g, "");
    if (cleanDigits.length !== 11) {
      setCuitError("El CUIT/CUIL debe contener 11 dígitos.");
      return;
    }

    setCuitError(null);
    setIsCheckingScore(true);

    try {
      const res = await fetch("/api/credit/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuit: targetCuit }),
      });
      const data = await res.json();

      if (data.success && data.profile) {
        setCuitScoreProfile(data.profile);
        setLoanSlider(Math.min(250000, data.profile.maxCreditTokens));
        setLoanTermDays(data.profile.suggestedTermDays || 90);
        setLoanStep("amount");
      } else {
        setCuitError(data.error || "No se pudo calcular el scoring.");
      }
    } catch {
      // Fallback local determinístico por si se usa offline
      const scoring = 820;
      const maxCreditTokens = 1200000;
      setCuitScoreProfile({
        cuit: targetCuit,
        razonSocial: `Comercio #${cleanDigits.slice(-4)}`,
        categoria: "Monotributo / PyME Tramo 1",
        scoring,
        maxCreditTokens,
        minCreditTokens: 50000,
        tna: 0,
        suggestedTermDays: 90,
        communityVouchers: ["$bancocomunitario", "$redlocal"],
        riskTier: "Excelente",
      });
      setLoanSlider(Math.min(250000, maxCreditTokens));
      setLoanStep("amount");
    } finally {
      setIsCheckingScore(false);
    }
  };

  const handleConfirmLoan = () => {
    const amount = loanSlider;
    const now = new Date();
    const timeLabel = `${now
      .getHours()
      .toString()
      .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const randomHex = Math.random().toString(16).slice(2, 8);

    const creditTx: LocalitoTransaction = {
      id: `tx_${randomHex}`,
      direction: "credit",
      counterparty: {
        alias: "$credito",
        displayName: "Préstamo en Tokens TL",
        avatarText: "TL",
      },
      amount: amount,
      arsEquivalent: amount,
      symbol: "TL",
      accentHex: "#CFFF2E",
      note: `Préstamo ${loanTermDays}d · 0% Interés`,
      timeLabel,
      dateGroup: "HOY",
      txHash: `0x${randomHex}82e91a0c`,
    };

    setCoins((prev) =>
      prev.map((c) =>
        c.id === "tl" ? { ...c, balance: c.balance + amount } : c
      )
    );
    setTransactions((prev) => [creditTx, ...prev]);
    setLastCreatedTx(creditTx);
    setSelectedId("tl");
    setActiveSheet("done");
  };

  const handleRepeatFromTicket = (tx: LocalitoTransaction) => {
    const matchedCoin = coins.find((c) => c.symbol === tx.symbol);
    if (matchedCoin) {
      setSelectedId(matchedCoin.id);
    }
    setRecipient(tx.counterparty);
    setAmountInput(Math.round(tx.amount).toString());
    setPaymentNote(tx.note || "");
    setSelectedTicket(null);
    setActiveTab("pay");
  };

  return (
    <div className="min-h-screen w-full bg-[#08090C] text-white flex items-center justify-center p-0 sm:p-6 font-sans">
      {/* FRAME MOBILE LIMPIO */}
      <div className="relative w-full max-w-[400px] min-h-screen sm:min-h-[820px] sm:max-h-[860px] sm:rounded-[44px] bg-[#0E1014] sm:border-[6px] sm:border-[#1D2028] shadow-2xl overflow-hidden flex flex-col justify-between mobile-device-view">
        {activeTab === "pay" ? (
          <LemonPayFlow
            userBalancePrt={coins.find((c) => c.id === "tl")?.balance || 950000}
            onPaymentSuccess={(tx) => {
              setCoins((prev) =>
                prev.map((c) =>
                  c.id === "tl"
                    ? { ...c, balance: Math.max(0, c.balance - tx.amount) }
                    : c
                )
              );
              setTransactions((prev) => [tx, ...prev]);
              setLastCreatedTx(tx);
            }}
            onClose={() => setActiveTab("wallet")}
            onOpenQrScanner={() => {
              setQrScannerPurpose("send");
              setIsQrScannerOpen(true);
            }}
            initialRecipient={recipient}
            initialAmount={parseFloat(amountInput) || null}
          />
        ) : (
          <>
            {/* 1. HEADER MINIMALISTA LEMON ($tag + Ojo + Densidad) */}
            <header className="px-5 pt-5 pb-2 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("wallet")}
            className="flex items-center gap-2.5 cursor-pointer focus-visible:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-[#1A1D24] border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-[#00DF1A]">
              PS
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-200">
              $panaderia
            </span>
          </button>

          <div className="flex items-center gap-2">
            {activeTab === "wallet" && (
              <button
                type="button"
                onClick={() => setDenseMode((p) => !p)}
                title="Cambiar definicion de puntos de la moneda"
                className="h-9 px-3 rounded-full bg-[#1A1D24] border border-white/10 font-mono text-[11px] font-bold text-[#CFFF2E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
              >
                {denseMode ? "HD ···" : "ASCII #"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setHideBalance((p) => !p)}
              aria-label={hideBalance ? "Mostrar saldo" : "Ocultar saldo"}
              className="w-9 h-9 rounded-full bg-[#1A1D24] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
            >
              {hideBalance ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* 2. CUERPO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-24 flex flex-col items-center overscroll-contain touch-pan-y">
          {activeTab === "wallet" ? (
            <>
              {/* MONEDA 3D ASCII GIGANTE Y NITIDA EN EL CENTRO */}
              <div className="-mt-1 -mb-2 flex items-center justify-center">
                <HighDefAsciiCoin
                  glyph={activeCoin.glyph}
                  ticker={activeCoin.symbol}
                  accentColor={activeCoin.accentHex}
                  highlightColor={activeCoin.highlightHex}
                  shadowColor={activeCoin.shadowHex}
                  size={272}
                  denseMode={denseMode}
                />
              </div>

              {/* SALDO DE LA MONEDA SELECCIONADA */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1A1D24] border border-white/10">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: activeCoin.accentHex }}
                  />
                  <span className="font-mono text-[11px] font-bold text-zinc-200">
                    {activeCoin.symbol}
                  </span>
                  <span className="font-mono text-[11px] text-[#00DF1A]">
                    {activeCoin.change24h}
                  </span>
                </div>

                <div className="text-4xl font-bold tracking-tight tabular-nums text-white">
                  {hideBalance
                    ? "••••••"
                    : activeCoin.arsRate === 1
                    ? `$ ${formatNumber(activeCoin.balance, 0)}`
                    : `${formatNumber(activeCoin.balance, 2)} ${activeCoin.symbol}`}
                </div>

                <div className="text-xs font-mono text-zinc-400 tabular-nums">
                  {hideBalance
                    ? "$ ••••"
                    : `≈ $ ${formatNumber(totalArs, 0)} ARS`}
                </div>
              </div>

              {/* 3 BOTONES CIRCULARES LIMPIOS (ESTILO LEMON CASH) */}
              <div className="w-full grid grid-cols-3 gap-3 my-5">
                <button
                  type="button"
                  onClick={() => setActiveTab("pay")}
                  className="group flex flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-none"
                >
                  <span className="w-14 h-14 rounded-full bg-[#00DF1A] text-[#090D0A] flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                    <QrCode className="w-6 h-6 stroke-[2.3]" />
                  </span>
                  <span className="text-xs font-semibold text-white">Pagar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSheet("receive")}
                  className="group flex flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-none"
                >
                  <span className="w-14 h-14 rounded-full bg-[#1A1D24] border border-white/10 text-white flex items-center justify-center group-active:scale-95 transition-transform">
                    <ArrowDownLeft className="w-6 h-6 text-[#00DF1A]" />
                  </span>
                  <span className="text-xs font-medium text-zinc-300">
                    Recibir
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedId("tl");
                    setActiveSheet("loan");
                  }}
                  className="group flex flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-none"
                >
                  <span className="w-14 h-14 rounded-full bg-[#1A1D24] border border-white/10 text-white flex items-center justify-center group-active:scale-95 transition-transform">
                    <SlidersHorizontal className="w-5 h-5 text-[#CFFF2E]" />
                  </span>
                  <span className="text-xs font-medium text-zinc-300">
                    Credito
                  </span>
                </button>
              </div>

              {/* LISTA DE ACTIVOS */}
              <div className="w-full space-y-2">
                {coins.map((coin) => {
                  const isSelected = coin.id === selectedId;
                  const arsEquivalent = coin.balance * coin.arsRate;

                  return (
                    <button
                      key={coin.id}
                      type="button"
                      onClick={() => setSelectedId(coin.id)}
                      className={`w-full rounded-[22px] p-3.5 flex items-center justify-between transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A] ${
                        isSelected
                          ? "bg-[#1C2029] border border-white/20"
                          : "bg-[#15181F] border border-white/5 hover:bg-[#191C24]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {(() => {
                          const asciiRef =
                            LOCAL_ASCII_COINS.find(
                              (ac) => ac.sym === coin.symbol
                            ) || LOCAL_ASCII_COINS[0];
                          return <AsciiCoinBadge coin={asciiRef} size={42} />;
                        })()}
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {coin.symbol}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-[#00DF1A]">
                              {coin.change24h}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400">
                            {coin.name}
                          </span>
                        </div>
                      </div>

                      <div className="text-right tabular-nums">
                        <div className="text-sm font-bold text-white">
                          {hideBalance
                            ? "••••"
                            : coin.arsRate === 1
                            ? `$ ${formatNumber(coin.balance, 0)}`
                            : `${formatNumber(coin.balance, 2)} ${coin.symbol}`}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono">
                          {hideBalance
                            ? "$ ••••"
                            : `≈ $ ${formatNumber(arsEquivalent, 0)}`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* MOVIMIENTOS RECIENTES */}
              <LemonRecentActivityPreview
                transactions={transactions}
                hideBalance={hideBalance}
                onSelectTransaction={(tx) => setSelectedTicket(tx)}
                onViewAll={() => setActiveTab("activity")}
              />
            </>
          ) : (
            <LemonActivityFeed
              transactions={transactions}
              hideBalance={hideBalance}
              onSelectTransaction={(tx) => setSelectedTicket(tx)}
            />
          )}
        </div>

        {/* 3. BOTTOM BAR BENCHO × LEMON (PILL DESLIZANTE CON RESORTE) */}
        <nav
          aria-label="Navegacion"
          className="absolute bottom-0 inset-x-0 h-16 bg-[#0E1014]/92 backdrop-blur-xl border-t border-white/[0.08] px-6 flex items-center justify-between z-20"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setActiveSheet(null);
              setActiveTab("wallet");
            }}
            aria-label="Inicio"
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A] ${
              activeTab === "wallet" && activeSheet === null
                ? "text-[#00DF1A]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {activeTab === "wallet" && activeSheet === null && (
              <motion.span
                layoutId="bottom-nav-active-pill"
                transition={{ type: "spring", stiffness: 440, damping: 32 }}
                className="absolute inset-0 rounded-2xl bg-[#1A1E28] border border-white/[0.08]"
              />
            )}
            <Wallet className="relative z-10 w-5 h-5" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setActiveSheet(null);
              setActiveTab("activity");
            }}
            aria-label="Movimientos"
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A] ${
              activeTab === "activity" && activeSheet === null
                ? "text-[#00DF1A]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {activeTab === "activity" && activeSheet === null && (
              <motion.span
                layoutId="bottom-nav-active-pill"
                transition={{ type: "spring", stiffness: 440, damping: 32 }}
                className="absolute inset-0 rounded-2xl bg-[#1A1E28] border border-white/[0.08]"
              />
            )}
            <Receipt className="relative z-10 w-5 h-5" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setActiveSheet(null);
              setActiveTab("pay");
            }}
            aria-label="Pagar y Transferir"
            className="w-12 h-12 rounded-full bg-[#00DF1A] text-[#090D0A] flex items-center justify-center shadow-[0_6px_20px_rgba(0,223,26,0.32)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <QrCode className="w-5 h-5 stroke-[2.4]" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setSelectedId("tl");
              setActiveSheet("loan");
            }}
            aria-label="Crédito"
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A] ${
              activeSheet === "loan"
                ? "text-[#CFFF2E]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {activeSheet === "loan" && (
              <motion.span
                layoutId="bottom-nav-active-pill"
                transition={{ type: "spring", stiffness: 440, damping: 32 }}
                className="absolute inset-0 rounded-2xl bg-[#1A1E28] border border-white/[0.08]"
              />
            )}
            <SlidersHorizontal className="relative z-10 w-5 h-5" />
          </motion.button>
        </nav>
      </>
    )}

        {/* 4. BOTTOM SHEET UNIFICADO BENCHO × LEMON (SPRING + SLABS + MORPH) */}
        <AnimatePresence>
          {activeSheet !== null && (
            <motion.div
              key="bencho-lemon-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setPickingRecipient(false);
                  setActiveSheet(null);
                }
              }}
              className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col justify-end"
            >
              <motion.div
                layout
                role="dialog"
                aria-modal="true"
                aria-label="Panel de operaciones Localito"
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", duration: 0.48, bounce: 0.12 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.04, bottom: 0.48 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 90 || info.velocity.y > 420) {
                    setPickingRecipient(false);
                    setActiveSheet(null);
                  }
                }}
                className="w-full rounded-t-[32px] bg-[#0F1117] border-t border-white/[0.1] px-4 pt-2.5 pb-5 shadow-[0_-24px_64px_rgba(0,0,0,0.85)] overflow-hidden"
              >
                {/* PILL HANDLE PARA ARRASTRAR */}
                <div className="w-full flex justify-center pb-2.5 cursor-grab active:cursor-grabbing">
                  <div className="w-9 h-1 rounded-full bg-white/20" />
                </div>

                {/* HEADER LIMPIO CON TÍTULO Y BOTÓN CERRAR (ACCESIBLE SOLO DESDE PÁGINA PRINCIPAL) */}
                {activeSheet !== "done" && (
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-base font-bold text-white tracking-tight">
                      {activeSheet === "send" && "Pagar"}
                      {activeSheet === "receive" && "Recibir"}
                      {activeSheet === "loan" && "Crédito"}
                    </span>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setPickingRecipient(false);
                        setActiveSheet(null);
                      }}
                      aria-label="Cerrar panel"
                      className="w-8 h-8 rounded-full bg-[#151821] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                )}

                {/* CONTENIDO MORPHING POR MODO */}
                <AnimatePresence mode="wait" initial={false}>
                  {/* MODO 1: ENVIAR / PAGAR */}
                  {activeSheet === "send" && (
                    <motion.div
                      key="sheet-send"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-2.5"
                    >
                      {/* BOTON RAPIDO: ESCANEAR QR */}
                      <button
                        type="button"
                        onClick={() => {
                          setQrScannerPurpose("send");
                          setIsQrScannerOpen(true);
                        }}
                        className="w-full h-11 px-3.5 rounded-2xl bg-[#00DF1A]/10 hover:bg-[#00DF1A]/18 border border-[#00DF1A]/30 text-[#00DF1A] flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer active:scale-98"
                      >
                        <Camera className="w-4 h-4 stroke-[2.4]" />
                        <span>Escanear Código QR de cobro</span>
                      </button>

                      {/* SLAB 1: DESTINATARIO EXPANDIBLE CON BUSQUEDA POR ALIAS */}
                      <motion.div
                        layout
                        transition={{
                          type: "spring",
                          duration: 0.48,
                          bounce: 0.12,
                        }}
                        className="rounded-[22px] bg-[#14171F] border border-white/[0.08] overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setPickingRecipient((p) => !p)}
                          aria-expanded={pickingRecipient}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-[#1E2330] border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-[#00DF1A] shrink-0">
                              {recipient.avatarText}
                            </div>
                            <div className="text-left min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-mono text-zinc-400">
                                  Para
                                </span>
                                <span className="text-xs font-bold text-white truncate">
                                  {recipient.displayName}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-[#00DF1A] truncate">
                                {recipient.alias}
                                {recipient.role ? ` · ${recipient.role}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C202B] border border-white/[0.08] text-[11px] font-medium text-zinc-300 shrink-0">
                            <span>
                              {pickingRecipient ? "Listo" : "Cambiar alias"}
                            </span>
                            <motion.span
                              animate={{ rotate: pickingRecipient ? 180 : 0 }}
                              transition={{
                                type: "spring",
                                stiffness: 360,
                                damping: 26,
                              }}
                            >
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                            </motion.span>
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {pickingRecipient && (
                            <motion.div
                              key="recipient-picker-list"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                type: "spring",
                                duration: 0.42,
                                bounce: 0.1,
                              }}
                              className="border-t border-white/[0.06] p-2 space-y-2"
                            >
                              {/* INPUT PARA ESCRIBIR ALIAS LIBREMENTE */}
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                                <input
                                  type="text"
                                  value={customAliasInput}
                                  onChange={(e) =>
                                    handleCustomAliasChange(e.target.value)
                                  }
                                  placeholder="Escribí un alias (ej: $cafe, $panaderia)"
                                  className="w-full h-9 pl-8 pr-7 rounded-xl bg-[#0E1016] border border-white/10 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00DF1A]"
                                />
                                {customAliasInput && (
                                  <button
                                    type="button"
                                    onClick={() => handleCustomAliasChange("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>

                              <div className="max-h-48 overflow-y-auto space-y-1 no-scrollbar overscroll-contain touch-pan-y">
                                {DEMO_COUNTERPARTIES.filter((cp) =>
                                  customAliasInput
                                    ? cp.alias
                                        .toLowerCase()
                                        .includes(
                                          customAliasInput.toLowerCase()
                                        ) ||
                                      cp.displayName
                                        .toLowerCase()
                                        .includes(
                                          customAliasInput.toLowerCase()
                                        )
                                    : true
                                ).map((cp) => {
                                  const isSel = cp.alias === recipient.alias;
                                  return (
                                    <button
                                      key={cp.alias}
                                      type="button"
                                      onClick={() => {
                                        setRecipient(cp);
                                        setCustomAliasInput(cp.alias);
                                        setPickingRecipient(false);
                                      }}
                                      className={`w-full px-2.5 py-2 rounded-2xl flex items-center justify-between text-left cursor-pointer transition-colors ${
                                        isSel
                                          ? "bg-[#1D222E] text-white"
                                          : "hover:bg-white/[0.04] text-zinc-300"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-7 h-7 rounded-full bg-[#0F1117] border border-white/10 flex items-center justify-center font-mono text-[10px] font-bold text-[#00DF1A] shrink-0">
                                          {cp.avatarText}
                                        </span>
                                        <div className="min-w-0">
                                          <div className="text-xs font-semibold text-white truncate">
                                            {cp.displayName}
                                          </div>
                                          <div className="text-[11px] font-mono text-zinc-400 truncate">
                                            {cp.alias}
                                            {cp.role ? ` · ${cp.role}` : ""}
                                          </div>
                                        </div>
                                      </div>
                                      {isSel && (
                                        <span className="w-5 h-5 rounded-full bg-[#00DF1A]/15 text-[#00DF1A] flex items-center justify-center shrink-0">
                                          <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* SLAB 2: MONTO + EQUIVALENCIA + CHIPS RAPIDOS + NOTA */}
                      <div className="rounded-[22px] bg-[#14171F] border border-white/[0.08] p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                          <span>Monto a enviar</span>
                          <span>
                            Disp:{" "}
                            <strong className="text-zinc-200 font-semibold">
                              {activeCoin.arsRate === 1
                                ? `$ ${formatNumber(activeCoin.balance, 0)}`
                                : `${formatNumber(activeCoin.balance, 2)} ${activeCoin.symbol}`}
                            </strong>
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                          <motion.div
                            key={amountInput}
                            initial={{ scale: 0.96, opacity: 0.75 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 520,
                              damping: 28,
                            }}
                            className="text-3xl font-bold tracking-tight tabular-nums text-white truncate"
                          >
                            {activeCoin.arsRate === 1 ? "$ " : ""}
                            {formatNumber(parseFloat(amountInput) || 0, 0)}{" "}
                            <span
                              className="text-base font-mono font-bold"
                              style={{ color: activeCoin.accentHex }}
                            >
                              {activeCoin.symbol}
                            </span>
                          </motion.div>

                          <span className="text-xs font-mono text-zinc-400 tabular-nums shrink-0">
                            ≈ ${" "}
                            {formatNumber(
                              (parseFloat(amountInput) || 0) *
                                activeCoin.arsRate,
                              0
                            )}{" "}
                            ARS
                          </span>
                        </div>

                        {/* PILLS DE MONTO RAPIDO */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            {
                              label:
                                activeCoin.arsRate === 1 ? "+1.000" : "+10",
                              add: activeCoin.arsRate === 1 ? 1000 : 10,
                            },
                            {
                              label:
                                activeCoin.arsRate === 1 ? "+5.000" : "+50",
                              add: activeCoin.arsRate === 1 ? 5000 : 50,
                            },
                            {
                              label:
                                activeCoin.arsRate === 1 ? "+15.000" : "+100",
                              add: activeCoin.arsRate === 1 ? 15000 : 100,
                            },
                            {
                              label: "Máx",
                              add: -1,
                            },
                          ].map((q) => (
                            <motion.button
                              key={q.label}
                              type="button"
                              whileTap={{ scale: 0.94 }}
                              onClick={() => {
                                if (q.add === -1) {
                                  setAmountInput(
                                    Math.max(
                                      1,
                                      Math.floor(activeCoin.balance)
                                    ).toString()
                                  );
                                } else {
                                  const curr = parseInt(amountInput, 10) || 0;
                                  const next = Math.min(
                                    9999999,
                                    curr + q.add
                                  );
                                  setAmountInput(next.toString());
                                }
                              }}
                              className="h-8 rounded-xl bg-[#1C202B] border border-white/[0.06] hover:border-white/15 text-[11px] font-mono font-semibold text-zinc-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
                            >
                              {q.label}
                            </motion.button>
                          ))}
                        </div>

                        {/* CONCEPTO OPCIONAL INTEGRADO */}
                        <input
                          type="text"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="Agregar nota o concepto (opcional)..."
                          maxLength={48}
                          aria-label="Concepto del pago"
                          className="w-full h-9 px-3 rounded-xl bg-[#0E1016] border border-white/[0.06] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00DF1A]/60"
                        />
                      </div>

                      {/* TECLADO NUMERICO TACTIL BENCHO */}
                      {!pickingRecipient && (
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            "1",
                            "2",
                            "3",
                            "4",
                            "5",
                            "6",
                            "7",
                            "8",
                            "9",
                            "00",
                            "0",
                            "DEL",
                          ].map((k) => (
                            <motion.button
                              key={k}
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              onClick={() => handleKeyPress(k)}
                              aria-label={k === "DEL" ? "Borrar dígito" : k}
                              className="h-11 rounded-2xl bg-[#14171F] border border-white/[0.06] hover:bg-[#1A1E28] text-base font-bold tabular-nums text-white flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
                            >
                              {k === "DEL" ? (
                                <Delete className="w-4 h-4 text-zinc-300" />
                              ) : (
                                k
                              )}
                            </motion.button>
                          ))}
                        </div>
                      )}

                      <SlideToConfirm
                        label={`Deslizá para enviar a ${recipient.alias}`}
                        onConfirm={handleConfirmSend}
                        disabled={(parseFloat(amountInput) || 0) <= 0}
                      />
                    </motion.div>
                  )}

                  {/* MODO 2: RECIBIR QR */}
                  {activeSheet === "receive" && (
                    <motion.div
                      key="sheet-receive"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      {/* SLAB QR PRINCIPAL */}
                      <div className="rounded-[24px] bg-[#14171F] border border-white/[0.08] p-4 flex flex-col items-center text-center space-y-3">
                        <div className="w-full flex items-center justify-between text-xs">
                          <span className="font-mono text-zinc-400">
                            Red Localito · Instantáneo
                          </span>
                          <span
                            className="font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] bg-white/[0.06]"
                            style={{ color: activeCoin.accentHex }}
                          >
                            {activeCoin.symbol}
                          </span>
                        </div>

                        <motion.div
                          key={`${activeCoin.symbol}-${receivePresetArs}`}
                          initial={{ scale: 0.94, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 26,
                          }}
                        >
                          <DeterministicQrMatrix
                            seed={`localito:$panaderia:${activeCoin.symbol}:${receivePresetArs}`}
                            glyph={activeCoin.glyph}
                            accentHex={activeCoin.accentHex}
                          />
                        </motion.div>

                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-white">
                            {receivePresetArs > 0
                              ? `Cobrar $ ${formatNumber(receivePresetArs, 0)} ARS`
                              : "Monto abierto · Cualquier importe"}
                          </div>
                          <div className="text-[11px] font-mono text-zinc-400">
                            {receivePresetArs > 0 && activeCoin.arsRate > 1
                              ? `≈ ${formatNumber(
                                  receivePresetArs / activeCoin.arsRate,
                                  2
                                )} ${activeCoin.symbol}`
                              : `Se acredita directo en tu saldo de ${activeCoin.symbol}`}
                          </div>
                        </div>
                      </div>

                      {/* BARRA DE MONTOS PREDEFINIDOS (CON PILL DESLIZANTE BENCHO) */}
                      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[#14171F] border border-white/[0.08]">
                        {[
                          { label: "Libre", val: 0 },
                          { label: "$ 5.000", val: 5000 },
                          { label: "$ 15.000", val: 15000 },
                          { label: "$ 50.000", val: 50000 },
                        ].map((preset) => {
                          const isCurrent = receivePresetArs === preset.val;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setReceivePresetArs(preset.val)}
                              className={`relative h-9 rounded-xl text-xs font-mono font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A] ${
                                isCurrent
                                  ? "text-white font-bold"
                                  : "text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              {isCurrent && (
                                <motion.span
                                  layoutId="receive-preset-pill"
                                  transition={{
                                    type: "spring",
                                    stiffness: 440,
                                    damping: 32,
                                  }}
                                  className="absolute inset-0 rounded-xl bg-[#1F2432] border border-white/15"
                                />
                              )}
                              <span className="relative z-10">
                                {preset.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* ACCION DE ESCANEAR QR */}
                      <button
                        type="button"
                        onClick={() => {
                          setQrScannerPurpose("receive");
                          setIsQrScannerOpen(true);
                        }}
                        className="w-full h-11 px-3.5 rounded-2xl bg-[#14171F] border border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-colors active:scale-98"
                      >
                        <Camera className="w-4 h-4 text-[#00DF1A] stroke-[2.3]" />
                        <span>Escanear QR para procesar cobro</span>
                      </button>

                      {/* BOTON COPIAR ALIAS CON ONDA CONCENTRICA BENCHO */}
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const textToCopy =
                            receivePresetArs > 0
                              ? `$panaderia (${activeCoin.symbol} · $ ${receivePresetArs})`
                              : "$panaderia";
                          navigator.clipboard?.writeText(textToCopy);
                          setCopiedReceiveTag(true);
                          setTimeout(() => setCopiedReceiveTag(false), 1800);
                        }}
                        className="relative w-full h-12 rounded-2xl bg-[#14171F] border border-white/[0.08] hover:border-white/20 px-4 flex items-center justify-between cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-zinc-400">
                            Alias Localito
                          </span>
                          <span className="font-mono text-xs font-bold text-white">
                            $panaderia
                          </span>
                        </div>

                        <div className="relative flex items-center gap-1.5 text-xs font-semibold text-[#00DF1A]">
                          {copiedReceiveTag && (
                            <span className="absolute -inset-2 rounded-full border border-[#00DF1A] animate-copy-wave pointer-events-none" />
                          )}
                          <AnimatePresence mode="popLayout" initial={false}>
                            {copiedReceiveTag ? (
                              <motion.span
                                key="copied"
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.6, opacity: 0 }}
                                className="flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                                Copiado
                              </motion.span>
                            ) : (
                              <motion.span
                                key="copy"
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.6, opacity: 0 }}
                                className="flex items-center gap-1"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copiar alias
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.button>
                    </motion.div>
                  )}

                  {/* MODO 3: CREDITO LIMPIO Y DIRECTO */}
                  {activeSheet === "loan" && (
                    <motion.div
                      key="sheet-loan"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      {/* PASO 1: CUIL/CUIT */}
                      {loanStep === "cuit" || !cuitScoreProfile ? (
                        <div className="space-y-3.5">
                          <div className="rounded-[22px] bg-[#14171F] border border-white/[0.08] p-4 space-y-3">
                            <div className="space-y-0.5">
                              <h3 className="text-base font-bold text-white tracking-tight">
                                Solicitud de Crédito
                              </h3>
                              <p className="text-xs text-zinc-400">
                                0% TNA · Ingresá tu CUIL o CUIT para consultar tu cupo disponible.
                              </p>
                            </div>

                            {/* INPUT CUIL */}
                            <div className="relative pt-1">
                              <input
                                type="text"
                                value={loanCuit}
                                onChange={(e) => {
                                  setLoanCuit(e.target.value);
                                  setCuitError(null);
                                }}
                                placeholder="CUIL / CUIT (11 dígitos)"
                                className="w-full h-12 px-3.5 rounded-xl bg-[#0D0F14] border border-white/10 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-[#CFFF2E]"
                              />
                              {loanCuit && (
                                <button
                                  type="button"
                                  onClick={() => setLoanCuit("")}
                                  className="absolute right-3 top-[calc(50%+2px)] -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            {cuitError && (
                              <p className="text-xs font-mono text-red-400">
                                {cuitError}
                              </p>
                            )}

                            {/* CUILs RAPIDOS */}
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                              {[
                                {
                                  cuit: "20-38452911-4",
                                  label: "Martín Gómez (Café)",
                                },
                                {
                                  cuit: "30-71442119-8",
                                  label: "Panadería La Unión",
                                },
                                {
                                  cuit: "27-40192831-2",
                                  label: "Clara Fernández",
                                },
                                {
                                  cuit: "23-35112449-9",
                                  label: "Kiosco San Juan",
                                },
                              ].map((item) => (
                                <button
                                  key={item.cuit}
                                  type="button"
                                  onClick={() => {
                                    setLoanCuit(item.cuit);
                                    handleCheckCuitScore(item.cuit);
                                  }}
                                  className="p-2 rounded-xl bg-[#0E1016] border border-white/[0.05] hover:border-white/20 text-left cursor-pointer transition-colors"
                                >
                                  <div className="text-[11px] font-semibold text-white truncate">
                                    {item.label}
                                  </div>
                                  <div className="text-[10px] font-mono text-zinc-500">
                                    {item.cuit}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isCheckingScore}
                            onClick={() => handleCheckCuitScore()}
                            className="w-full h-12 rounded-full bg-[#CFFF2E] text-[#090D0A] font-bold text-sm flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isCheckingScore ? (
                              <>
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>Consultando cupo...</span>
                              </>
                            ) : (
                              <span>Consultar Cupo</span>
                            )}
                          </button>
                        </div>
                      ) : (
                        /* PASO 2: MONTO Y PLAZO */
                        <div className="space-y-2.5">
                          {/* RESUMEN DEL TITULAR */}
                          <div className="rounded-[20px] bg-[#14171F] border border-white/[0.08] p-3 flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">
                                {cuitScoreProfile.razonSocial}
                              </div>
                              <div className="text-[11px] font-mono text-zinc-400">
                                CUIL {cuitScoreProfile.cuit}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="text-[10px] font-mono text-zinc-500 block">Scoring</span>
                                <span className="text-xs font-mono font-bold text-[#CFFF2E]">
                                  {cuitScoreProfile.scoring} pts
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setLoanStep("cuit")}
                                className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
                              >
                                Cambiar
                              </button>
                            </div>
                          </div>

                          {/* MONTO A SOLICITAR */}
                          <div className="rounded-[22px] bg-[#14171F] border border-white/[0.08] p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                              <span>Monto</span>
                              <span>
                                Cupo máx: {formatNumber(cuitScoreProfile.maxCreditTokens, 0)} TL
                              </span>
                            </div>

                            <div>
                              <div className="text-3xl font-black text-white tabular-nums tracking-tight">
                                {formatNumber(loanSlider, 0)}{" "}
                                <span className="text-lg font-bold text-[#CFFF2E]">
                                  TL
                                </span>
                              </div>
                              <div className="text-xs font-mono text-zinc-400 mt-0.5">
                                ≈ $ {formatNumber(loanSlider, 0)} ARS
                              </div>
                            </div>

                            <input
                              type="range"
                              min={50000}
                              max={cuitScoreProfile.maxCreditTokens}
                              step={25000}
                              value={loanSlider}
                              onChange={(e) =>
                                setLoanSlider(parseInt(e.target.value, 10))
                              }
                              aria-label="Monto de crédito"
                              className="w-full accent-[#CFFF2E] cursor-pointer"
                            />

                            <div className="grid grid-cols-4 gap-1.5">
                              {[
                                { label: "25%", pct: 0.25 },
                                { label: "50%", pct: 0.5 },
                                { label: "75%", pct: 0.75 },
                                { label: "Tope", pct: 1 },
                              ].map((step) => {
                                const maxLine = cuitScoreProfile.maxCreditTokens;
                                const targetVal = Math.max(
                                  50000,
                                  Math.round((maxLine * step.pct) / 25000) * 25000
                                );
                                const isCurrent =
                                  Math.abs(loanSlider - targetVal) < 15000;
                                return (
                                  <button
                                    key={step.label}
                                    type="button"
                                    onClick={() => setLoanSlider(targetVal)}
                                    className={`h-8 rounded-xl text-xs font-mono font-semibold cursor-pointer transition-colors ${
                                      isCurrent
                                        ? "bg-[#CFFF2E] text-[#090D0A] font-bold"
                                        : "bg-[#0D0F14] text-zinc-400 hover:text-white"
                                    }`}
                                  >
                                    {step.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* PLAZO Y CUOTA */}
                          <div className="rounded-[22px] bg-[#14171F] border border-white/[0.08] p-3.5 space-y-3">
                            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0D0F14]">
                              {([30, 60, 90] as const).map((days) => {
                                const isCurrent = loanTermDays === days;
                                return (
                                  <button
                                    key={days}
                                    type="button"
                                    onClick={() => setLoanTermDays(days)}
                                    className={`h-8 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                      isCurrent
                                        ? "bg-[#1F2432] text-white font-bold"
                                        : "text-zinc-400 hover:text-zinc-200"
                                    }`}
                                  >
                                    {days} días
                                  </button>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-left">
                              <div className="rounded-xl bg-[#0E1016] p-2.5">
                                <span className="text-[10px] font-mono text-zinc-500 block">
                                  Cuota mensual
                                </span>
                                <span className="text-xs font-bold text-white font-mono">
                                  {formatNumber(
                                    Math.round(
                                      loanSlider / (loanTermDays / 30)
                                    ),
                                    0
                                  )}{" "}
                                  TL/mes
                                </span>
                              </div>

                              <div className="rounded-xl bg-[#0E1016] p-2.5">
                                <span className="text-[10px] font-mono text-zinc-500 block">
                                  Tasa
                                </span>
                                <span className="text-xs font-bold text-[#CFFF2E] font-mono">
                                  0% Interés
                                </span>
                              </div>
                            </div>
                          </div>

                          <SlideToConfirm
                            label="Deslizá para solicitar"
                            onConfirm={handleConfirmLoan}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* MODO 5: CONFIRMACION ANIMADA */}
                  {activeSheet === "done" && (
                    <motion.div
                      key="sheet-done"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{
                        type: "spring",
                        duration: 0.42,
                        bounce: 0.18,
                      }}
                      className="pt-2 pb-1 space-y-4 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 22,
                        }}
                        className="mx-auto w-14 h-14 rounded-full bg-[#00DF1A] text-[#090D0A] flex items-center justify-center shadow-[0_8px_28px_rgba(0,223,26,0.35)]"
                      >
                        <Check className="w-7 h-7 stroke-[2.8]" />
                      </motion.div>

                      <div className="space-y-1">
                        <div className="text-xl font-bold text-white">
                          Operación confirmada
                        </div>
                        {lastCreatedTx && (
                          <div className="text-xs font-mono text-zinc-400">
                            {lastCreatedTx.direction === "swap"
                              ? `${lastCreatedTx.fromAmount} ${lastCreatedTx.fromSymbol} → ${lastCreatedTx.toAmount} ${lastCreatedTx.toSymbol}`
                              : `$ ${formatNumber(lastCreatedTx.arsEquivalent, 0)} ARS · ${lastCreatedTx.counterparty.displayName}`}
                          </div>
                        )}
                      </div>

                      {lastCreatedTx && (
                        <div className="rounded-[22px] bg-[#14171F] border border-white/[0.08] p-3.5 flex items-center justify-between text-left">
                          <div>
                            <span className="text-[10px] font-mono text-zinc-400 block">
                              Comprobante verificable
                            </span>
                            <span className="text-xs font-mono font-bold text-zinc-200">
                              {lastCreatedTx.txHash}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-[#00DF1A]/15 text-[#00DF1A] font-mono text-[10px] font-bold">
                            Liquidado
                          </span>
                        </div>
                      )}

                      <div className="space-y-2 pt-1">
                        {lastCreatedTx && (
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setActiveSheet(null);
                              setSelectedTicket(lastCreatedTx);
                            }}
                            className="w-full h-11 rounded-full bg-[#181C26] border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
                          >
                            <Receipt className="w-4 h-4 text-[#00DF1A]" />
                            Ver ticket completo
                          </motion.button>
                        )}

                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setActiveSheet(null);
                          }}
                          className="w-full h-12 rounded-full bg-[#00DF1A] text-[#090D0A] font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          Listo
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. DETALLE DE LA TRANSACCION */}
        {selectedTicket && (
          <LemonDigitalTicketModal
            transaction={selectedTicket}
            userTag="$panaderia"
            hideBalance={hideBalance}
            onClose={() => setSelectedTicket(null)}
            onRepeatPayment={handleRepeatFromTicket}
          />
        )}

        {/* 6. MODAL ESCANER QR */}
        <QrScannerModal
          isOpen={isQrScannerOpen}
          onClose={() => setIsQrScannerOpen(false)}
          onScan={handleScanQr}
          title={
            qrScannerPurpose === "send"
              ? "Escanear QR para Pagar"
              : "Escanear QR de Solicitud"
          }
          subtitle={
            qrScannerPurpose === "send"
              ? "Apuntá al QR de un comercio o seleccioná uno de prueba"
              : "Leé el QR de cobro para procesar la transacción"
          }
        />
      </div>
    </div>
  );
}
