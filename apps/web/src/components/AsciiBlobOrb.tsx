"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { _layout } from "blobatar";

/* ══ AsciiBlobOrb ═════════════════════════════════════════════════════════════
   Orbe Blobtar Biomorphic ASCII interactivo.
   
   Características clave:
   1. Paridad de Siluetas con Blobatar Oficial (10 Formas Canónicas):
      - Soporta idénticamente las 10 formas de `@blobatar/react`:
        "capsule", "round", "organic", "boxy", "cloud", "sun", "droplet",
        "hexagon", "triangle", "nub".
      - Transición y metamorfosis elástica suave entre semillas y siluetas.
   2. Ojos Blobatar 100% "Sin Nada Adentro" (Huecos Negativos Puros):
      - Posicionados, orientados y escalados con las coordenadas exactas de _layout(seed).eyes.
      - Parpadeo reactivo y seguimiento inercial de alta potencia.
   3. Reposo Zen (Status Quo Calm):
      - Cero auto-giro y cero ruido autónomo en reposo ("no se mueve porque sí").
   4. Transición Suave y Animada (Smooth Excitation):
      - Al entrar el cursor en la zona del orbe, la turbulencia y el movimiento
        despiertan con una rampa suave y gradual.
   5. Nodos y Caracteres Nítidos:
      - Nodos semitono en reposo con radio sustancial (~3.6 a 5.8px).
      - Tipografía ASCII a 15px monospace en negrita.
   6. Física de Resortes Bencho (Particles.tsx) + Estela Térmica (ASCIIWake.tsx):
      - Resortes Euler frame-independent con amortiguación Math.pow(0.84, dt).
      - Deformación elíptica por velocidad.
      - Rampa de caracteres ASCII con centelleo terminal a 14Hz.
      - Onda de choque radial expansiva (Shockwave) al hacer clic.
   7. Génesis Interactiva con Grafos:
      - 1 nodo raíz -> 2 bifurcados -> 6 en constelación -> red exponencial -> despertar.
   ══════════════════════════════════════════════════════════════════════════════ */

export type BlobOrbMode = "idle" | "listening" | "voice" | "thinking" | "speaking";
export type GlyphRampName = "Classic" | "Matrix" | "Blocks" | "Dots" | "Binary";
export type BlobPaletteName = "monochrome" | "cobalt" | "cyan" | "emerald" | "amber";

export const GLYPH_RAMPS: Record<GlyphRampName, string[]> = {
  Classic: [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"],
  Matrix: [" ", "·", "¦", "|", "!", "0", "1", "X", "#", "8"],
  Blocks: [" ", "·", "░", "▒", "▓", "█"],
  Dots: [" ", "·", "•", "●"],
  Binary: [" ", ".", ":", "0", "1"],
};

export const BLOB_PALETTES: Record<
  BlobPaletteName,
  { primary: string; secondary: string; coldInk: string; eyeAccent: string; halo: string }
> = {
  monochrome: {
    primary: "#FFFFFF",
    secondary: "#D4D4D8",
    coldInk: "#8E8E93",
    eyeAccent: "#FFFFFF",
    halo: "rgba(255, 255, 255, 0.16)",
  },
  cobalt: {
    primary: "#388BFD",
    secondary: "#1B3B6F",
    coldInk: "#1D3557",
    eyeAccent: "#93C5FD",
    halo: "rgba(0, 102, 255, 0.20)",
  },
  cyan: {
    primary: "#22D3EE",
    secondary: "#164E63",
    coldInk: "#0E4A5E",
    eyeAccent: "#A5F3FC",
    halo: "rgba(0, 240, 255, 0.20)",
  },
  emerald: {
    primary: "#34D399",
    secondary: "#065F46",
    coldInk: "#064E3B",
    eyeAccent: "#A7F3D0",
    halo: "rgba(16, 185, 129, 0.20)",
  },
  amber: {
    primary: "#FBBF24",
    secondary: "#92400E",
    coldInk: "#78350F",
    eyeAccent: "#FDE68A",
    halo: "rgba(245, 158, 11, 0.20)",
  },
};

const MONO_FONT = `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace`;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function hash14Hz(k: number, deal: number): number {
  let h = (k * 374761393 + deal * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const THERMAL_COLD_THRESHOLD = 0.04;
const SHOCKWAVE_DURATION = 1.8;
const SHIMMER_INTERVAL_S = 0.07;

export type GenesisMode = "graph" | "fibonacci" | "quantum";

/* ══ Geometría Exacta de Siluetas Blobatar (10 Formas Canónicas) ══════════════
   Calcula la distancia radial R(θ) desde el centro del cuerpo hacia el borde
   perimetral para cualquiera de las 10 formas de la librería Blobatar:
   - "capsule": estadio horizontal con caja central plana y dos casquetes curvos.
   - "round": superelipse estándar (|x/rx|^n + |y/ry|^n = 1 con n ~ 2.0..2.5).
   - "boxy": superelipse cuadrada con n ~ 3.4..6.0 y leve inclinación rot.
   - "organic": spline polar armónico interpolando radii (6..8 vértices Catmull-Rom).
   - "cloud": cuerpo base con 4..6 lóbulos superiores hinchados.
   - "sun": cuerpo base con 6..9 rayos perimetrales en círculo completo.
   - "droplet": base elíptica con ápice cónico alargado en la parte superior.
   - "hexagon": polígono de 6 lados con esquinas suavizadas.
   - "triangle": polígono de 3 lados apoyado en su base.
   - "nub": superelipse con 1 o 2 protuberancias lobuladas orgánicas.
   ══════════════════════════════════════════════════════════════════════════════ */
export function getShapeBoundaryR(theta: number, layout: ReturnType<typeof _layout>): number {
  const { shape, body, petals } = layout;
  const { rx, ry, cx, cy, rot = 0, n = 2.4, radii, sides = 0, round = 0.3 } = body;

  let baseR = ry;
  const t = theta - ((rot || 0) * Math.PI) / 180;
  const cosT = Math.cos(t);
  const sinT = Math.sin(t);
  const absCos = Math.abs(cosT);
  const absSin = Math.abs(sinT);

  if (shape === "capsule") {
    const dx = Math.max(0, rx - ry);
    if (dx === 0) {
      baseR = rx;
    } else {
      const tanCrit = ry / dx;
      const tan = absSin / (absCos + 1e-9);
      if (tan >= tanCrit) {
        baseR = ry / (absSin + 1e-9);
      } else {
        baseR = dx * absCos + Math.sqrt(Math.max(0, ry * ry - dx * dx * sinT * sinT));
      }
    }
  } else if (shape === "organic" && radii && radii.length) {
    const pts = radii.length;
    let normT = t % (Math.PI * 2);
    if (normT < 0) normT += Math.PI * 2;
    const fIdx = (normT / (Math.PI * 2)) * pts;
    const i0 = Math.floor(fIdx) % pts;
    const i1 = (i0 + 1) % pts;
    const frac = fIdx - Math.floor(fIdx);
    const easeFrac = (1 - Math.cos(frac * Math.PI)) * 0.5;
    const m = radii[i0] * (1 - easeFrac) + radii[i1] * easeFrac;
    const invR = Math.hypot(cosT / rx, sinT / ry);
    baseR = (1 / (invR + 1e-9)) * m;
  } else if ((shape === "hexagon" || shape === "triangle") && sides >= 3) {
    const tPoly = t - Math.PI / 2;
    const sector = (Math.PI * 2) / sides;
    let normA = tPoly % sector;
    if (normA < 0) normA += sector;
    const alpha = normA - sector / 2;
    const rInscribed = rx * Math.cos(sector / 2);
    const rPoly = rInscribed / (Math.cos(alpha) + 1e-9);
    const k = Math.min(1, Math.max(0, round || 0.3));
    baseR = rPoly * (1 - k * 0.18) + rx * (k * 0.18);
  } else if (shape === "droplet") {
    const invR = Math.hypot(cosT / rx, sinT / ry);
    const rEllipse = 1 / (invR + 1e-9);
    if (sinT < -0.1) {
      const tip = 1.5;
      const apexDist = ry * tip;
      const tApex = Math.abs(cosT);
      const taperR = apexDist / (Math.abs(sinT) + tApex * 0.8 + 1e-9);
      baseR = Math.max(rEllipse, Math.min(apexDist, taperR));
    } else {
      baseR = rEllipse;
    }
  } else {
    // Superelipse (round, boxy, base de cloud/sun/nub)
    const pN = n || 2.4;
    const termX = Math.pow(absCos / rx, pN);
    const termY = Math.pow(absSin / ry, pN);
    baseR = 1 / Math.pow(termX + termY + 1e-9, 1 / pN);
  }

  // Evaluar pétalos/lóbulos exteriores adicionales (cloud, sun, nub)
  if (petals && petals.length) {
    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];
      const u = p.cx - cx;
      const v = p.cy - cy;
      const dPar = u * Math.cos(theta) + v * Math.sin(theta);
      const dPerp = Math.abs(-u * Math.sin(theta) + v * Math.cos(theta));
      if (dPerp < p.r && dPar > 0) {
        const rLobe = dPar + Math.sqrt(p.r * p.r - dPerp * dPerp);
        if (rLobe > baseR) {
          baseR = rLobe;
        }
      }
    }
  }

  return baseR;
}

export interface AsciiBlobOrbProps {
  seed?: string;
  mode?: BlobOrbMode;
  palette?: BlobPaletteName;
  glyphs?: GlyphRampName;
  particleDensity?: "fine" | "medium" | "coarse";
  reach?: number; // Radio de interacción del cursor en px
  force?: number; // Fuerza de repulsión elástica (0..100)
  trail?: number; // Duración de la estela térmica en segundos
  pull?: number;  // Atracción magnética de glifos hacia el mouse (0..100)
  showEyes?: boolean;
  className?: string;
  onBlobClick?: () => void;
  genesisType?: GenesisMode;
  genesisKey?: number;
  onGenesisComplete?: () => void;
}

export function AsciiBlobOrb({
  seed = "HackaTwin-Sphere-01",
  mode = "idle",
  palette = "monochrome",
  glyphs = "Classic",
  particleDensity = "medium",
  reach = 85,
  force = 55,
  trail = 1.3,
  pull = 35,
  showEyes = true,
  className = "w-full h-full",
  onBlobClick,
  genesisType = "graph",
  genesisKey = 0,
  onGenesisComplete,
}: AsciiBlobOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const knobsRef = useRef({
    seed,
    mode,
    palette,
    glyphs,
    reach,
    force,
    trail,
    pull,
    showEyes,
    particleDensity,
    genesisType,
    genesisKey,
  });

  useEffect(() => {
    knobsRef.current = {
      seed,
      mode,
      palette,
      glyphs,
      reach,
      force,
      trail,
      pull,
      showEyes,
      particleDensity,
      genesisType,
      genesisKey,
    };
  }, [
    seed,
    mode,
    palette,
    glyphs,
    reach,
    force,
    trail,
    pull,
    showEyes,
    particleDensity,
    genesisType,
    genesisKey,
  ]);

  // Parpadeo de ojos Blobatar orgánico
  const blinkStateRef = useRef({ progress: 1.0, isBlinking: false });

  const triggerBlink = useCallback(() => {
    if (blinkStateRef.current.isBlinking) return;
    blinkStateRef.current.isBlinking = true;
    const start = performance.now();
    const duration = 160;

    const stepBlink = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1.0, elapsed / duration);
      // Suave curva de parpadeo biológico (hasta 0.08 en el punto de máximo cierre)
      const closeAmount = Math.sin(p * Math.PI);
      blinkStateRef.current.progress = 1.0 - 0.92 * Math.pow(closeAmount, 1.8);
      if (p < 1.0) {
        requestAnimationFrame(stepBlink);
      } else {
        blinkStateRef.current.progress = 1.0;
        blinkStateRef.current.isBlinking = false;
      }
    };
    requestAnimationFrame(stepBlink);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const scheduleNext = () => {
      const delay = 3500 + Math.random() * 4000;
      timer = setTimeout(() => {
        triggerBlink();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timer);
  }, [triggerBlink]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let width = container.clientWidth || 480;
    let height = container.clientHeight || 400;
    let dpr = Math.min(2, window.devicePixelRatio || 1);

    const updateSize = () => {
      width = container.clientWidth || 480;
      height = container.clientHeight || 400;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
      initParticles();
    });
    ro.observe(container);

    const isMotionReduced =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Con puntos más grandes, ajustamos la cuenta para mantener el espaciado armónico
    let particleCount =
      particleDensity === "fine" ? 540 : particleDensity === "medium" ? 400 : 280;

    interface ParticleSOA {
      baseRadius: Float32Array;
      baseAngle: Float32Array;
      phase: Float32Array;
      hx: Float32Array;
      hy: Float32Array;
      x: Float32Array;
      y: Float32Array;
      vx: Float32Array;
      vy: Float32Array;
      heat: Float32Array;
      size: Float32Array;
    }

    let particles: ParticleSOA;

    const initParticles = () => {
      const N = particleCount;
      const baseR = Math.min(width, height) * 0.35;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 grados
      const S = baseR / 35; // Factor de escala para mapear espacio 100x100 de Blobatar al canvas

      const bRadius = new Float32Array(N);
      const bAngle = new Float32Array(N);
      const bPhase = new Float32Array(N);
      const hx = new Float32Array(N);
      const hy = new Float32Array(N);
      const px = new Float32Array(N);
      const py = new Float32Array(N);
      const vx = new Float32Array(N);
      const vy = new Float32Array(N);
      const heat = new Float32Array(N);
      const size = new Float32Array(N);

      const cx = width * 0.5;
      const cy = height * 0.5;

      const currentLayout = _layout(knobsRef.current.seed);

      for (let i = 0; i < N; i++) {
        const rNorm = Math.sqrt((i + 0.5) / N);
        const theta = i * goldenAngle;
        const boundaryR = getShapeBoundaryR(theta, currentLayout);
        const r = boundaryR * rNorm * S;

        bRadius[i] = r;
        bAngle[i] = theta;
        bPhase[i] = Math.random() * Math.PI * 2;

        const initX = cx + Math.cos(theta) * r;
        const initY = cy + Math.sin(theta) * r;

        hx[i] = initX;
        hy[i] = initY;
        px[i] = initX;
        py[i] = initY;
        vx[i] = 0;
        vy[i] = 0;
        heat[i] = 0;

        // Puntos más grandes (radio entre 3.6 y 5.6 px para presencia nítida)
        size[i] = 3.6 + Math.random() * 2.0;
      }

      particles = {
        baseRadius: bRadius,
        baseAngle: bAngle,
        phase: bPhase,
        hx,
        hy,
        x: px,
        y: py,
        vx,
        vy,
        heat,
        size,
      };
    };

    initParticles();

    // Pares de nodos fijos para sinapsis en modo pensar
    let synapsePairs: [number, number][] = [];
    const buildSynapses = () => {
      synapsePairs = [];
      const N = particleCount;
      for (let s = 0; s < 32; s++) {
        const a = Math.floor(Math.random() * (N * 0.70));
        const b = Math.floor(Math.random() * (N * 0.70));
        if (a !== b) synapsePairs.push([a, b]);
      }
    };
    buildSynapses();

    // Control de tiempo para la Génesis del Orbe (inicia consolidado por defecto para visualización instantánea; se dispara al pulsar Replay o cambiar modo)
    let genesisElapsed = 0;
    let isGenesisDone = knobsRef.current.genesisKey === 0;
    let lastGenesisKey = knobsRef.current.genesisKey;

    /* ── Estado Dinámico del Puntero y Ondas ── */
    const pointer = {
      x: -999,
      y: -999,
      lx: NaN,
      ly: NaN,
      velocity: 0,
      inside: false,
      near: 0,
      squishScaleY: 1.0,
      squishVelocity: 0.0,
    };

    const shockwaveRings: Array<{ x: number; y: number; t: number }> = [];

    const stampThermal = (
      x: number,
      y: number,
      radius: number,
      amount: number
    ) => {
      const R2 = radius * radius;
      for (let i = 0; i < particleCount; i++) {
        const dx = particles.x[i] - x;
        const dy = particles.y[i] - y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 >= R2) continue;
        const q = 1 - dist2 / R2;
        particles.heat[i] = Math.min(1.0, particles.heat[i] + amount * q * q);
      }
    };

    /* ── Listeners del Puntero ── */
    const getPointerPos = (e: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const handlePointerMove = (e: MouseEvent) => {
      const { x, y } = getPointerPos(e);
      const wakeRadius = 18 + (knobsRef.current.reach / 100) * 54;

      if (Number.isNaN(pointer.lx)) {
        pointer.lx = x;
        pointer.ly = y;
      }

      const dist = Math.hypot(x - pointer.lx, y - pointer.ly);
      pointer.velocity = dist;
      const steps = Math.max(1, Math.ceil(dist / (wakeRadius * 0.35)));
      for (let k = 1; k <= steps; k++) {
        const f = k / steps;
        stampThermal(
          pointer.lx + (x - pointer.lx) * f,
          pointer.ly + (y - pointer.ly) * f,
          wakeRadius,
          0.45
        );
      }

      pointer.lx = x;
      pointer.ly = y;
      pointer.x = x;
      pointer.y = y;
      pointer.inside = true;
    };

    const handlePointerEnter = (e: MouseEvent) => {
      pointer.lx = NaN;
      handlePointerMove(e);
    };

    const handlePointerLeave = () => {
      pointer.inside = false;
      pointer.lx = NaN;
    };

    const handlePointerDown = (e: MouseEvent) => {
      const { x, y } = getPointerPos(e);
      shockwaveRings.push({ x, y, t: 0 });
      pointer.squishVelocity -= 0.85;
      triggerBlink();

      const S = 0.5 + (clamp(knobsRef.current.force, 0, 100) / 100) * 1.5;
      for (let i = 0; i < particleCount; i++) {
        const dx = particles.x[i] - x;
        const dy = particles.y[i] - y;
        const d = Math.hypot(dx, dy);
        if (d > 230 || d < 0.01) continue;
        const f = (1 - d / 230) * 36 * S;
        particles.vx[i] += (dx / d) * f;
        particles.vy[i] += (dy / d) * f;
        particles.heat[i] = Math.min(1.0, particles.heat[i] + (1 - d / 230) * 0.85);
      }

      if (onBlobClick) onBlobClick();
    };

    const globalMouse = { x: NaN, y: NaN };
    const handleGlobalMouseMove = (e: MouseEvent) => {
      globalMouse.x = e.clientX;
      globalMouse.y = e.clientY;
    };
    window.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });

    container.addEventListener("mousemove", handlePointerMove);
    container.addEventListener("mouseenter", handlePointerEnter);
    container.addEventListener("mouseleave", handlePointerLeave);
    container.addEventListener("mousedown", handlePointerDown);

    /* ── Ciclo de Animación ── */
    let animId = 0;
    let prevTime = -1;
    let tickShimmer = 0;
    let dealCounter = 0;
    let globalAngle = 0;

    // Transición suave y animada al entrar el mouse (Smooth Excitation)
    let smoothExcitation = 0.0;
    // Ojos Blobatar con inercia suave
    let smoothEyeX = 0.0;
    let smoothEyeY = 0.0;

    const render = (currentTime: number) => {
      if (prevTime < 0) {
        prevTime = currentTime;
      }
      const deltaMs = Math.max(0, currentTime - prevTime);
      const rawDt = Math.min(0.05, deltaMs / 1000);
      const dtFrames = clamp(deltaMs / 16.67, 0.1, 2.5);
      prevTime = currentTime;

      const knobs = knobsRef.current;
      const paletteDef = BLOB_PALETTES[knobs.palette] || BLOB_PALETTES.monochrome;
      const ramp = GLYPH_RAMPS[knobs.glyphs] || GLYPH_RAMPS.Classic;
      const topRampIndex = ramp.length - 1;

      // Actualizar Shimmer de terminal a ~14 Hz
      tickShimmer += rawDt;
      if (tickShimmer > SHIMMER_INTERVAL_S) {
        tickShimmer = 0;
        dealCounter++;
      }

      // Física de squish (Hooke)
      const targetSquish = pointer.inside ? 0.93 : 1.0;
      const springK = 180.0;
      const dampingC = 12.0;
      const disp = pointer.squishScaleY - targetSquish;
      const forceSpring = -springK * disp - dampingC * pointer.squishVelocity;
      pointer.squishVelocity += forceSpring * rawDt;
      pointer.squishScaleY += pointer.squishVelocity * rawDt;

      const squishY = pointer.squishScaleY;
      const squishX = 1.0 + (1.0 - squishY) * 0.5;

      // Inercia de proximidad
      pointer.near +=
        ((pointer.inside ? 1 : 0) - pointer.near) *
        (1 - Math.pow(0.005, rawDt));

      pointer.velocity *= 0.88;

      /* ── 1. TRANSICIÓN SUAVE Y ANIMADA DEL MOVIMIENTO GENERAL (SMOOTH EXCITATION) ── */
      // Cuando el mouse entra al orbe, smoothExcitation sube suavemente de 0.0 a 1.0 sin saltos bruscos.
      // Cuando sale, se apaga gradualmente retornando al reposo zen ("no se mueve porque sí").
      const targetExcitation = pointer.inside ? 1.0 : 0.0;
      smoothExcitation += (targetExcitation - smoothExcitation) * (1.0 - Math.pow(0.03, rawDt));

      const pointerSpeed = Math.min(1.0, pointer.velocity / 18.0);
      const activeIntensity = smoothExcitation * (0.85 + pointerSpeed * 0.65);

      // En reposo (status quo): smoothExcitation = 0 -> morphAmp = 0 (cero movimiento autónomo)
      let morphSpeed = 0.35 + activeIntensity * 1.5;
      let morphAmp1 = activeIntensity * 0.055;
      let morphAmp2 = activeIntensity * 0.035;
      let morphAmp3 = activeIntensity * 0.018;

      // MODOS EXTERNOS REFINADOS (sin expansión brusca ni morph falso de hover)
      if (knobs.mode === "listening" || knobs.mode === "voice") {
        // Cero expansión física: orbe calmado y receptivo con micro-vibración acústica perimetral
        morphSpeed = 0.45;
        morphAmp1 = 0.0;
        morphAmp2 = 0.0;
        morphAmp3 = 0.0;
      } else if (knobs.mode === "thinking") {
        // Cero deformación de hover: orbe sereno con sinapsis neuronales internas activas
        morphSpeed = 0.40;
        morphAmp1 = 0.0;
        morphAmp2 = 0.0;
        morphAmp3 = 0.0;
      } else if (knobs.mode === "speaking") {
        // Cero inflación de volumen: modulación sutil de voz centrada
        morphSpeed = 0.50;
        morphAmp1 = 0.0;
        morphAmp2 = 0.0;
        morphAmp3 = 0.0;
      }

      const cx = width * 0.5;
      const cy = height * 0.5;

      // Paralaje sutil únicamente reactivo al mouse (0 auto-giro)
      const targetParallaxAngle = pointer.inside ? (pointer.x - cx) * 0.0003 : 0;
      globalAngle += (targetParallaxAngle - globalAngle) * 0.08;

      const baseR = Math.min(width, height) * 0.35;

      /* ── GÉNESIS INTERACTIVA DEL ORBE (GRAFOS 1→2→6→EXPONENCIAL) ── */
      if (knobs.genesisKey !== lastGenesisKey) {
        genesisElapsed = 0;
        isGenesisDone = false;
        lastGenesisKey = knobs.genesisKey;
      }

      if (!isGenesisDone) {
        genesisElapsed += rawDt;
      }

      const gType = knobs.genesisType || "graph";

      let visCount = particleCount;
      let eyeOpenFactor = 1.0;
      let genesisStage = 0;

      if (!isGenesisDone) {
        if (gType === "graph") {
          if (genesisElapsed < 0.70) {
            // Fase 1: 1 nodo raíz en el centro
            genesisStage = 1;
            visCount = 1;
            eyeOpenFactor = 0.0;
            particles.hx[0] = cx;
            particles.hy[0] = cy;
            particles.x[0] = cx;
            particles.y[0] = cy;
            particles.vx[0] = 0;
            particles.vy[0] = 0;
          } else if (genesisElapsed < 1.50) {
            // Fase 2: 2 nodos bifurcándose a los lados con arista
            genesisStage = 2;
            visCount = 2;
            eyeOpenFactor = 0.0;
            const p = (genesisElapsed - 0.70) / 0.80;
            const easeP = Math.sin(p * Math.PI * 0.5);
            const sep = baseR * 0.32 * easeP;
            particles.hx[0] = cx - sep;
            particles.hy[0] = cy;
            particles.hx[1] = cx + sep;
            particles.hy[1] = cy;
          } else if (genesisElapsed < 2.30) {
            // Fase 3: 6 nodos en constelación hexagonal
            genesisStage = 3;
            visCount = 6;
            eyeOpenFactor = 0.0;
            const p = (genesisElapsed - 1.50) / 0.80;
            const hexR = baseR * 0.45 * Math.min(1.0, p * 1.15);
            const rot = p * 0.35;
            for (let k = 0; k < 6; k++) {
              const ang = (k * Math.PI) / 3 + rot;
              particles.hx[k] = cx + Math.cos(ang) * hexR;
              particles.hy[k] = cy + Math.sin(ang) * hexR;
            }
          } else if (genesisElapsed < 3.40) {
            // Fase 4: Proliferación exponencial hacia la nube completa
            genesisStage = 4;
            const p = (genesisElapsed - 2.30) / 1.10;
            const expCount = Math.round(6 + (particleCount - 6) * Math.pow(p, 2.2));
            visCount = Math.min(particleCount, Math.max(6, expCount));
            eyeOpenFactor = 0.0;
          } else if (genesisElapsed < 4.10) {
            // Fase 5: Consolidación & Despertar Ocular
            genesisStage = 5;
            visCount = particleCount;
            const p = (genesisElapsed - 3.40) / 0.70;
            eyeOpenFactor = Math.sin(p * Math.PI * 0.5);
          } else {
            // Genesis completado
            isGenesisDone = true;
            visCount = particleCount;
            eyeOpenFactor = 1.0;
            if (onGenesisComplete) onGenesisComplete();
          }
        } else if (gType === "fibonacci") {
          if (genesisElapsed < 2.80) {
            const p = genesisElapsed / 2.80;
            visCount = Math.max(1, Math.round(particleCount * Math.pow(p, 1.5)));
            eyeOpenFactor = 0.0;
          } else if (genesisElapsed < 3.50) {
            visCount = particleCount;
            eyeOpenFactor = Math.sin(((genesisElapsed - 2.80) / 0.70) * Math.PI * 0.5);
          } else {
            isGenesisDone = true;
            visCount = particleCount;
            eyeOpenFactor = 1.0;
            if (onGenesisComplete) onGenesisComplete();
          }
        } else if (gType === "quantum") {
          if (genesisElapsed < 1.0) {
            const p = 1.0 - genesisElapsed / 1.0;
            visCount = particleCount;
            eyeOpenFactor = 0.0;
            for (let i = 0; i < particleCount; i++) {
              particles.hx[i] = cx + (particles.hx[i] - cx) * p * 0.12;
              particles.hy[i] = cy + (particles.hy[i] - cy) * p * 0.12;
              particles.heat[i] = 0.85;
            }
          } else if (genesisElapsed < 1.4) {
            visCount = particleCount;
            eyeOpenFactor = 0.0;
          } else if (genesisElapsed < 3.2) {
            visCount = particleCount;
            eyeOpenFactor = Math.sin(((genesisElapsed - 1.4) / 1.8) * Math.PI * 0.5);
          } else {
            isGenesisDone = true;
            visCount = particleCount;
            eyeOpenFactor = 1.0;
            if (onGenesisComplete) onGenesisComplete();
          }
        }
      }

      /* ── 2. SEGUIMIENTO OCULAR Y PARIDAD DE SILUETA CON BLOBATAR ── */
      let targetEyeX = 0;
      let targetEyeY = 0;

      // Resuelve el layout del Blobatar para la semilla actual
      const activeLayout = _layout(knobs.seed || "HackaTwin-Sphere-01");
      const S = (Math.min(width, height) * 0.35) / 35; // Factor de escala canónico

      if (knobs.mode === "thinking") {
        // En modo pensar: mirada reflexiva cognoscente hacia arriba-izquierda con micro-deriva
        targetEyeX = -baseR * 0.16 + Math.sin(currentTime * 0.0025) * 5;
        targetEyeY = -baseR * 0.18 + Math.cos(currentTime * 0.002) * 4;
      } else if (!Number.isNaN(globalMouse.x)) {
        const rect = container.getBoundingClientRect();
        const screenCenterX = rect.left + width * 0.5;
        const screenCenterY = rect.top + height * 0.5;
        const screenDx = globalMouse.x - screenCenterX;
        const screenDy = globalMouse.y - screenCenterY;

        // Rango de seguimiento con mucha más fuerza (34% en X, 26% en Y)
        const maxDeflectX = baseR * 0.34;
        const maxDeflectY = baseR * 0.26;

        // Curva de respuesta ultra-reactiva: responde con decisión a movimientos cercanos y lejanos
        const normX = clamp(screenDx / 300, -1, 1);
        const normY = clamp(screenDy / 220, -1, 1);
        const signX = Math.sign(normX);
        const signY = Math.sign(normY);
        targetEyeX = signX * Math.pow(Math.abs(normX), 0.68) * maxDeflectX;
        targetEyeY = signY * Math.pow(Math.abs(normY), 0.68) * maxDeflectY;
      }

      // Persecución inercial viva y ágil (factor lerp veloz 0.003)
      smoothEyeX += (targetEyeX - smoothEyeX) * (1.0 - Math.pow(0.003, rawDt));
      smoothEyeY += (targetEyeY - smoothEyeY) * (1.0 - Math.pow(0.003, rawDt));

      // Mapeo exacto de las coordenadas de ojos de Blobatar (layout.eyes) al canvas
      const eye0 = activeLayout.eyes?.[0] || { cx: 40, cy: 48, rx: 3.2, ry: 6.8, rot: 0 };
      const eye1 = activeLayout.eyes?.[1] || { cx: 60, cy: 48, rx: 3.2, ry: 6.8, rot: 0 };

      const baseEyeLX = cx + (eye0.cx - activeLayout.body.cx) * S;
      const baseEyeLY = cy + (eye0.cy - activeLayout.body.cy) * S;
      const eyeLRX = eye0.rx * S;
      const eyeLRY = eye0.ry * S;
      const eyeLRot = ((eye0.rot || 0) * Math.PI) / 180;

      const baseEyeRX = cx + (eye1.cx - activeLayout.body.cx) * S;
      const baseEyeRY = cy + (eye1.cy - activeLayout.body.cy) * S;
      const eyeRRX = eye1.rx * S;
      const eyeRRY = eye1.ry * S;
      const eyeRRot = ((eye1.rot || 0) * Math.PI) / 180;

      const eyeLX = baseEyeLX + smoothEyeX;
      const eyeLY = baseEyeLY + smoothEyeY;
      const eyeRX = baseEyeRX + smoothEyeX;
      const eyeRY = baseEyeRY + smoothEyeY;

      // Ondas de choque
      for (let rIdx = shockwaveRings.length - 1; rIdx >= 0; rIdx--) {
        shockwaveRings[rIdx].t += rawDt;
        if (shockwaveRings[rIdx].t >= SHOCKWAVE_DURATION) {
          shockwaveRings.splice(rIdx, 1);
        }
      }

      const activeRings = shockwaveRings.map((r) => {
        const p = r.t / SHOCKWAVE_DURATION;
        const easeOut = 1 - Math.pow(1 - p, 3);
        return {
          x: r.x,
          y: r.y,
          radius: 12 + easeOut * 260,
          amp: 0.8 * (1 - p) * (1 - p) * Math.min(1, p * 5),
        };
      });

      const keepHeat = Math.exp((-rawDt * 3.0) / Math.max(0.1, knobs.trail));

      /* ── Actualización de Partículas ── */
      const R_reach = clamp(knobs.reach, 30, 160);
      const pushForce = (clamp(knobs.force, 0, 100) / 100) * 11;
      const leanStrength = (clamp(knobs.pull, 0, 100) / 100) * pointer.near;
      const farDist = R_reach * 2;
      const farDist2 = farDist * farDist;

      for (let i = 0; i < particleCount; i++) {
        const angle = particles.baseAngle[i] + globalAngle;
        const phase = particles.phase[i];
        const rNorm = Math.sqrt((i + 0.5) / particleCount);

        // Deformación armónica polar (solo activa ante interacción)
        const harm =
          Math.sin(angle * 2.0 + currentTime * 0.0015 * morphSpeed + phase) * morphAmp1 +
          Math.cos(angle * 3.0 - currentTime * 0.0018 * morphSpeed) * morphAmp2 +
          Math.sin(angle * 5.0 + currentTime * 0.0022 * morphSpeed) * morphAmp3;

        // Modulación acústica de voz únicamente en nodos exteriores (sin inflar ni desinflar el blob)
        let voiceRipple = 0;
        if (knobs.mode === "listening" || knobs.mode === "voice") {
          if (rNorm > 0.60) {
            voiceRipple = Math.sin(angle * 10.0 - currentTime * 0.007) * 0.022;
          }
        } else if (knobs.mode === "speaking") {
          if (rNorm > 0.55) {
            const speechPulse = Math.sin(currentTime * 0.015) > 0.1 ? 0.018 : -0.008;
            voiceRipple = Math.sin(angle * 8.0 + currentTime * 0.009) * 0.02 + speechPulse;
          }
        }

        // En modo pensar: inyectar pulsos cognitivos de calor a los nodos
        if (knobs.mode === "thinking") {
          const thinkPulse = Math.sin(currentTime * 0.006 + particles.phase[i]) * 0.5 + 0.5;
          if (thinkPulse > 0.72) {
            particles.heat[i] = Math.max(particles.heat[i], (thinkPulse - 0.72) * 2.8);
          }
        }

        // Límite perimetral exacto de la silueta para este ángulo según la forma
        const boundaryR = getShapeBoundaryR(angle, activeLayout);
        const dynamicR = boundaryR * rNorm * S * (1.0 + harm + voiceRipple);

        let targetHx = cx + Math.cos(angle) * dynamicR * squishX;
        let targetHy = cy + Math.sin(angle) * dynamicR * squishY;

        if (!isGenesisDone && gType === "graph" && genesisStage < 4 && i < 6) {
          // Mantener hx e hy fijados en la constelación de grafo
        } else {
          particles.hx[i] = targetHx;
          particles.hy[i] = targetHy;
        }

        // Repulsión por puntero
        if (pointer.inside) {
          const pdx = particles.x[i] - pointer.x;
          const pdy = particles.y[i] - pointer.y;
          const pdist = Math.hypot(pdx, pdy);
          if (pdist < R_reach && pdist > 0.01) {
            const f = Math.pow(1 - pdist / R_reach, 2) * pushForce;
            particles.vx[i] += (pdx / pdist) * f * dtFrames;
            particles.vy[i] += (pdy / pdist) * f * dtFrames;
          }
        }

        // Perturbación por ondas de choque
        for (const ring of activeRings) {
          const rdx = particles.x[i] - ring.x;
          const rdy = particles.y[i] - ring.y;
          const rDist = Math.hypot(rdx, rdy);
          const diff = (rDist - ring.radius) / 24;
          if (diff > -2.5 && diff < 2.5) {
            const ringFactor = ring.amp * Math.exp(-diff * diff);
            if (rDist > 0.01) {
              particles.vx[i] += (rdx / rDist) * ringFactor * 22 * dtFrames;
              particles.vy[i] += (rdy / rDist) * ringFactor * 22 * dtFrames;
            }
            particles.heat[i] = Math.min(1.0, particles.heat[i] + ringFactor * 0.9);
          }
        }

        // Resorte Euler frame-independent
        const springDamping = Math.pow(0.84, dtFrames);
        particles.vx[i] =
          (particles.vx[i] + (particles.hx[i] - particles.x[i]) * 0.05 * dtFrames) *
          springDamping;
        particles.vy[i] =
          (particles.vy[i] + (particles.hy[i] - particles.y[i]) * 0.05 * dtFrames) *
          springDamping;

        particles.x[i] += particles.vx[i] * dtFrames;
        particles.y[i] += particles.vy[i] * dtFrames;

        if (
          Math.abs(particles.hx[i] - particles.x[i]) < 0.05 &&
          Math.abs(particles.hy[i] - particles.y[i]) < 0.05 &&
          Math.abs(particles.vx[i]) < 0.02 &&
          Math.abs(particles.vy[i]) < 0.02
        ) {
          particles.x[i] = particles.hx[i];
          particles.y[i] = particles.hy[i];
          particles.vx[i] = 0;
          particles.vy[i] = 0;
        }

        particles.heat[i] *= keepHeat;
        if (particles.heat[i] < 0.003) particles.heat[i] = 0;
      }

      /* ── Renderizado Canvas 2D ── */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fondo negro estricto
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Halo sutil de fondo
      const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, baseR * 1.3);
      gradient.addColorStop(0, paletteDef.halo);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      /* ── ARISTAS DE GRAFOS DE GÉNESIS (1→2→6→RED EXPONENCIAL) ── */
      if (!isGenesisDone && gType === "graph") {
        ctx.save();
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = paletteDef.primary;

        if (genesisStage === 1) {
          // Fase 1: Radar ping concéntrico alrededor del nodo raíz
          const pingP = genesisElapsed / 0.70;
          const pingR = 12 + pingP * (baseR * 0.35);
          ctx.globalAlpha = (1 - pingP) * 0.85;
          ctx.beginPath();
          ctx.arc(cx, cy, pingR, 0, Math.PI * 2);
          ctx.stroke();
        } else if (genesisStage === 2) {
          // Fase 2: 2 Nodos conectados con arista luminosa y paquete de datos
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(particles.x[0], particles.y[0]);
          ctx.lineTo(particles.x[1], particles.y[1]);
          ctx.stroke();

          const packetT = (currentTime * 0.0035) % 1.0;
          const packetX = particles.x[0] + (particles.x[1] - particles.x[0]) * packetT;
          const packetY = particles.y[0] + (particles.y[1] - particles.y[0]) * packetT;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(packetX, packetY, 3.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (genesisStage === 3) {
          // Fase 3: 6 Nodos en constelación hexagonal con aristas y radios
          ctx.globalAlpha = 0.70;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const nextK = (k + 1) % 6;
            ctx.moveTo(particles.x[k], particles.y[k]);
            ctx.lineTo(particles.x[nextK], particles.y[nextK]);
            ctx.moveTo(cx, cy);
            ctx.lineTo(particles.x[k], particles.y[k]);
          }
          ctx.stroke();
        } else if (genesisStage === 4 || genesisStage === 5) {
          // Fase 4 & 5: Red de grafo neuronal entre nodos vecinos
          const edgeAlpha = genesisStage === 5
            ? Math.max(0, (1 - (genesisElapsed - 3.40) / 0.70)) * 0.45
            : 0.45;
          if (edgeAlpha > 0.02) {
            ctx.globalAlpha = edgeAlpha;
            ctx.beginPath();
            const step = Math.max(1, Math.floor(visCount / 100));
            for (let i = 0; i < visCount; i += step) {
              const maxJ = Math.min(visCount, i + 14);
              for (let j = i + 1; j < maxJ; j++) {
                const edx = particles.x[i] - particles.x[j];
                const edy = particles.y[i] - particles.y[j];
                if (edx * edx + edy * edy < 1764) { // distancia < 42px
                  ctx.moveTo(particles.x[i], particles.y[i]);
                  ctx.lineTo(particles.x[j], particles.y[j]);
                }
              }
            }
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      /* ── MODO PENSAR: SINAPSIS NEURONALES INTERNAS ACTIVAS ── */
      if (knobs.mode === "thinking" && isGenesisDone) {
        ctx.save();
        ctx.lineWidth = 1.1;
        for (let s = 0; s < synapsePairs.length; s++) {
          const [idxA, idxB] = synapsePairs[s];
          if (idxA < visCount && idxB < visCount) {
            const ax = particles.x[idxA];
            const ay = particles.y[idxA];
            const bx = particles.x[idxB];
            const by = particles.y[idxB];
            const pulse = Math.sin(currentTime * 0.005 + s * 1.4) * 0.5 + 0.5;
            if (pulse > 0.35) {
              ctx.strokeStyle = paletteDef.primary;
              ctx.globalAlpha = (pulse - 0.35) * 0.45;
              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo(bx, by);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // Tipografía más grande y nítida para los glifos ASCII (15px)
      ctx.font = `600 15px ${MONO_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const normalBlinkComp = Math.max(0.08, blinkStateRef.current.progress);
      const blinkComp = !isGenesisDone ? Math.max(0.06, eyeOpenFactor) : normalBlinkComp;

      /* ── Dibujo de Partículas: Halftone Frío o Glifo Caliente ── */
      for (let i = 0; i < visCount; i++) {
        let renderX = particles.x[i];
        let renderY = particles.y[i];

        // 1. Atracción magnética hacia el cursor
        if (leanStrength > 0.002 && pointer.inside) {
          const mdx = pointer.x - renderX;
          const mdy = pointer.y - renderY;
          const md2 = mdx * mdx + mdy * mdy;
          if (md2 < farDist2) {
            const f = 1 - md2 / farDist2;
            const md = Math.sqrt(md2) || 1;
            const pullOffset = Math.min(md * 0.6, 14 * leanStrength * f * f);
            renderX += (mdx / md) * pullOffset;
            renderY += (mdy / md) * pullOffset;
          }
        }

        // 2. OJOS BLOBATAR: DOS HUECOS VACÍOS PUROS (100% SIN NADA)
        // Posicionados, rotados y escalados según el layout canónico de Blobatar.
        // Se ejecuta DESPUÉS de cualquier atracción magnética para garantizar
        // que la cavidad permanezca completamente pura y limpia.
        if (knobs.showEyes) {
          const dxL = renderX - eyeLX;
          const dyL = renderY - eyeLY;
          const cosL = Math.cos(-eyeLRot);
          const sinL = Math.sin(-eyeLRot);
          const uL = (dxL * cosL - dyL * sinL) / eyeLRX;
          const vL = (dxL * sinL + dyL * cosL) / (eyeLRY * blinkComp);
          const dL = Math.hypot(uL, vL);

          const dxR = renderX - eyeRX;
          const dyR = renderY - eyeRY;
          const cosR = Math.cos(-eyeRRot);
          const sinR = Math.sin(-eyeRRot);
          const uR = (dxR * cosR - dyR * sinR) / eyeRRX;
          const vR = (dxR * sinR + dyR * cosR) / (eyeRRY * blinkComp);
          const dR = Math.hypot(uR, vR);

          // Si el punto cae dentro de la cápsula (con margen para el radio del punto): purga total
          if (dL < 1.15 || dR < 1.15) continue;

          // Si está en el borde perimetral inmediato, se empuja suavemente creando el contorno orgánico
          if (dL < 1.35) {
            const push = (1.35 - dL) * 0.6;
            const ang = Math.atan2(vL, uL) + eyeLRot;
            renderX += Math.cos(ang) * eyeLRX * push;
            renderY += Math.sin(ang) * (eyeLRY * blinkComp) * push;
          } else if (dR < 1.35) {
            const push = (1.35 - dR) * 0.6;
            const ang = Math.atan2(vR, uR) + eyeRRot;
            renderX += Math.cos(ang) * eyeRRX * push;
            renderY += Math.sin(ang) * (eyeRRY * blinkComp) * push;
          }
        }

        let h = particles.heat[i];

        const sp = Math.hypot(particles.vx[i], particles.vy[i]);

        // FASE FRÍA: Puntos / Elipses grandes de semitono
        if (h <= THERMAL_COLD_THRESHOLD) {
          ctx.fillStyle = paletteDef.coldInk;
          const r = particles.size[i];

          if (sp < 0.3) {
            ctx.beginPath();
            ctx.arc(renderX, renderY, r, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const s = Math.min(2.5, 1 + sp * 0.12);
            const rot = Math.atan2(particles.vy[i], particles.vx[i]);
            ctx.beginPath();
            ctx.ellipse(renderX, renderY, r * s, r / Math.sqrt(s), rot, 0, Math.PI * 2);
            ctx.fill();
          }
          continue;
        }

        // FASE CALIENTE: Rampa ASCII con Shimmer a 14Hz
        let glyphIndexVal = h * topRampIndex + 0.5;
        glyphIndexVal += (hash14Hz(i, dealCounter) - 0.5) * 1.6 * Math.min(1.0, h * 2);
        const glyphIdx = clamp(Math.floor(glyphIndexVal), 1, topRampIndex);

        if (h > 0.65) {
          ctx.fillStyle = paletteDef.primary;
        } else {
          ctx.fillStyle = paletteDef.secondary;
        }

        if (knobs.mode === "thinking") {
          const THINK_CHARS = ["0", "1", "?", "!", "#", "&", "*", "/", "λ", "π", "§", "%"];
          const tIdx = Math.floor(Math.abs(hash14Hz(i, dealCounter)) * THINK_CHARS.length) % THINK_CHARS.length;
          ctx.fillText(THINK_CHARS[tIdx], renderX, renderY);
        } else {
          ctx.fillText(ramp[glyphIdx], renderX, renderY);
        }
      }

      /* ── 3. OJOS BLOBATAR PUROS: 100% HUECOS VACÍOS NEGATIVOS (SIN NADA) ── */
      // No se dibuja NADA adentro de los ojos ni al estar abiertos ni cerrados.
      // Las partículas dentro de la elipse se omiten, y al parpadear la elipse
      // se aplasta verticalmente a una rendija negra natural, idéntico a Blobatar.

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      container.removeEventListener("mousemove", handlePointerMove);
      container.removeEventListener("mouseenter", handlePointerEnter);
      container.removeEventListener("mouseleave", handlePointerLeave);
      container.removeEventListener("mousedown", handlePointerDown);
      ro.disconnect();
    };
  }, [particleDensity, triggerBlink]);

  return (
    <div
      ref={containerRef}
      className={`ascii-blob-orb relative w-full h-full select-none overflow-hidden bg-black ${className}`}
      role="img"
      aria-label="Orbe Blobtar Biomorphic ASCII interactivo"
    >
      <canvas ref={canvasRef} className="ascii-blob-canvas block w-full h-full" />
    </div>
  );
}
