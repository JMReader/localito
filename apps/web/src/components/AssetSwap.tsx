"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Check, X } from "lucide-react";

/* ══ Asset swap (Unificado con Monedas Locales ASCII) ═════
   Two rounded slabs, one over the other, each holding a coin and
   an amount, and an arrow on the seam saying which way the swap
   goes. Press the arrow and it turns to point the other way.
   The slabs and the coins in them stay exactly where they are:
   only the direction changes, and the labels with it — whichever
   slab the arrow leaves is "Pagás", the one it points at is
   "Recibís".

   ── THE ARROW KEEPS TURNING ONE WAY ──────────────────────
   Half a turn every press, counted up rather than flipped
   between 0 and 180, so the second press carries on round
   instead of unwinding back the way it came.

   ── THE SLAB IS THE PICKER ───────────────────────────────
   Press a coin and the slab it sits in grows — the same element,
   its height animated — until it covers the whole block: the top
   slab down over the bottom one, the bottom slab up over the top.
   Its own face fades out and the list of coins loads inside it;
   pick one and it shrinks back to a slab. Nothing is laid over
   it and nothing replaces it. Picking
   the coin already on the other slab swaps the two, which is
   what every exchange does rather than allowing a coin for
   itself. */

const CARD = 128;
const GAP = 4;
const PITCH = CARD + GAP;
const H = CARD * 2 + GAP;

/* THE NUMBERS COME FROM THE COINS. The paying slab holds a round
   amount of whatever it is — a lot that is ordinary for that coin —
   and the receiving slab is what that buys at the two prices, less
   a 0.3% fee. Change either coin, or reverse the arrow, and both
   sides are worked out again. */
const FEE = 0.003;

export interface LocalAsciiCoin {
  id: string;
  sym: string;
  name: string;
  glyph: string;
  asciiTag: string;
  /** Valor de 1 unidad expresado en ARS */
  arsRate: number;
  /** Decimales mostrados al cotizar */
  dp: number;
  /** Lote base por defecto al pagar con esta moneda */
  lot: number;
  accentHex: string;
  highlightHex: string;
  shadowHex: string;
  change24h: string;
  defaultBalance: number;
  creditLineArs: number;
}

/* ── Catálogo Único de Monedas Locales & Twins ASCII (5 monedas para calzar en H) ── */
export const LOCAL_ASCII_COINS: LocalAsciiCoin[] = [
  {
    id: "prt",
    sym: "PRt",
    name: "Token Localito PRt",
    glyph: "P",
    asciiTag: "[::PRt::]",
    arsRate: 1,
    dp: 0,
    lot: 50000,
    accentHex: "#00DF1A",
    highlightHex: "#CFFF2E",
    shadowHex: "#005C0B",
    change24h: "1:1 ARS",
    defaultBalance: 950000,
    creditLineArs: 950000,
  },
  {
    id: "argt",
    sym: "ARGt",
    name: "Peso Digital Twin",
    glyph: "A",
    asciiTag: "[::A$::]",
    arsRate: 1,
    dp: 0,
    lot: 118000,
    accentHex: "#00D8EC",
    highlightHex: "#CFFAFE",
    shadowHex: "#064E5B",
    change24h: "1:1 ARS",
    defaultBalance: 485000,
    creditLineArs: 485000,
  },
  {
    id: "brat",
    sym: "BRAt",
    name: "Real Digital Twin",
    glyph: "R",
    asciiTag: "[::R$::]",
    arsRate: 235,
    dp: 2,
    lot: 500,
    accentHex: "#FFDF00",
    highlightHex: "#00DF1A",
    shadowHex: "#004D1C",
    change24h: "1:1 BRL",
    defaultBalance: 1840,
    creditLineArs: 430000,
  },
  {
    id: "usdt",
    sym: "USDT",
    name: "Tether USD",
    glyph: "₮",
    asciiTag: "[::₮::]",
    arsRate: 1180,
    dp: 2,
    lot: 100,
    accentHex: "#00DF1A",
    highlightHex: "#CFFF2E",
    shadowHex: "#005C0B",
    change24h: "+8.4% TNA",
    defaultBalance: 1420.5,
    creditLineArs: 850000,
  },
  {
    id: "usdc",
    sym: "USDC",
    name: "USD Coin",
    glyph: "$",
    asciiTag: "[::$::]",
    arsRate: 1180,
    dp: 2,
    lot: 100,
    accentHex: "#2775CA",
    highlightHex: "#93C5FD",
    shadowHex: "#103566",
    change24h: "+7.9% TNA",
    defaultBalance: 680.0,
    creditLineArs: 520000,
  },
];

const BY = Object.fromEntries(
  LOCAL_ASCII_COINS.map((c) => [c.sym, c])
) as Record<string, LocalAsciiCoin>;

/* ── Motor Mini-Moneda 3D ASCII en Canvas para los Slabs y el Picker ── */
export function AsciiCoinBadge({
  coin,
  size = 28,
  className = "",
}: {
  coin: LocalAsciiCoin;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    // Máscara del glifo central
    const maskSize = 48;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = maskSize;
    maskCanvas.height = maskSize;
    const mCtx = maskCanvas.getContext("2d")!;
    mCtx.fillStyle = "#000";
    mCtx.fillRect(0, 0, maskSize, maskSize);
    mCtx.fillStyle = "#fff";
    mCtx.textAlign = "center";
    mCtx.textBaseline = "middle";
    mCtx.font = '900 30px ui-monospace, "SF Mono", Consolas, monospace';
    mCtx.fillText(coin.glyph, maskSize / 2, maskSize / 2 + 1);
    const maskData = mCtx.getImageData(0, 0, maskSize, maskSize).data;

    const sampleEmblem = (u: number, v: number): number => {
      const mx = Math.floor((u * 0.5 + 0.5) * maskSize);
      const my = Math.floor((v * 0.5 + 0.5) * maskSize);
      if (mx < 0 || mx >= maskSize || my < 0 || my >= maskSize) return 0;
      return maskData[(my * maskSize + mx) * 4] / 255;
    };

    const ramp = " ·.:;+*#%@";
    const maxIdx = ramp.length - 1;
    let rafId = 0;

    const drawFrame = (now: number) => {
      rafId = requestAnimationFrame(drawFrame);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const yaw = Math.sin(now * 0.0018) * 0.36;
      const pitch = Math.cos(now * 0.0013) * 0.2;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);

      const cell = size <= 26 ? 3.1 : 3.4;
      const cols = Math.floor(size / cell);
      const rows = Math.floor(size / cell);
      const ox = (size - cols * cell) * 0.5;
      const oy = (size - rows * cell) * 0.5;
      const radius = size * 0.46;

      ctx.font = `700 ${cell + 1.2}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let r = 0; r < rows; r++) {
        const py = oy + (r + 0.5) * cell;
        const dy = py - size * 0.5;
        for (let c = 0; c < cols; c++) {
          const px = ox + (c + 0.5) * cell;
          const dx = px - size * 0.5;

          const lx = dx / Math.max(0.55, cosY) / radius;
          const ly = dy / Math.max(0.55, cosP) / radius;
          const distSq = lx * lx + ly * ly;
          if (distSq > 1.0) continue;

          const dist = Math.sqrt(distSq);
          const isRim = dist > 0.8;
          const emboss =
            dist < 0.76 ? sampleEmblem(lx / 0.72, ly / 0.72) : 0;

          const lum = Math.max(
            0.12,
            Math.min(
              1,
              0.34 +
                lx * 0.3 +
                sinY * 0.25 +
                (isRim ? 0.28 : 0) +
                emboss * 0.65
            )
          );
          const idx = Math.max(1, Math.min(maxIdx, Math.floor(lum * maxIdx)));

          if (emboss > 0.4) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText("@", px, py);
          } else if (isRim) {
            ctx.fillStyle = coin.highlightHex;
            ctx.fillText("#", px, py);
          } else {
            ctx.fillStyle = lum > 0.45 ? coin.accentHex : coin.shadowHex;
            ctx.fillText(ramp[idx], px, py);
          }
        }
      }
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [coin, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={`swp-logo rounded-full bg-[#090B0E] ${className}`}
      aria-hidden="true"
    />
  );
}

const formatUnits = (n: number, c: LocalAsciiCoin) =>
  n.toLocaleString("es-AR", {
    minimumFractionDigits: c.dp,
    maximumFractionDigits: c.dp,
  });

const formatArs = (n: number) =>
  `$ ${Math.round(n).toLocaleString("es-AR")} ARS`;

export interface SwapQuote {
  paySym: string;
  receiveSym: string;
  payRawAmount: number;
  receiveRawAmount: number;
  arsValue: number;
  usdValue: number;
}

export function Swap({
  /* initial pair of local coins */
  initialPair = ["ARGt", "USDT"],
  /* live balances from the wallet keyed by symbol */
  balances,
  /* how much the arrow overshoots as it turns, 0..100 */
  bounce = 30,
  /* the slabs' corner, px */
  corner = 24,
  /* callback for parent wallet */
  onQuoteChange,
}: {
  initialPair?: [string, string];
  balances?: Record<string, number>;
  bounce?: number;
  corner?: number;
  onQuoteChange?: (quote: SwapQuote) => void;
} = {}) {
  /* the coin in each slab, top then bottom */
  const [coins, setCoins] = useState<[string, string]>(() => {
    const a = BY[initialPair[0]] ? initialPair[0] : "ARGt";
    const b =
      BY[initialPair[1]] && initialPair[1] !== a
        ? initialPair[1]
        : a === "USDT"
        ? "ARGt"
        : "USDT";
    return [a, b];
  });

  /* Multiplicador rápido de lote (0.5x, 1x, o -1 = MAX saldo) */
  const [lotScale, setLotScale] = useState<number>(1);

  /* how many presses so far: even, the arrow points down */
  const [turns, setTurns] = useState(0);
  /* which slab is open as the picker */
  const [pick, setPick] = useState<number | null>(null);
  /* which slab is drawn over everything: the open one, and it stays
     on top until it has finished shrinking back, or it would slip
     under its neighbour halfway home */
  const [lifted, setLifted] = useState<number | null>(null);

  const up = turns % 2 === 1;
  const spring = {
    type: "spring" as const,
    duration: 0.6,
    bounce: (Math.min(100, Math.max(0, bounce)) / 100) * 0.5,
  };
  /* the slab's growth: firm, with only a breath of overshoot */
  const grow = { type: "spring" as const, duration: 0.6, bounce: 0.12 };
  /* the button's corner follows the slabs', capped at a circle */
  const r = Math.min(corner, 20);
  const payer = up ? 1 : 0;

  /* what each slab reads: the payer its coin's lot, the other what
     that lot buys after the fee, each with its own ARS value */
  const paid = BY[coins[payer]] || LOCAL_ASCII_COINS[0];
  const payerBalance = balances?.[paid.sym] ?? paid.defaultBalance;

  // Si lotScale es -1 significa "MAX" (100% del saldo disponible)
  const payAmount =
    lotScale === -1
      ? Math.max(paid.dp === 0 ? 1000 : 1, payerBalance)
      : paid.lot * lotScale;

  const valueArs = payAmount * paid.arsRate;

  const shown = (i: number) => {
    const c = BY[coins[i]] || LOCAL_ASCII_COINS[0];
    const vArs = i === payer ? valueArs : valueArs * (1 - FEE);
    const rawAmt = i === payer ? payAmount : vArs / c.arsRate;
    const coinBal = balances?.[c.sym] ?? c.defaultBalance;
    return {
      amount: formatUnits(rawAmt, c),
      fiat: formatArs(vArs),
      balanceText: `${formatUnits(coinBal, c)} ${c.sym}`,
    };
  };

  useEffect(() => {
    if (!onQuoteChange) return;
    const payCoin = BY[coins[payer]];
    const recCoin = BY[coins[1 - payer]];
    if (!payCoin || !recCoin) return;
    const recRaw = (valueArs * (1 - FEE)) / recCoin.arsRate;
    onQuoteChange({
      paySym: payCoin.sym,
      receiveSym: recCoin.sym,
      payRawAmount: payAmount,
      receiveRawAmount: recRaw,
      arsValue: valueArs,
      usdValue: valueArs / 1180,
    });
  }, [coins, payer, payAmount, valueArs, onQuoteChange]);

  const open = (slot: number) => {
    setPick(slot);
    setLifted(slot);
  };

  const choose = (sym: string) => {
    if (pick === null) return;
    const slot = pick,
      other = 1 - pick;
    setCoins((c) => {
      const next: [string, string] = [c[0], c[1]];
      /* the coin already on the other slab trades places with this one */
      if (c[other] === sym) next[other] = c[slot];
      next[slot] = sym;
      return next;
    });
    setPick(null);
  };

  /* Escape shuts the picker */
  useEffect(() => {
    if (pick === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setPick(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [pick]);

  return (
    <div
      className="swp w-full"
      data-fill="dark"
      data-stroke="on"
      style={{
        height: H,
        ["--swp-r" as string]: `${corner}px`,
      }}
    >
      {coins.map((sym, i) => {
        const coin = BY[sym] || LOCAL_ASCII_COINS[0];
        const on = pick === i;
        /* the OTHER slab, while this one's neighbour is open */
        const squeezed = pick !== null && !on;
        /* the slab's role, which the picker keeps as its heading — it
           is the same slab, still saying what it is for */
        const isPayerSlab = i === payer;
        const role = isPayerSlab ? "Pagás" : "Recibís";
        const info = shown(i);

        return (
          <motion.div
            key={i}
            className="swp-card"
            data-lifted={lifted === i || undefined}
            initial={false}
            /* THE SLAB IS THE PICKER: the same element, its height
               grown to the whole block — down from the top slab, up
               from the bottom one */
            animate={{
              top: on ? 0 : i * PITCH,
              height: on ? H : CARD,
              /* the neighbour is SQUEEZED: pressed toward its far edge
                 by the slab growing into it. Flattened on the same
                 curve that grows the open slab, so its near edge stays
                 just ahead of the growing one instead of being run
                 over — it visibly gives, then fades out before it is
                 flat */
              scaleY: squeezed ? 0.02 : 1,
              opacity: squeezed ? 0 : 1,
            }}
            style={{ transformOrigin: i === 0 ? "50% 0%" : "50% 100%" }}
            transition={{
              default: grow,
              /* no overshoot here: past flat a scale turns inside out */
              scaleY: { type: "spring", duration: 0.6, bounce: 0 },
              opacity: squeezed
                ? { delay: 0.1, duration: 0.16 }
                : { delay: 0.06, duration: 0.22 },
            }}
            /* lowered only when a SHRINK lands: the open finishing can
               report in after a close has already started */
            onAnimationComplete={(d) => {
              if ((d as { height?: number }).height === CARD && pick === null)
                setLifted((l) => (l === i ? null : l));
            }}
            role={on ? "dialog" : undefined}
            aria-label={on ? `${role}: elegir moneda local` : undefined}
          >
            {/* what the slab shows: pinned to the edge the slab grows
                away from, so it never moves; it fades as the list
                arrives and comes back as the slab shuts */}
            <motion.div
              className="swp-face"
              style={i === 0 ? { top: 0 } : { bottom: 0 }}
              initial={false}
              animate={{ opacity: on ? 0 : 1 }}
              transition={
                on ? { duration: 0.16 } : { delay: 0.14, duration: 0.22 }
              }
              aria-hidden={on || undefined}
            >
              {/* Fila superior del slab: Rol + Saldo real / Multiplicadores rápidos */}
              <div className="swp-top-bar">
                <span className="swp-label">{role}</span>
                <div className="flex items-center gap-1.5">
                  {isPayerSlab && (
                    <div className="flex items-center gap-1 mr-1">
                      {(
                        [
                          { k: 0.5, label: "½" },
                          { k: 1, label: "1x" },
                          { k: -1, label: "MAX" },
                        ] as const
                      ).map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setLotScale(preset.k)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                            lotScale === preset.k
                              ? "bg-[#00DF1A]/20 text-[#00DF1A] border border-[#00DF1A]/40"
                              : "bg-white/5 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                    Disp: {info.balanceText}
                  </span>
                </div>
              </div>

              <motion.span
                key={`${coin.sym}-${info.amount}`}
                initial={{ opacity: 0.5, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                className="swp-amount"
              >
                {info.amount}
              </motion.span>
              <span className="swp-fiat">
                {info.fiat} ·{" "}
                <span
                  className="font-mono"
                  style={{ color: coin.accentHex }}
                >
                  {coin.asciiTag}
                </span>
              </span>

              <button
                type="button"
                className="swp-coin"
                onClick={() => open(i)}
                tabIndex={pick === null ? 0 : -1}
                aria-label={`${coin.name}. Elegir otra moneda local`}
              >
                <AsciiCoinBadge coin={coin} size={26} />
                <span>{coin.sym}</span>
              </button>
            </motion.div>

            {/* the list loads inside once the slab is mostly open,
                and goes before it starts to shut */}
            <AnimatePresence>
              {on && (
                <motion.div
                  className="swp-pick-in"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { delay: 0.1, duration: 0.22 },
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.16 } }}
                >
                  <div className="swp-pick-head">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                      {role} · Monedas Locales ASCII
                    </span>
                    <button
                      type="button"
                      className="swp-pick-x"
                      onClick={() => setPick(null)}
                      aria-label="Cerrar selector"
                    >
                      <X size={16} strokeWidth={2} />
                    </button>
                  </div>
                  {LOCAL_ASCII_COINS.map((c) => {
                    const bal = balances?.[c.sym] ?? c.defaultBalance;
                    const isCurrent = coins[i] === c.sym;
                    return (
                      <button
                        key={c.sym}
                        type="button"
                        className="swp-pick-row"
                        onClick={() => choose(c.sym)}
                      >
                        <AsciiCoinBadge coin={c} size={26} />
                        <span className="swp-pick-sym">{c.sym}</span>
                        <span
                          className="font-mono text-[11px]"
                          style={{ color: c.accentHex }}
                        >
                          {c.asciiTag}
                        </span>
                        <span className="swp-pick-name truncate">
                          {c.name}
                        </span>
                        <span className="ml-auto font-mono text-[11px] text-zinc-400 tabular-nums mr-1">
                          {formatUnits(bal, c)}
                        </span>
                        {isCurrent && (
                          <Check
                            className="swp-pick-on text-[#00DF1A]"
                            size={16}
                            strokeWidth={2.5}
                          />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
      <motion.button
        type="button"
        className="swp-flip"
        style={{ borderRadius: r }}
        initial={false}
        /* the arrow leaves as soon as a slab starts to open, and only
           comes back once that slab is home — lifted clears when
           the shrink lands, not when the close is asked for */
        animate={{
          rotate: turns * 180,
          scale: lifted === null ? 1 : 0.5,
          opacity: lifted === null ? 1 : 0,
        }}
        transition={{
          default: spring,
          scale:
            lifted === null
              ? { type: "spring", duration: 0.42, bounce: 0.35 }
              : { duration: 0.16 },
          opacity: { duration: lifted === null ? 0.18 : 0.1 },
        }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setTurns((n) => n + 1);
        }}
        tabIndex={pick === null ? 0 : -1}
        aria-label={`Pagando ${coins[payer]} por ${coins[1 - payer]}. Invertir sentido`}
      >
        <ArrowDown size={18} strokeWidth={2.3} />
      </motion.button>
    </div>
  );
}

export { Swap as AssetSwap };
export default Swap;
