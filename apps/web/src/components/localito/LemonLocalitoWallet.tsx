"use client";

import jsQR from "jsqr";
import QRCode from "qrcode";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  QrCode,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  ApiError,
  Participant,
  Transaction,
  getMe,
  getParticipants,
  getTransactions,
  login,
  pay,
} from "@/lib/api";

/* ============================================================================
   ACTIVOS Y STABLECOINS (ESTILO LEMON CASH)
   En la demo v0 solo TL es real (ledger localito en SQLite); el resto se muestra
   atenuado con sello "demo" siguiendo docs/frontend-integration.md.
   ============================================================================ */
export interface CoinAsset {
  id: string;
  symbol: string;
  name: string;
  glyph: string;
  accentHex: string;
  highlightHex: string;
  shadowHex: string;
  demo?: boolean;
}

const TL_COIN: CoinAsset = {
  id: "tl",
  symbol: "TL",
  name: "Moneda Localito",
  glyph: "L",
  accentHex: "#CFFF2E",
  highlightHex: "#FFFFFF",
  shadowHex: "#4D6600",
};

const DEMO_COINS: CoinAsset[] = [
  {
    id: "usdt",
    symbol: "USDT",
    name: "Tether USD",
    glyph: "₮",
    accentHex: "#00DF1A",
    highlightHex: "#CFFF2E",
    shadowHex: "#005C0B",
    demo: true,
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    glyph: "$",
    accentHex: "#2775CA",
    highlightHex: "#93C5FD",
    shadowHex: "#103566",
    demo: true,
  },
  {
    id: "argt",
    symbol: "ARGt",
    name: "Peso Digital Twin",
    glyph: "A",
    accentHex: "#00D8EC",
    highlightHex: "#CFFAFE",
    shadowHex: "#064E5B",
    demo: true,
  },
  {
    id: "dai",
    symbol: "DAI",
    name: "MakerDAO Stable",
    glyph: "◈",
    accentHex: "#F5AC37",
    highlightHex: "#FDE68A",
    shadowHex: "#6B4208",
    demo: true,
  },
];

const COINS: CoinAsset[] = [TL_COIN, ...DEMO_COINS];
const SESSION_KEY = "localito:session";
const DEMO_ALIASES = ["ana", "bruno", "kiosco", "cafe", "foto"];

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
    window.addEventListener("touchstart", handleGlobalTouchStart, {
      passive: true,
    });
    window.addEventListener("touchmove", handleGlobalTouchMove, {
      passive: true,
    });

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
    mCtx.font =
      '900 92px ui-sans-serif, system-ui, -apple-system, sans-serif';
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
    const ramp = denseMode ? " ·.:;+*#%@" : " .:-=+*#%@";
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

      ctx.font = `${
        denseMode ? "700 6.8px" : "700 8.5px"
      } ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
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
          const emboss =
            dist < 0.72 ? sampleEmblem(localX / 0.7, localY / 0.7) : 0;

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
          const glyphIdx = Math.max(
            1,
            Math.min(maxIdx, Math.floor(lum * maxIdx))
          );

          // Coloreado con alto contraste + destello especular al inclinar el celular
          if (emboss > 0.42) {
            ctx.fillStyle = lumaGlint > 0.22 ? highlightColor : "#FFFFFF";
            ctx.fillText("@", px, py);
          } else if (
            lumaGlint > 0.3 ||
            beadDot ||
            (isOuterRim && lum > 0.62)
          ) {
            ctx.fillStyle = highlightColor;
            ctx.fillText(ramp[glyphIdx], px, py);
          } else if (
            isOuterRim ||
            lum > 0.44 ||
            heat > 0.2 ||
            lumaGlint > 0.14
          ) {
            ctx.fillStyle = accentColor;
            ctx.fillText(ramp[glyphIdx], px, py);
          } else if (isInnerGroove) {
            ctx.fillStyle = "#1F2229";
            ctx.fillText("·", px, py);
          } else {
            ctx.fillStyle = shadowColor;
            ctx.fillText(
              denseMode ? "·" : ramp[Math.max(1, glyphIdx - 2)],
              px,
              py
            );
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
   SLIDE TO CONFIRM (PISTA TACTIL LEMON)
   Drag real con pointer capture (touch + mouse): el transform se aplica directo
   al DOM para no re-renderizar por frame; al soltar >=85% explota a toda la
   pantalla con slideBurst y confirma a mitad de la expansion.
   ============================================================================ */
const SLIDE_KNOB = 44;
const SLIDE_PAD = 6;

function slideBurst(x: number, y: number) {
  const size = Math.max(window.innerWidth, window.innerHeight) * 2.4;
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "fixed",
    left: `${x - size / 2}px`,
    top: `${y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: "#00DF1A",
    transform: "scale(0)",
    zIndex: "2147483647",
    pointerEvents: "none",
  });
  document.body.appendChild(el);
  el.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], {
    duration: 560,
    easing: "cubic-bezier(.3,.8,.3,1)",
    fill: "forwards",
  });
  window.setTimeout(() => {
    el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 300,
      fill: "forwards",
    }).onfinish = () => el.remove();
  }, 560);
}

function SlideToConfirm({
  label,
  disabled,
  onConfirm,
}: {
  label: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLButtonElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, x: 0, start: 0, max: 1 });
  const [armed, setArmed] = useState(false);
  const [done, setDone] = useState(false);

  const setX = (x: number, animate: boolean) => {
    const knob = knobRef.current;
    const fill = fillRef.current;
    if (!knob || !fill) return;
    const t = animate ? "transform .3s cubic-bezier(.3,.9,.3,1.2)" : "none";
    knob.style.transition = t;
    fill.style.transition = animate
      ? "width .3s cubic-bezier(.3,.9,.3,1.2)"
      : "none";
    knob.style.transform = `translateX(${x}px)`;
    fill.style.width = `${x + SLIDE_KNOB + SLIDE_PAD * 2}px`;
  };

  const succeed = () => {
    if (done) return;
    setDone(true);
    setX(dragRef.current.max, true);
    const rect = knobRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    window.setTimeout(() => slideBurst(cx, cy), 140);
    window.setTimeout(onConfirm, 430);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || done || !trackRef.current) return;
    dragRef.current.active = true;
    dragRef.current.start = e.clientX - dragRef.current.x;
    dragRef.current.max = Math.max(
      1,
      trackRef.current.clientWidth - SLIDE_KNOB - SLIDE_PAD * 2
    );
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active || done) return;
    const x = Math.max(
      0,
      Math.min(dragRef.current.max, e.clientX - dragRef.current.start)
    );
    dragRef.current.x = x;
    setX(x, false);
    const isArmed = x >= dragRef.current.max * 0.85;
    if (isArmed !== armed) setArmed(isArmed);
  };

  const handlePointerEnd = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (dragRef.current.x >= dragRef.current.max * 0.85) {
      succeed();
    } else {
      dragRef.current.x = 0;
      setX(0, true);
      setArmed(false);
    }
  };

  return (
    <div
      ref={trackRef}
      className={`relative h-14 w-full rounded-full bg-[#121418] border overflow-hidden select-none touch-none flex items-center px-1.5 transition-colors ${
        armed ? "border-[#00DF1A]/60" : "border-white/10"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <div
        ref={fillRef}
        className={`absolute inset-y-0 left-0 transition-colors ${
          armed ? "bg-[#00DF1A]/30" : "bg-[#00DF1A]/15"
        }`}
        style={{ width: SLIDE_KNOB + SLIDE_PAD * 2 }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center text-xs font-bold tracking-wide pointer-events-none z-10 transition-colors ${
          armed || done ? "text-[#00DF1A]" : "text-white"
        }`}
      >
        {done ? "Confirmando…" : armed ? "Soltá para confirmar" : label}
      </span>
      <button
        ref={knobRef}
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !done && !disabled) {
            e.preventDefault();
            succeed();
          }
        }}
        aria-label={label}
        className={`relative z-20 w-11 h-11 rounded-full text-[#090D0A] flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed transition-colors ${
          done ? "bg-white" : "bg-[#00DF1A]"
        }`}
      >
        {done ? (
          <Check className="w-5 h-5 stroke-[2.8]" />
        ) : (
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        )}
      </button>
    </div>
  );
}

/* ============================================================================
   FORMATO ARS — la API trabaja en centavos enteros; 1 TL = 1 ARS nominal.
   ============================================================================ */
const formatNumber = (n: number, decimals = 2) =>
  n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const formatCents = (cents: number) => `$ ${formatNumber(cents / 100, 0)}`;

/* ============================================================================
   LOGIN DEMO — elegir un alias de la tabla de demo (POST /auth/demo)
   ============================================================================ */
function LoginScreen({
  onLogin,
}: {
  onLogin: (token: string, participant: Participant) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (alias: string) => {
    setLoading(alias);
    setError(null);
    try {
      const { token, participant } = await login(alias);
      onLogin(token, participant);
    } catch (e) {
      const err = e as ApiError;
      setError(
        err.code === "NETWORK_ERROR"
          ? "No se pudo conectar con la API (¿está corriendo en :3001?)."
          : (err.message ?? "No se pudo entrar.")
      );
      setLoading(null);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#08090C] text-white flex items-center justify-center p-0 sm:p-6 font-sans">
      <div className="relative w-full max-w-[400px] h-dvh sm:h-[820px] sm:rounded-[44px] bg-[#0E1014] sm:border-[6px] sm:border-[#1D2028] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
          <HighDefAsciiCoin
            glyph="L"
            ticker="TL"
            accentColor="#CFFF2E"
            highlightColor="#FFFFFF"
            shadowColor="#4D6600"
            size={200}
          />

          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">Localito</h1>
            <p className="text-sm text-zinc-400">
              Moneda local · demo v0
            </p>
          </div>

          <div className="w-full space-y-2">
            <p className="text-xs font-mono text-zinc-500 text-center pb-1">
              ELEGÍ TU PERFIL DEMO
            </p>
            {DEMO_ALIASES.map((alias) => (
              <button
                key={alias}
                type="button"
                disabled={loading !== null}
                onClick={() => handlePick(alias)}
                className="w-full h-14 rounded-2xl bg-[#15181F] border border-white/5 hover:bg-[#191C24] hover:border-white/15 flex items-center justify-between px-4 transition-all cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
              >
                <span className="font-mono text-sm font-bold text-white">
                  ${alias}
                </span>
                <span className="text-xs text-zinc-400">
                  {loading === alias ? "Entrando…" : "Entrar"}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center font-mono">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   VISTA QR — tu QR para cobrar (localito://pay?to=<alias>) + acceso a pagar
   ============================================================================ */
function QrView({
  me,
  onClose,
  onPay,
}: {
  me: Participant;
  onClose: () => void;
  onPay: () => void;
}) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const payload = `localito://pay?to=${me.alias}`;

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 280,
      color: { dark: "#090D0A", light: "#FFFFFF" },
    })
      .then((url) => {
        if (alive) setQrUrl(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [payload]);

  return (
    <div className="absolute inset-0 z-30 bg-[#0E1014] flex flex-col">
      <header className="px-5 pt-5 pb-1 flex items-center justify-between">
        <span className="text-sm font-bold text-white">Mi QR · cobrá en TL</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 flex flex-col items-center justify-center gap-5">
        <div className="w-64 h-64 rounded-3xl bg-white p-4 flex items-center justify-center">
          {qrUrl ? (
            <img src={qrUrl} alt={`QR para pagar a ${me.alias}`} className="w-full h-full" />
          ) : (
            <QrCode className="w-32 h-32 text-[#090D0A]" />
          )}
        </div>

        <div className="text-center space-y-1">
          <div className="text-lg font-bold text-white">{me.display_name}</div>
          <div className="font-mono text-xs text-zinc-300 bg-[#111318] py-2 px-4 rounded-full inline-block">
            ${me.alias}
          </div>
        </div>

        <p className="text-xs text-zinc-500 font-mono text-center">{payload}</p>
      </div>

      <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onPay}
          className="w-full h-12 rounded-full bg-[#00DF1A] text-[#090D0A] font-bold text-sm cursor-pointer"
        >
          Pagar a un contacto
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   VISTA SCAN — cámara para leer un QR localito://pay y pagar; si no hay cámara
   se cae a la lista de alias (la vista de pagar de siempre)
   ============================================================================ */
function ScanPayView({
  token,
  me,
  onPick,
  onClose,
}: {
  token: string;
  me: Participant;
  onPick: (p: Participant, amountCents?: number) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Participant[]>([]);
  const contactsRef = useRef<Participant[]>([]);
  const onPickRef = useRef(onPick);
  const meIdRef = useRef(me.id);
  const lastScanRef = useRef(0);
  onPickRef.current = onPick;
  contactsRef.current = contacts;

  useEffect(() => {
    getParticipants(token)
      .then(({ participants }) =>
        setContacts(participants.filter((p) => p.id !== me.id))
      )
      .catch(() => {});
  }, [token, me.id]);

  useEffect(() => {
    let raf = 0;
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const handlePayload = (raw: string): boolean => {
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        return false;
      }
      if (url.protocol !== "localito:" || url.hostname !== "pay") return false;
      const to = url.searchParams.get("to");
      if (!to) return false;
      const contact = contactsRef.current.find((p) => p.alias === to);
      const amount = Number(url.searchParams.get("amount_cents"));
      if (!contact) {
        setScanError(`No encontramos a $${to}.`);
        return true;
      }
      if (contact.id === meIdRef.current) {
        setScanError("Es tu propio QR: no podés pagarte a vos mismo.");
        return true;
      }
      onPickRef.current(
        contact,
        Number.isInteger(amount) && amount > 0 ? amount : undefined
      );
      return true;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!video || !ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height);
      if (!code?.data) return;
      if (Date.now() - lastScanRef.current < 2500) return;
      lastScanRef.current = Date.now();
      handlePayload(code.data);
    };

    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      .then((s) => {
        stream = s;
        if (video) {
          video.srcObject = s;
          video.play().catch(() => {});
        }
        raf = requestAnimationFrame(tick);
      })
      .catch(() =>
        setCamError("No pudimos abrir la cámara. Elegí un contacto abajo.")
      );

    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, []);

  return (
    <div className="absolute inset-0 z-30 bg-[#0E1014] flex flex-col">
      <header className="px-5 pt-5 pb-1 flex items-center justify-between">
        <span className="text-sm font-bold text-white">
          Pagar · escaneá el QR
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col gap-5">
        <div className="w-full aspect-square rounded-3xl overflow-hidden bg-black relative border border-white/10">
          {camError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <QrCode className="w-10 h-10 text-zinc-600" />
              <p className="text-xs text-zinc-400">{camError}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-8 border-2 border-[#00DF1A]/70 rounded-2xl pointer-events-none" />
        </div>

        {scanError && (
          <p className="text-xs text-red-400 text-center font-mono -mt-2">
            {scanError}
          </p>
        )}

        <div className="space-y-2">
          <p className="text-xs font-mono text-zinc-500">
            O ELEGÍ UN CONTACTO
          </p>
          <div className="flex flex-wrap gap-2">
            {contacts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPickRef.current(p)}
                className="h-10 px-4 rounded-full bg-[#1F232D] border border-white/10 hover:border-white/25 font-mono text-xs font-bold text-zinc-200 cursor-pointer transition-all"
              >
                ${p.alias}
              </button>
            ))}
            {contacts.length === 0 && (
              <span className="text-xs text-zinc-500 font-mono py-2">
                Cargando contactos…
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   CREDITO DEMO — perfil devuelto por /api/credit/score (simulación front-only)
   ============================================================================ */
interface CuitScoreProfile {
  cuit: string;
  razonSocial: string;
  categoria: string;
  scoring: number;
  maxCreditTokens: number;
  minCreditTokens: number;
  tna: number;
  suggestedTermDays: number;
  communityVouchers: string[];
  riskTier: "Bajo" | "Medio" | "Excelente";
}

/* ============================================================================
   PANTALLA PRINCIPAL LEMON CASH MOBILE — TL real contra API v0
   ============================================================================ */
function WalletScreen({
  token,
  me,
  onRefresh,
  onLogout,
}: {
  token: string;
  me: Participant;
  onRefresh: (participant: Participant) => void;
  onLogout: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>("tl");
  const [hideBalance, setHideBalance] = useState<boolean>(false);
  const [denseMode, setDenseMode] = useState<boolean>(true);
  const [activeSheet, setActiveSheet] = useState<
    null | "send" | "qr" | "scan" | "loan" | "done"
  >(null);
  const [amountInput, setAmountInput] = useState<string>("0");
  const [recipients, setRecipients] = useState<Participant[]>([]);
  const [recipient, setRecipient] = useState<Participant | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [lastPayment, setLastPayment] = useState<{
    to: string;
    amountCents: number;
  } | null>(null);
  const idemKeyRef = useRef<string>("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loanStep, setLoanStep] = useState<"cuit" | "amount">("cuit");
  const [loanCuit, setLoanCuit] = useState<string>("");
  const [cuitProfile, setCuitProfile] = useState<CuitScoreProfile | null>(null);
  const [cuitError, setCuitError] = useState<string | null>(null);
  const [checkingScore, setCheckingScore] = useState<boolean>(false);
  const [loanSlider, setLoanSlider] = useState<number>(250000);
  const [loanTermDays, setLoanTermDays] = useState<30 | 60 | 90>(90);
  const [simCredit, setSimCredit] = useState<{
    amountCents: number;
    termDays: number;
    name: string;
    createdAt: string;
  } | null>(null);

  const activeCoin = COINS.find((c) => c.id === selectedId) || COINS[0];
  const isReal = !activeCoin.demo;

  const balancePesos = me.balance_cents / 100;
  const availablePesos = me.available_cents / 100;
  const displayBalanceCents = me.balance_cents + (simCredit?.amountCents ?? 0);

  const feedItems: Transaction[] = [
    ...(simCredit
      ? [
          {
            id: "sim-credit",
            direction: "in" as const,
            counterparty: {
              alias: "credito",
              display_name: "Préstamo TL (simulación)",
            },
            amount_cents: simCredit.amountCents,
            note: `Préstamo ${simCredit.termDays}d · 0% Interés`,
            created_at: simCredit.createdAt,
            balance_after_cents: displayBalanceCents,
          },
        ]
      : []),
    ...transactions,
  ];

  useEffect(() => {
    let alive = true;
    getTransactions(token)
      .then((r) => {
        if (alive) setTransactions(r.transactions);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token, me]);

  const openSheet = useCallback(
    async (
      sheet: "send" | "qr" | "scan" | "loan",
      preset?: { recipient?: Participant; amountCents?: number }
    ) => {
      setSendError(null);
      setLastPayment(null);
      if (sheet === "loan") {
        setLoanStep(cuitProfile ? "amount" : "cuit");
        setCuitError(null);
      }
      if (sheet === "send") {
        setAmountInput(
          preset?.amountCents
            ? String(Math.max(0, Math.round(preset.amountCents / 100)))
            : "0"
        );
        setRecipient(preset?.recipient ?? null);
        idemKeyRef.current = crypto.randomUUID();
        try {
          const { participants } = await getParticipants(token);
          setRecipients(participants.filter((p) => p.id !== me.id));
        } catch {
          setSendError("No se pudo cargar la lista de contactos.");
        }
      }
      setActiveSheet(sheet);
    },
    [token, me.id, cuitProfile]
  );

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

  const handleConfirmSend = async () => {
    const pesos = parseFloat(amountInput) || 0;
    if (pesos <= 0 || !recipient || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const amountCents = Math.round(pesos * 100);
      const { transaction } = await pay(
        token,
        recipient.alias,
        amountCents,
        undefined,
        idemKeyRef.current || undefined
      );
      setLastPayment({
        to: transaction.to.display_name,
        amountCents: transaction.amount_cents,
      });
      const fresh = await getMe(token);
      onRefresh(fresh);
      idemKeyRef.current = "";
      setActiveSheet("done");
    } catch (e) {
      const err = e as ApiError;
      setSendError(err.message ?? "No se pudo enviar el pago.");
    } finally {
      setSending(false);
    }
  };

  const handleCheckCuitScore = async (cuitToCheck?: string) => {
    const raw = cuitToCheck || loanCuit;
    if (raw.replace(/\D/g, "").length !== 11) {
      setCuitError("El CUIT/CUIL debe contener 11 dígitos.");
      return;
    }
    setCuitError(null);
    setCheckingScore(true);
    try {
      const res = await fetch("/api/credit/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuit: raw }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "No se pudo calcular el scoring.");
      }
      const profile = data.profile as CuitScoreProfile;
      setCuitProfile(profile);
      setLoanSlider(Math.min(250000, profile.maxCreditTokens));
      setLoanTermDays((profile.suggestedTermDays as 30 | 60 | 90) || 90);
      setLoanStep("amount");
    } catch (e) {
      setCuitError(
        e instanceof Error ? e.message : "No se pudo calcular el scoring."
      );
    } finally {
      setCheckingScore(false);
    }
  };

  const handleConfirmLoan = () => {
    if (!cuitProfile) return;
    const amountCents = loanSlider * 100;
    setSimCredit({
      amountCents,
      termDays: loanTermDays,
      name: cuitProfile.razonSocial,
      createdAt: new Date().toISOString(),
    });
    setLastPayment({
      to: `Préstamo · ${cuitProfile.razonSocial} (simulación)`,
      amountCents,
    });
    setActiveSheet("done");
  };

  return (
    <div className="min-h-dvh w-full bg-[#08090C] text-white flex items-center justify-center p-0 sm:p-6 font-sans">
      {/* FRAME MOBILE LIMPIO */}
      <div className="relative w-full max-w-[400px] h-dvh sm:h-[820px] sm:rounded-[44px] bg-[#0E1014] sm:border-[6px] sm:border-[#1D2028] shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* 1. HEADER MINIMALISTA LEMON ($tag + Ojo + Densidad) */}
        <header className="px-5 pt-5 pb-1 flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            title="Cambiar de perfil demo"
            className="flex items-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A] rounded-full"
          >
            <div className="w-9 h-9 rounded-full bg-[#1A1D24] border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-[#00DF1A]">
              {me.alias.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-200">
              ${me.alias}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDenseMode((p) => !p)}
              title="Cambiar definicion de puntos de la moneda"
              className="h-9 px-3 rounded-full bg-[#1A1D24] border border-white/10 font-mono text-[11px] font-bold text-[#CFFF2E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A]"
            >
              {denseMode ? "HD ···" : "ASCII #"}
            </button>
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
        <div className="flex-1 overflow-y-auto px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col items-center">
          {/* MONEDA 3D ASCII GIGANTE Y NITIDA EN EL CENTRO */}
          <div className="-mt-1 -mb-2 flex items-center justify-center">
            <HighDefAsciiCoin
              glyph={activeCoin.glyph}
              ticker={activeCoin.symbol}
              accentColor={activeCoin.accentHex}
              highlightColor={activeCoin.highlightHex}
              shadowColor={activeCoin.shadowHex}
              size={284}
              denseMode={denseMode}
            />
          </div>

          {/* SALDO DE LA MONEDA SELECCIONADA (EL NUMERO ES EL HEROE) */}
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
                {isReal ? "1:1 ARS" : "demo"}
              </span>
            </div>

            <div className="text-4xl font-bold tracking-tight tabular-nums text-white">
              {hideBalance
                ? "••••••"
                : isReal
                ? formatCents(displayBalanceCents)
                : "—"}
            </div>

            <div className="text-xs font-mono text-zinc-400 tabular-nums">
              {hideBalance
                ? "$ ••••"
                : isReal
                ? `Disponible: ${formatCents(me.available_cents)}`
                : "No disponible en esta demo"}
            </div>
          </div>

          {/* 4 BOTONES CIRCULARES LIMPIOS (ESTILO LEMON CASH) */}
          <div className="w-full grid grid-cols-4 gap-3 my-5">
            <button
              type="button"
              onClick={() => openSheet("scan")}
              className="group flex flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-none"
            >
              <span className="w-14 h-14 rounded-full bg-[#00DF1A] text-[#090D0A] flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                <QrCode className="w-6 h-6 stroke-[2.3]" />
              </span>
              <span className="text-xs font-semibold text-white">Pagar</span>
            </button>

            <button
              type="button"
              onClick={() => openSheet("qr")}
              className="group flex flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-none"
            >
              <span className="w-14 h-14 rounded-full bg-[#1A1D24] border border-white/10 text-white flex items-center justify-center group-active:scale-95 transition-transform">
                <ArrowDownLeft className="w-6 h-6 text-[#00DF1A]" />
              </span>
              <span className="text-xs font-medium text-zinc-300">Recibir</span>
            </button>

            <button
              type="button"
              onClick={() => openSheet("loan")}
              className="group flex flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-none"
            >
              <span className="w-14 h-14 rounded-full bg-[#1A1D24] border border-white/10 text-white flex items-center justify-center group-active:scale-95 transition-transform">
                <SlidersHorizontal className="w-5 h-5 text-[#CFFF2E]" />
              </span>
              <span className="text-xs font-medium text-zinc-300">Credito</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const idx = COINS.findIndex((c) => c.id === selectedId);
                const next = COINS[(idx + 1) % COINS.length];
                setSelectedId(next.id);
              }}
              className="group flex flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-none"
            >
              <span className="w-14 h-14 rounded-full bg-[#1A1D24] border border-white/10 text-white flex items-center justify-center group-active:scale-95 transition-transform">
                <ArrowLeftRight className="w-5 h-5 text-zinc-200" />
              </span>
              <span className="text-xs font-medium text-zinc-300">Rotar</span>
            </button>
          </div>

          {/* LISTA LIMPIA DE STABLECOINS Y RESPALDOS (TOCAR CAMBIA LA MONEDA 3D) */}
          <div className="w-full space-y-2">
            {COINS.map((coin) => {
              const isSelected = coin.id === selectedId;

              return (
                <button
                  key={coin.id}
                  type="button"
                  onClick={() => setSelectedId(coin.id)}
                  className={`w-full rounded-[22px] p-3.5 flex items-center justify-between transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DF1A] ${
                    isSelected
                      ? "bg-[#1C2029] border border-white/20"
                      : "bg-[#15181F] border border-white/5 hover:bg-[#191C24]"
                  } ${coin.demo ? "opacity-55" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-mono text-base font-black text-[#090D0A] shadow-inner"
                      style={{ backgroundColor: coin.accentHex }}
                    >
                      {coin.glyph}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {coin.symbol}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 ${
                            coin.demo ? "text-zinc-400" : "text-[#00DF1A]"
                          }`}
                        >
                          {coin.demo ? "demo" : "1:1 ARS"}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400">{coin.name}</span>
                    </div>
                  </div>

                  <div className="text-right tabular-nums">
                    <div className="text-sm font-bold text-white">
                      {hideBalance
                        ? "••••"
                        : coin.demo
                        ? "—"
                        : formatCents(displayBalanceCents)}
                    </div>
                    <div className="text-xs text-zinc-400 font-mono">
                      {hideBalance
                        ? "$ ••••"
                        : coin.demo
                        ? "no disponible"
                        : `margen ${formatCents(me.available_cents)}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* MOVIMIENTOS — ledger real (GET /transactions) + crédito simulado */}
          <div className="w-full space-y-2 mt-6">
            <p className="text-xs font-mono text-zinc-500 pb-1">MOVIMIENTOS</p>
            {feedItems.length === 0 && (
              <p className="text-xs text-zinc-500 font-mono py-3 text-center">
                Todavía no hay movimientos.
              </p>
            )}
            {feedItems.map((tx) => (
              <div
                key={tx.id}
                className="w-full rounded-[18px] bg-[#15181F] border border-white/5 p-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      tx.direction === "in"
                        ? "bg-[#00DF1A]/15 text-[#00DF1A]"
                        : "bg-white/5 text-zinc-300"
                    }`}
                  >
                    {tx.direction === "in" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {tx.counterparty.display_name}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 truncate">
                      {tx.note ??
                        new Date(tx.created_at).toLocaleDateString("es-AR")}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums shrink-0 ${
                    tx.direction === "in" ? "text-[#00DF1A]" : "text-white"
                  }`}
                >
                  {tx.direction === "in" ? "+" : "−"}
                  {formatCents(tx.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. BOTTOM BAR LEMON (SOLO ICONOS LIMPIOS) */}
        <nav
          aria-label="Navegacion"
          className="absolute bottom-0 inset-x-0 min-h-16 pb-[env(safe-area-inset-bottom)] bg-[#0E1014]/90 backdrop-blur-xl border-t border-white/10 px-10 flex items-center justify-between z-20"
        >
          <button
            type="button"
            onClick={() => setActiveSheet(null)}
            aria-label="Inicio"
            className="w-11 h-11 flex items-center justify-center text-[#00DF1A] cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#00DF1A]" />
          </button>

          <button
            type="button"
            onClick={() => openSheet("scan")}
            aria-label="Escanear para pagar"
            className="w-12 h-12 rounded-full bg-[#00DF1A] text-[#090D0A] flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
          >
            <QrCode className="w-5 h-5 stroke-[2.4]" />
          </button>

          <button
            type="button"
            onClick={() => openSheet("loan")}
            aria-label="Linea de credito"
            className="w-11 h-11 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </nav>

        {/* VISTA QR FULL SCREEN — tu QR para cobrar */}
        {activeSheet === "qr" && (
          <QrView
            me={me}
            onClose={() => setActiveSheet(null)}
            onPay={() => openSheet("send")}
          />
        )}

        {/* VISTA SCAN FULL SCREEN — cámara para pagar con QR */}
        {activeSheet === "scan" && (
          <ScanPayView
            token={token}
            me={me}
            onClose={() => setActiveSheet(null)}
            onPick={(p, amountCents) =>
              openSheet("send", { recipient: p, amountCents })
            }
          />
        )}

        {/* 4. BOTTOM SHEETS ULTRA LIMPIOS (SIN BLOQUES DE TEXTO) */}
        {activeSheet !== null &&
          activeSheet !== "qr" &&
          activeSheet !== "scan" && (
          <div
            className="absolute inset-0 z-30 bg-black/75 backdrop-blur-xs flex flex-col justify-end"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveSheet(null);
            }}
          >
            {/* ENVIAR / PAGAR */}
            {activeSheet === "send" && (
              <div className="max-h-[85%] overflow-y-auto rounded-t-[32px] bg-[#161920] border-t border-white/15 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    Pagar en TL
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSheet(null)}
                    aria-label="Cerrar"
                    className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {!isReal ? (
                  <p className="text-center text-sm text-zinc-400 py-6">
                    {activeCoin.symbol} no está disponible en esta demo. Elegí
                    TL para pagar.
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                      {recipients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setRecipient(p)}
                          className={`shrink-0 h-10 px-4 rounded-full border font-mono text-xs font-bold transition-all cursor-pointer ${
                            recipient?.id === p.id
                              ? "bg-[#00DF1A] text-[#090D0A] border-[#00DF1A]"
                              : "bg-[#1F232D] text-zinc-200 border-white/10 hover:border-white/25"
                          }`}
                        >
                          ${p.alias}
                        </button>
                      ))}
                      {recipients.length === 0 && (
                        <span className="text-xs text-zinc-500 font-mono py-2">
                          Cargando contactos…
                        </span>
                      )}
                    </div>

                    <div className="text-center py-3">
                      <div className="text-4xl font-bold tabular-nums text-white">
                        $ {amountInput}
                      </div>
                      <span className="text-xs font-mono text-zinc-400">
                        Margen disponible: {formatCents(me.available_cents)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
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
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleKeyPress(k)}
                          className="h-12 rounded-2xl bg-[#1F232D] active:scale-95 text-base font-bold text-white cursor-pointer"
                        >
                          {k === "DEL" ? "⌫" : k}
                        </button>
                      ))}
                    </div>

                    {sendError && (
                      <p className="text-xs text-red-400 text-center font-mono">
                        {sendError}
                      </p>
                    )}

                    <SlideToConfirm
                      key={sendError ?? "ok"}
                      label={
                        sending
                          ? "Enviando…"
                          : recipient
                          ? `Desliza para pagar a $${recipient.alias}`
                          : "Elegí un contacto"
                      }
                      disabled={!recipient || sending}
                      onConfirm={handleConfirmSend}
                    />
                  </>
                )}
              </div>
            )}

            {/* CREDITO — scoring por CUIT (simulación front-only) + margen real */}
            {activeSheet === "loan" && (
              <div className="max-h-[85%] overflow-y-auto rounded-t-[32px] bg-[#161920] border-t border-white/15 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    Crédito · 0% TNA
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSheet(null)}
                    aria-label="Cerrar"
                    className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {loanStep === "cuit" || !cuitProfile ? (
                  <div className="space-y-3.5">
                    <div className="rounded-[22px] bg-[#14171F] border border-white/[0.08] p-4 space-y-3">
                      <div className="space-y-0.5">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          Solicitud de Crédito
                        </h3>
                        <p className="text-xs text-zinc-400">
                          0% TNA · Ingresá tu CUIL o CUIT para consultar tu cupo
                          disponible.
                        </p>
                      </div>

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

                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        {[
                          { cuit: "20-38452911-4", label: "Martín Gómez (Café)" },
                          { cuit: "30-71442119-8", label: "Panadería La Unión" },
                          { cuit: "27-40192831-2", label: "Clara Fernández" },
                          { cuit: "23-35112449-9", label: "Kiosco San Juan" },
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
                      disabled={checkingScore}
                      onClick={() => handleCheckCuitScore()}
                      className="w-full h-12 rounded-full bg-[#CFFF2E] text-[#090D0A] font-bold text-sm flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {checkingScore ? (
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
                  <div className="space-y-2.5">
                    <div className="rounded-[20px] bg-[#14171F] border border-white/[0.08] p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {cuitProfile.razonSocial}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400">
                          CUIL {cuitProfile.cuit} · {cuitProfile.riskTier}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-zinc-500 block">
                            Scoring
                          </span>
                          <span className="text-xs font-mono font-bold text-[#CFFF2E]">
                            {cuitProfile.scoring} pts
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

                    <div className="rounded-[22px] bg-[#14171F] border border-white/[0.08] p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                        <span>Monto</span>
                        <span>
                          Cupo máx: {formatNumber(cuitProfile.maxCreditTokens, 0)}{" "}
                          TL
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
                        max={cuitProfile.maxCreditTokens}
                        step={25000}
                        value={loanSlider}
                        onChange={(e) => setLoanSlider(parseInt(e.target.value, 10))}
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
                          const targetVal = Math.max(
                            50000,
                            Math.round((cuitProfile.maxCreditTokens * step.pct) / 25000) * 25000
                          );
                          const isCurrent = Math.abs(loanSlider - targetVal) < 15000;
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

                    <div className="rounded-[22px] bg-[#14171F] border border-white/[0.08] p-3.5 space-y-3">
                      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0D0F14]">
                        {([30, 60, 90] as const).map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setLoanTermDays(days)}
                            className={`h-8 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                              loanTermDays === days
                                ? "bg-[#1F2432] text-white font-bold"
                                : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {days} días
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-left">
                        <div className="rounded-xl bg-[#0E1016] p-2.5">
                          <span className="text-[10px] font-mono text-zinc-500 block">
                            Cuota mensual
                          </span>
                          <span className="text-xs font-bold text-white font-mono">
                            {formatNumber(
                              Math.round(loanSlider / (loanTermDays / 30)),
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

                <p className="text-[10px] font-mono text-zinc-500 text-center">
                  Simulación: no toca el ledger. Tu margen real es{" "}
                  {formatCents(me.available_cents)} (saldo{" "}
                  {formatCents(me.balance_cents)} + límite{" "}
                  {formatCents(me.credit_limit_cents)}).
                </p>
              </div>
            )}

            {/* CONFIRMACION MINIMALISTA */}
            {activeSheet === "done" && (
              <div className="max-h-[85%] overflow-y-auto rounded-t-[32px] bg-[#161920] border-t border-white/15 p-6 space-y-5 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-[#00DF1A] text-[#090D0A] flex items-center justify-center">
                  <Check className="w-7 h-7 stroke-[2.8]" />
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-white">Listo</div>
                  {lastPayment && (
                    <p className="text-sm text-zinc-400 font-mono">
                      {formatCents(lastPayment.amountCents)} →{" "}
                      {lastPayment.to}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="w-full h-12 rounded-full bg-[#00DF1A] text-[#090D0A] font-bold text-sm cursor-pointer"
                >
                  Volver
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   APP — sesión demo (token + participante) en localStorage
   ============================================================================ */
export function LemonLocalitoWallet() {
  const [session, setSession] = useState<{
    token: string;
    me: Participant;
  } | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      setRestoring(false);
      return;
    }
    (async () => {
      try {
        const { token } = JSON.parse(raw) as { token: string };
        const me = await getMe(token);
        if (!cancelled) setSession({ token, me });
      } catch {
        localStorage.removeItem(SESSION_KEY);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (restoring) {
    return (
      <div className="min-h-dvh w-full bg-[#08090C] flex items-center justify-center">
        <span className="font-mono text-xs text-zinc-500">
          Conectando con localito…
        </span>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        onLogin={(token, participant) => {
          localStorage.setItem(SESSION_KEY, JSON.stringify({ token }));
          setSession({ token, me: participant });
        }}
      />
    );
  }

  return (
    <WalletScreen
      token={session.token}
      me={session.me}
      onRefresh={(me) => setSession((s) => (s ? { ...s, me } : s))}
      onLogout={() => {
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
      }}
    />
  );
}
