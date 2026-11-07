"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import gsap from "gsap";
import {
  Pin,
  Columns,
  RotateCcw,
  Check,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Link2,
  ShieldCheck,
  Clock,
  Lock,
  Unlock,
  ArrowLeftRight,
  Sparkles,
  MoveHorizontal,
} from "lucide-react";
import {
  GlyphRampKey,
  ASCII_RAMPS,
  SupportedCurrency,
  VaultRecord,
} from "@/lib/mock-vaults-data";

export type PilarDensity = "compacta" | "normal" | "comoda";

export interface PilarColumnConfig {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  align?: "left" | "right" | "center";
  responsiveClass?: string;
}

const DEFAULT_COLUMNS: PilarColumnConfig[] = [
  {
    id: "id",
    label: "ID Bóveda",
    width: 118,
    minWidth: 96,
    maxWidth: 190,
    align: "left",
  },
  {
    id: "title",
    label: "Acuerdo / Entregable",
    width: 275,
    minWidth: 180,
    maxWidth: 450,
    align: "left",
  },
  {
    id: "amount",
    label: "Plata Bloqueada",
    width: 158,
    minWidth: 126,
    maxWidth: 240,
    align: "right",
  },
  {
    id: "currency",
    label: "Stablecoin",
    width: 112,
    minWidth: 92,
    maxWidth: 165,
    align: "center",
  },
  {
    id: "progress",
    label: "Criterios Notion",
    width: 150,
    minWidth: 122,
    maxWidth: 220,
    align: "left",
  },
  {
    id: "oracle",
    label: "Motor Oráculo",
    width: 175,
    minWidth: 130,
    maxWidth: 280,
    align: "left",
    responsiveClass: "col-hide-md",
  },
  {
    id: "status",
    label: "Estado Custodia",
    width: 164,
    minWidth: 138,
    maxWidth: 230,
    align: "left",
  },
];

const DEFAULT_PINNED = ["id"];
const DEFAULT_PANEL_WIDTH = 430;
const STORAGE_KEY_WIDTH = "criterialock_costado_width";

export interface PilarCostadoExplorerProps {
  vaults: VaultRecord[];
  onUpdateVault?: (updated: VaultRecord) => void;
  glyphRamp: GlyphRampKey;
  selectedVaultId?: string | null;
  onSelectVaultId?: (id: string | null) => void;
}

/* Generador determinista de sello visual ASCII a partir de la semilla de la bóveda */
function generateVaultAsciiStamp(
  seed: string,
  rampKey: GlyphRampKey,
  isUnlocked: boolean
): string[] {
  const ramp = ASCII_RAMPS[rampKey] || ASCII_RAMPS.Classic;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const rows = 5;
  const cols = 24;
  const lines: string[] = [];

  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      // Simetría axial tipo escudo / sello criptográfico
      const mirrorC = c < cols / 2 ? c : cols - 1 - c;
      const cellHash = Math.abs(
        Math.imul(hash ^ (r * 31 + mirrorC * 17), 1597334677)
      );
      const distFromCenter =
        Math.abs(r - (rows - 1) / 2) / 2.5 +
        Math.abs(c - (cols - 1) / 2) / (cols / 2);

      if (distFromCenter > 1.15) {
        line += " ";
      } else {
        const idx =
          1 + (cellHash % Math.max(1, ramp.length - (isUnlocked ? 1 : 2)));
        line += ramp[Math.min(ramp.length - 1, idx)];
      }
    }
    lines.push(line);
  }
  return lines;
}

export function PilarCostadoExplorer({
  vaults,
  onUpdateVault,
  glyphRamp,
  selectedVaultId: controlledVaultId,
  onSelectVaultId,
}: PilarCostadoExplorerProps) {
  // ── 1. Estado de la Tabla Dinámica «Pilar» (UI-01) ──────────────────────
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    DEFAULT_COLUMNS.map((c) => c.id)
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(DEFAULT_COLUMNS.map((c) => [c.id, c.width]))
  );
  const [pinnedCols, setPinnedCols] = useState<string[]>(DEFAULT_PINNED);
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  const [density, setDensity] = useState<PilarDensity>("normal");

  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [shakeColId, setShakeColId] = useState<string | null>(null);
  const [justPinnedId, setJustPinnedId] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Filtros de búsqueda y moneda
  const [searchQuery, setSearchQuery] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<
    "ALL" | SupportedCurrency
  >("ALL");

  // Estado de redimensión activa de columna (.pi-guia)
  const [resizingState, setResizingState] = useState<{
    colId: string;
    startX: number;
    startWidth: number;
    currentWidth: number;
    guideLeftPx: number;
    initialLeftPx: number;
    hitLimit: boolean;
  } | null>(null);

  // Estado de arrastre / reordenamiento de columnas (FLIP)
  const [draggedColId, setDraggedColId] = useState<string | null>(null);

  // Mensaje para lectores de pantalla (aria-live)
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  // ── 2. Estado del Panel Maestro-Detalle «Costado» (UI-02) ───────────────
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    "TW-8841"
  );
  const activeVaultId =
    controlledVaultId !== undefined ? controlledVaultId : internalSelectedId;

  const setActiveVaultId = useCallback(
    (id: string | null, useReplace = false) => {
      if (onSelectVaultId) {
        onSelectVaultId(id);
      } else {
        setInternalSelectedId(id);
      }

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (id) {
          url.searchParams.set("vault", id);
        } else {
          url.searchParams.delete("vault");
        }
        if (useReplace) {
          window.history.replaceState({ vault: id }, "", url.toString());
        } else {
          window.history.pushState({ vault: id }, "", url.toString());
        }
      }
    },
    [onSelectVaultId]
  );

  const [panelWidth, setPanelWidth] = useState<number>(DEFAULT_PANEL_WIDTH);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isTransitioningDetail, setIsTransitioningDetail] = useState(false);

  const tableWrapRef = useRef<HTMLDivElement>(null);
  const tableElRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Cargar ancho persistido de Costado y leer ?vault=... inicial
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedW = window.localStorage.getItem(STORAGE_KEY_WIDTH);
    if (savedW) {
      const parsed = parseInt(savedW, 10);
      if (!Number.isNaN(parsed) && parsed >= 340 && parsed <= 600) {
        setPanelWidth(parsed);
      }
    }
    const params = new URLSearchParams(window.location.search);
    const vaultParam = params.get("vault");
    if (vaultParam && vaults.some((v) => v.id === vaultParam)) {
      setInternalSelectedId(vaultParam);
    }
  }, [vaults]);

  // ── 3. Filtrado de Bóvedas ──────────────────────────────────────────────
  const filteredVaults = useMemo(() => {
    return vaults.filter((v) => {
      const matchesCur =
        currencyFilter === "ALL" || v.currency === currencyFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCur;
      return (
        matchesCur &&
        (v.id.toLowerCase().includes(q) ||
          v.title.toLowerCase().includes(q) ||
          v.clientName.toLowerCase().includes(q) ||
          v.beneficiaryName.toLowerCase().includes(q) ||
          v.oracleEngine.toLowerCase().includes(q))
      );
    });
  }, [vaults, currencyFilter, searchQuery]);

  const selectedVault = useMemo(
    () => vaults.find((v) => v.id === activeVaultId) || null,
    [vaults, activeVaultId]
  );

  // ── 4. Orden Efectivo de Columnas (Fijadas primero, luego móviles visibles) ─
  const visibleOrderedColumns = useMemo(() => {
    const visibleIds = columnOrder.filter((id) => !hiddenCols.includes(id));
    const pinned = visibleIds.filter((id) => pinnedCols.includes(id));
    const unpinned = visibleIds.filter((id) => !pinnedCols.includes(id));
    const finalIds = [...pinned, ...unpinned];

    return finalIds.map((id) => {
      const base = DEFAULT_COLUMNS.find((c) => c.id === id)!;
      return {
        ...base,
        width: columnWidths[id] ?? base.width,
        isPinned: pinnedCols.includes(id),
      };
    });
  }, [columnOrder, hiddenCols, pinnedCols, columnWidths]);

  // Offsets acumulados para position: sticky en columnas fijadas
  const stickyOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    let acc = 0;
    for (const col of visibleOrderedColumns) {
      if (col.isPinned) {
        offsets[col.id] = acc;
        acc += col.width;
      }
    }
    return offsets;
  }, [visibleOrderedColumns]);

  const lastPinnedColId = useMemo(() => {
    const pinned = visibleOrderedColumns.filter((c) => c.isPinned);
    return pinned.length > 0 ? pinned[pinned.length - 1].id : null;
  }, [visibleOrderedColumns]);

  // Detectar si la tabla fue personalizada respecto al estado de fábrica
  const isDirty = useMemo(() => {
    if (density !== "normal") return true;
    if (hiddenCols.length > 0) return true;
    if (
      pinnedCols.length !== DEFAULT_PINNED.length ||
      pinnedCols[0] !== DEFAULT_PINNED[0]
    )
      return true;
    if (columnOrder.some((id, i) => id !== DEFAULT_COLUMNS[i].id)) return true;
    if (
      DEFAULT_COLUMNS.some((c) => (columnWidths[c.id] ?? c.width) !== c.width)
    )
      return true;
    return false;
  }, [density, hiddenCols, pinnedCols, columnOrder, columnWidths]);

  // ── 5. Acciones de «Pilar»: Fijar, Ocultar, Redimensionar, Reordenar, Restablecer ─
  const handleTogglePin = (colId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlyPinned = pinnedCols.includes(colId);
    setPinnedCols((prev) =>
      isCurrentlyPinned ? prev.filter((id) => id !== colId) : [...prev, colId]
    );

    if (!isCurrentlyPinned) {
      setJustPinnedId(colId);
      setTimeout(() => setJustPinnedId(null), 750);

      // Microinteracción elástica de Pilar al fijar columna
      if (tableElRef.current) {
        gsap.fromTo(
          tableElRef.current,
          { x: 9 },
          { x: 0, duration: 0.48, ease: "back.out(2.4)" }
        );
      }
    }

    const colName =
      DEFAULT_COLUMNS.find((c) => c.id === colId)?.label || colId;
    setLiveAnnouncement(
      isCurrentlyPinned
        ? `Columna ${colName} desanclada`
        : `Columna ${colName} fijada a la izquierda`
    );
  };

  const handleToggleColumnVisibility = (colId: string) => {
    const isHidden = hiddenCols.includes(colId);
    const visibleCount = DEFAULT_COLUMNS.length - hiddenCols.length;

    // Resguardo de Pilar: nunca permitir ocultar la última columna visible
    if (!isHidden && visibleCount <= 1) {
      setShakeColId(colId);
      setTimeout(() => setShakeColId(null), 420);
      setLiveAnnouncement("Debe quedar al menos una columna visible");
      return;
    }

    setHiddenCols((prev) =>
      isHidden ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleMoveColumn = (colId: string, delta: -1 | 1) => {
    setColumnOrder((prev) => {
      const idx = prev.indexOf(colId);
      if (idx < 0) return prev;
      const targetIdx = idx + delta;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const handleAutoFitColumn = (colId: string) => {
    const base = DEFAULT_COLUMNS.find((c) => c.id === colId);
    if (!base) return;
    // Calcula ancho óptimo según el contenido más largo de esa columna
    let maxChars = base.label.length + 4;
    for (const v of filteredVaults) {
      const val =
        colId === "id"
          ? v.id
          : colId === "title"
          ? v.title
          : colId === "amount"
          ? `${v.amountFormatted} ${v.currency}`
          : colId === "oracle"
          ? v.oracleEngine
          : v.status;
      if (val.length > maxChars) maxChars = val.length;
    }
    const targetW = Math.min(
      base.maxWidth,
      Math.max(base.minWidth, maxChars * 8.2 + 28)
    );
    setColumnWidths((prev) => ({ ...prev, [colId]: Math.round(targetW) }));
    setLiveAnnouncement(
      `Columna ${base.label} autoajustada a ${Math.round(targetW)} píxeles`
    );
  };

  const handleResetPilar = () => {
    setColumnOrder(DEFAULT_COLUMNS.map((c) => c.id));
    setColumnWidths(
      Object.fromEntries(DEFAULT_COLUMNS.map((c) => [c.id, c.width]))
    );
    setPinnedCols(DEFAULT_PINNED);
    setHiddenCols([]);
    setDensity("normal");
    setResetSuccess(true);
    setLiveAnnouncement("Diseño de tabla restablecido a valores originales");
    setTimeout(() => setResetSuccess(false), 1800);
  };

  // Inicio de arrastre de ancho de columna (.pi-borde)
  const startColumnResize = (
    colId: string,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const base = DEFAULT_COLUMNS.find((c) => c.id === colId);
    if (!base || !tableElRef.current) return;

    const headerCell = e.currentTarget.parentElement;
    if (!headerCell) return;

    const tableRect = tableElRef.current.getBoundingClientRect();
    const cellRect = headerCell.getBoundingClientRect();
    const startW = columnWidths[colId] ?? base.width;
    const initialGuideX = cellRect.right - tableRect.left;

    setResizingState({
      colId,
      startX: e.clientX,
      startWidth: startW,
      currentWidth: startW,
      guideLeftPx: initialGuideX,
      initialLeftPx: initialGuideX,
      hitLimit: false,
    });

    const onMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - e.clientX;
      const rawW = startW + dx;
      const clampedW = Math.min(
        base.maxWidth,
        Math.max(base.minWidth, Math.round(rawW))
      );
      const hitLimit = rawW <= base.minWidth || rawW >= base.maxWidth;
      const newGuideX = cellRect.left - tableRect.left + clampedW;

      setColumnWidths((prev) => ({ ...prev, [colId]: clampedW }));
      setResizingState((prev) =>
        prev
          ? {
              ...prev,
              currentWidth: clampedW,
              guideLeftPx: newGuideX,
              hitLimit,
            }
          : null
      );
    };

    const onUp = () => {
      setResizingState(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── 6. Acciones de «Costado»: Recorrer con j/k, AbortController y Redimensión ─
  const navigateVaultByDelta = useCallback(
    (delta: number) => {
      if (filteredVaults.length === 0) return;
      // Cancelar cualquier transición previa en curso (Patrón AbortController de Costado)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const currentIdx = filteredVaults.findIndex(
        (v) => v.id === activeVaultId
      );
      const nextIdx =
        currentIdx < 0
          ? 0
          : (currentIdx + delta + filteredVaults.length) %
            filteredVaults.length;
      const nextVault = filteredVaults[nextIdx];

      setIsTransitioningDetail(true);
      setActiveVaultId(nextVault.id, true);

      const rowEl = rowRefs.current[nextVault.id];
      rowEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });

      setTimeout(() => {
        if (!controller.signal.aborted) {
          setIsTransitioningDetail(false);
        }
      }, 90);
    },
    [filteredVaults, activeVaultId, setActiveVaultId]
  );

  // Atajos globales de teclado j / k / Esc cuando el usuario explora bóvedas
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!activeVaultId) return;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        navigateVaultByDelta(1);
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        navigateVaultByDelta(-1);
      } else if (e.key === "Escape") {
        if (colMenuOpen) {
          setColMenuOpen(false);
        } else {
          setActiveVaultId(null);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeVaultId, colMenuOpen, navigateVaultByDelta, setActiveVaultId]);

  // Redimensión del separador del panel lateral Costado
  const startPanelResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizingPanel(true);
    const startX = e.clientX;
    const startW = panelWidth;

    const onMove = (moveEv: PointerEvent) => {
      const dx = startX - moveEv.clientX;
      const nextW = Math.min(600, Math.max(340, Math.round(startW + dx)));
      setPanelWidth(nextW);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY_WIDTH, String(nextW));
      }
    };

    const onUp = () => {
      setIsResizingPanel(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Aprobar el criterio pendiente de una bóveda directamente desde el Inspector Costado
  const handleVerifyFromInspector = (vault: VaultRecord, critId: string) => {
    const updatedCriteria = vault.criteriaList.map((c) =>
      c.id === critId
        ? {
            ...c,
            status:
              c.status === "verified"
                ? ("pending" as const)
                : ("verified" as const),
            verifiedBlock:
              c.status === "verified" ? undefined : "Bloque #49,201,790",
          }
        : c
    );
    const passed = updatedCriteria.filter(
      (c) => c.status === "verified"
    ).length;
    const total = updatedCriteria.length;
    const allDone = passed === total;

    const updatedVault: VaultRecord = {
      ...vault,
      criteriaList: updatedCriteria,
      criteriaPassed: passed,
      status: allDone ? "LIBERADO" : "CUSTODIA_ACTIVA",
      activityTimeline: [
        {
          time: "Ahora",
          title: allDone
            ? `PLATA LIBERADA (${vault.amountFormatted} ${vault.currency})`
            : `Actualización de criterio (${passed}/${total} OK)`,
          detail: "Firmado desde el Inspector Costado en Avalanche C-Chain",
          isHighlight: true,
        },
        ...vault.activityTimeline,
      ],
    };

    onUpdateVault?.(updatedVault);
  };

  // Copiar link profundo (?vault=TW-XXXX) con onda de Costado
  const handleCopyDeepLink = () => {
    if (!selectedVault || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("vault", selectedVault.id);
    navigator.clipboard?.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const rowHeightPx =
    density === "compacta" ? 38 : density === "normal" ? 50 : 64;

  const densityIndex =
    density === "compacta" ? 0 : density === "normal" ? 1 : 2;

  return (
    <section
      id="explorador-pilar"
      aria-labelledby="pilar-costado-heading"
      className="relative w-full py-16 sm:py-24 border-b border-[#18181b] bg-[#000000]"
    >
      {/* Región viva para accesibilidad WAI-ARIA */}
      <div className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* ── Encabezado Limpio de Gran Escala ── */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="font-mono text-xs uppercase tracking-widest text-pinterest-bright block mb-3">
            04 // Explorador de Bóvedas («Pilar» × «Costado»)
          </span>
          <h2
            id="pilar-costado-heading"
            className="text-[clamp(2.2rem,4.5vw,3.8rem)] font-semibold tracking-[-0.03em] text-white leading-[1.04]"
          >
            Bóvedas activas en tiempo real.{" "}
            <span className="text-zinc-400 font-normal">
              Tocá cualquier fila para auditar su custodia.
            </span>
          </h2>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            VENTANA MAESTRA UNIFICADA (PILAR TABLE + COSTADO MASTER-DETAIL)
            ══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-b border-zinc-900 overflow-hidden">
          {/* ── BARRA DE HERRAMIENTAS DE «PILAR» ── */}
          <div
            role="toolbar"
            aria-label="Controles de la tabla dinámica Pilar"
            className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-[#0d0d10] border-b border-[#1f1f23]"
          >
            {/* Izquierda: Buscador + Filtro Rápido de Stablecoins */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
              <div className="relative flex items-center bg-[#000000] border border-[#27272a] focus-within:border-[var(--accent-bright)] rounded-xl px-3 h-9 w-full sm:w-64 transition-colors">
                <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar ID, cliente, acuerdo..."
                  className="w-full bg-transparent font-mono text-xs text-white placeholder:text-zinc-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-zinc-400 hover:text-white ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filtro por Moneda con el Color Principal de Pinterest */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#000000] border border-[#27272a] font-mono text-[11px]">
                {(["ALL", "ARGt", "USDT", "USDC", "BRAt"] as const).map(
                  (cur) => {
                    const isActive = currencyFilter === cur;
                    return (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => setCurrencyFilter(cur)}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          isActive
                            ? "bg-pinterest-primary font-bold"
                            : "text-zinc-300 hover:text-white"
                        }`}
                      >
                        {cur === "ALL" ? "Todas" : cur}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Derecha: Controles Nativos de «Pilar» (Columnas, Densidad en Ola, Restablecer) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* 1. Menú Desplegable de Visibilidad de Columnas */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColMenuOpen((prev) => !prev)}
                  aria-expanded={colMenuOpen}
                  className={`inline-flex items-center gap-2 h-9 px-3 rounded-xl border font-mono text-xs transition-all cursor-pointer ${
                    colMenuOpen
                      ? "bg-white text-black border-white font-semibold"
                      : "bg-[#000000] text-zinc-200 border-[#27272a] hover:border-zinc-500"
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Columnas</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] tabular-nums ${
                      colMenuOpen
                        ? "bg-black/15 text-black"
                        : "bg-[#141418] text-zinc-400"
                    }`}
                  >
                    {DEFAULT_COLUMNS.length - hiddenCols.length}/
                    {DEFAULT_COLUMNS.length}
                  </span>
                </button>

                {colMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Columnas visibles"
                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 rounded-2xl bg-[#0d0d10] border border-[#27272a] p-2.5 shadow-2xl"
                  >
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-[#1f1f23] font-mono text-[10px] text-zinc-400 uppercase">
                      <span>Visibilidad y Ancho</span>
                      <span>Píxeles</span>
                    </div>
                    <ul className="space-y-1 max-h-64 overflow-y-auto">
                      {DEFAULT_COLUMNS.map((col) => {
                        const isVisible = !hiddenCols.includes(col.id);
                        const isPinned = pinnedCols.includes(col.id);
                        const isShaking = shakeColId === col.id;
                        return (
                          <li key={col.id}>
                            <button
                              type="button"
                              role="menuitemcheckbox"
                              aria-checked={isVisible}
                              onClick={() =>
                                handleToggleColumnVisibility(col.id)
                              }
                              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                isShaking ? "animate-shake-no bg-zinc-900" : ""
                              } ${
                                isVisible
                                  ? "text-white hover:bg-[#141418]"
                                  : "text-zinc-500 hover:bg-[#141418]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                    isVisible
                                      ? "bg-white text-black border-white"
                                      : "bg-black border-zinc-700"
                                  }`}
                                >
                                  {isVisible && (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  )}
                                </span>
                                <span className="truncate font-medium">
                                  {col.label}
                                </span>
                                {isPinned && (
                                  <Pin className="w-3 h-3 text-white shrink-0 fill-white" />
                                )}
                              </div>
                              <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                                {columnWidths[col.id] ?? col.width}px
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1f1f23] px-2 font-mono text-[11px]">
                      <span className="text-zinc-500">
                        {DEFAULT_COLUMNS.length - hiddenCols.length} activas
                      </span>
                      <button
                        type="button"
                        disabled={hiddenCols.length === 0}
                        onClick={() => setHiddenCols([])}
                        className="text-white hover:underline disabled:opacity-40 cursor-pointer"
                      >
                        Mostrar todas
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Selector de Densidad en Ola (Cascading Wave Density de Pilar) */}
              <div
                role="radiogroup"
                aria-label="Densidad de filas"
                className="relative grid grid-cols-3 items-center p-1 h-9 w-56 rounded-xl bg-[#000000] border border-[#27272a] select-none isolation-auto"
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: "calc((100% - 8px) / 3)",
                    transform: `translateX(calc(${densityIndex} * 100%))`,
                    transition:
                      "transform 0.5s cubic-bezier(0.34, 1.4, 0.64, 1)",
                  }}
                  className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg bg-pinterest-primary"
                />
                {(
                  [
                    { id: "compacta", label: "Compacta" },
                    { id: "normal", label: "Normal" },
                    { id: "comoda", label: "Cómoda" },
                  ] as const
                ).map((d) => {
                  const isSelected = density === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setDensity(d.id)}
                      className={`relative z-10 text-[11px] font-mono transition-colors cursor-pointer ${
                        isSelected
                          ? "text-[var(--accent-ink)] font-bold"
                          : "text-zinc-300 hover:text-white"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>

              {/* 3. Botón «Restablecer» con Punto Indicador y Check Animado */}
              <button
                type="button"
                disabled={!isDirty && !resetSuccess}
                onClick={handleResetPilar}
                className={`inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl border font-mono text-xs transition-all cursor-pointer ${
                  resetSuccess
                    ? "bg-[#1FE05A] text-black border-white font-bold"
                    : isDirty
                    ? "bg-[#141418] text-white border-pinterest-accent hover:border-white"
                    : "bg-[#000000] text-zinc-400 border-[#1f1f23] opacity-55 cursor-default"
                }`}
              >
                {resetSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Restablecido</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer</span>
                    {isDirty && (
                      <span className="w-2 h-2 rounded-full bg-pinterest-primary" />
                    )}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── CUERPO DIVIDIDO: TABLA PILAR (IZQUIERDA) + PANEL COSTADO (DERECHA) ── */}
          <div className="relative flex flex-col lg:flex-row min-h-[520px] bg-[#050507]">
            {/* ════════════════════════════════════════════════════════════════
                MITAD IZQUIERDA: TABLA DINÁMICA «PILAR» CON CONTAINER QUERIES
                ════════════════════════════════════════════════════════════════ */}
            <div
              ref={tableWrapRef}
              className="costado-table-container relative flex-1 min-w-0 overflow-x-auto"
            >
              <div
                ref={tableElRef}
                className="relative min-w-full w-max select-none"
              >
                {/* Guía Vertical de Redimensión en Vivo (.pi-guia) con Color Principal de Pinterest */}
                {resizingState && (
                  <>
                    <div
                      aria-hidden="true"
                      style={{ left: `${resizingState.initialLeftPx}px` }}
                      className="pointer-events-none absolute top-0 bottom-0 z-30 border-l border-dashed border-zinc-500"
                    />
                    <div
                      aria-hidden="true"
                      style={{ left: `${resizingState.guideLeftPx}px` }}
                      className="pointer-events-none absolute top-0 bottom-0 z-40 w-[2px] bg-[var(--accent-bright)] shadow-[0_0_20px_var(--accent-glow)]"
                    >
                      <span
                        className={`absolute top-12 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold tabular-nums whitespace-nowrap shadow-xl ${
                          resizingState.hitLimit
                            ? "bg-amber-400 text-black scale-105"
                            : "bg-pinterest-primary"
                        }`}
                      >
                        {resizingState.currentWidth} px
                      </span>
                    </div>
                  </>
                )}

                {/* ── FILA DE ENCABEZADOS DE «PILAR» ── */}
                <div
                  role="row"
                  className="sticky top-0 z-20 flex items-center h-11 bg-[#0d0d10] border-b border-[#27272a] font-mono text-[11px] uppercase tracking-wider text-zinc-400"
                >
                  {visibleOrderedColumns.map((col) => {
                    const isPinned = col.isPinned;
                    const isLastPinned = col.id === lastPinnedColId;
                    const isBeingDragged = draggedColId === col.id;
                    const stickyLeft = isPinned
                      ? stickyOffsets[col.id] ?? 0
                      : undefined;

                    return (
                      <div
                        key={col.id}
                        role="columnheader"
                        tabIndex={0}
                        draggable
                        onDragStart={() => setDraggedColId(col.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedColId && draggedColId !== col.id) {
                            setColumnOrder((prev) => {
                              const copy = [...prev];
                              const fromIdx = copy.indexOf(draggedColId);
                              const toIdx = copy.indexOf(col.id);
                              if (fromIdx < 0 || toIdx < 0) return prev;
                              const [moved] = copy.splice(fromIdx, 1);
                              copy.splice(toIdx, 0, moved);
                              return copy;
                            });
                            setLiveAnnouncement(
                              `Columna reordenada junto a ${col.label}`
                            );
                          }
                          setDraggedColId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.altKey && e.key === "ArrowLeft") {
                            e.preventDefault();
                            handleMoveColumn(col.id, -1);
                          } else if (e.altKey && e.key === "ArrowRight") {
                            e.preventDefault();
                            handleMoveColumn(col.id, 1);
                          } else if (e.key === "p" || e.key === "P") {
                            e.preventDefault();
                            handleTogglePin(col.id, e as unknown as React.MouseEvent);
                          }
                        }}
                        style={{
                          width: `${col.width}px`,
                          left:
                            stickyLeft !== undefined
                              ? `${stickyLeft}px`
                              : undefined,
                        }}
                        className={`group relative flex items-center justify-between h-full px-3.5 shrink-0 border-r border-[#18181b] transition-colors focus-visible:outline-none focus-visible:bg-[#141418] ${
                          col.responsiveClass || ""
                        } ${
                          isPinned
                            ? "sticky z-20 bg-[#101014] text-white shadow-[inset_0_-2px_0_#ffffff]"
                            : "bg-[#0d0d10] hover:bg-[#141418]"
                        } ${
                          isLastPinned
                            ? "after:content-[''] after:absolute after:top-0 after:bottom-0 after:left-full after:w-4 after:bg-gradient-to-r after:from-black/70 after:to-transparent after:pointer-events-none"
                            : ""
                        } ${isBeingDragged ? "opacity-50 scale-[0.98]" : ""}`}
                      >
                        <span className="truncate font-semibold cursor-grab active:cursor-grabbing">
                          {col.label}
                        </span>

                        {/* Controles de Cabecera: Mover y Chincheta (Pin) */}
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveColumn(col.id, -1);
                            }}
                            title="Mover columna a la izquierda (Alt + ←)"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-opacity cursor-pointer"
                          >
                            <ArrowLeftRight className="w-2.5 h-2.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleTogglePin(col.id, e)}
                            title={
                              isPinned
                                ? "Desanclar columna (Tecla P)"
                                : "Fijar columna a la izquierda (Tecla P)"
                            }
                            className={`p-1 rounded-md transition-all cursor-pointer ${
                              justPinnedId === col.id ? "animate-pin-clava" : ""
                            } ${
                              isPinned
                                ? "opacity-100 text-white bg-white/10"
                                : "opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white hover:bg-zinc-800"
                            }`}
                          >
                            <Pin
                              className={`w-3 h-3 ${
                                isPinned ? "fill-white" : ""
                              }`}
                            />
                          </button>
                        </div>

                        {/* Asa Derecha de Redimensión (.pi-borde) */}
                        <div
                          onPointerDown={(e) => startColumnResize(col.id, e)}
                          onDoubleClick={() => handleAutoFitColumn(col.id)}
                          title="Arrastrar para cambiar ancho • Doble clic para autoajustar"
                          className="absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize group/handle flex items-center justify-end pr-0.5 z-10"
                        >
                          <span className="w-[2px] h-4 group-hover/handle:h-full bg-zinc-700 group-hover/handle:bg-white rounded-full transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── FILAS DE BÓVEDAS CON DENSIDAD EN OLA (.pilar-wave-row) ── */}
                {filteredVaults.length === 0 ? (
                  <div className="p-12 text-center font-mono">
                    <div className="text-zinc-500 text-xs mb-2">
                      [ 0 BÓVEDAS COINCIDEN CON EL FILTRO ]
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setCurrencyFilter("ALL");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold cursor-pointer"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                ) : (
                  <div role="rowgroup" className="divide-y divide-[#18181b]">
                    {filteredVaults.map((vault, rowIdx) => {
                      const isSelected = vault.id === activeVaultId;
                      return (
                        <div
                          key={vault.id}
                          ref={(el) => {
                            rowRefs.current[vault.id] = el;
                          }}
                          role="row"
                          tabIndex={0}
                          aria-selected={isSelected}
                          onClick={() => setActiveVaultId(vault.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setActiveVaultId(vault.id);
                            }
                          }}
                          style={
                            {
                              height: `${rowHeightPx}px`,
                              "--row-idx": rowIdx,
                            } as React.CSSProperties
                          }
                          className={`pilar-wave-row group/row relative flex items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-bright)] ${
                            isSelected
                              ? "bg-[#141724] text-white shadow-[inset_3px_0_0_var(--accent-primary)]"
                              : "bg-[#09090b] hover:bg-[#121217] text-zinc-200"
                          }`}
                        >
                          {visibleOrderedColumns.map((col) => {
                            const isPinned = col.isPinned;
                            const isLastPinned = col.id === lastPinnedColId;
                            const stickyLeft = isPinned
                              ? stickyOffsets[col.id] ?? 0
                              : undefined;

                            return (
                              <div
                                key={col.id}
                                role="cell"
                                style={{
                                  width: `${col.width}px`,
                                  left:
                                    stickyLeft !== undefined
                                      ? `${stickyLeft}px`
                                      : undefined,
                                }}
                                className={`flex items-center h-full px-3.5 shrink-0 border-r border-[#141418] overflow-hidden ${
                                  col.responsiveClass || ""
                                } ${
                                  col.align === "right"
                                    ? "justify-end text-right"
                                    : col.align === "center"
                                    ? "justify-center text-center"
                                    : "justify-start text-left"
                                } ${
                                  isPinned
                                    ? isSelected
                                      ? "sticky z-10 bg-[#18181f]"
                                      : "sticky z-10 bg-[#0d0d12] group-hover/row:bg-[#14141a]"
                                    : ""
                                } ${
                                  isLastPinned
                                    ? "after:content-[''] after:absolute after:top-0 after:bottom-0 after:left-full after:w-4 after:bg-gradient-to-r after:from-black/70 after:to-transparent after:pointer-events-none"
                                    : ""
                                }`}
                              >
                                {col.id === "id" && (
                                  <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        vault.status === "LIBERADO"
                                          ? "bg-[#1FE05A]"
                                          : vault.status === "VALIDANDO_ORACULO"
                                          ? "bg-amber-400"
                                          : "bg-[var(--accent-bright)]"
                                      }`}
                                    />
                                    {vault.id}
                                  </span>
                                )}

                                {col.id === "title" && (
                                  <div className="truncate">
                                    <div className="text-xs sm:text-sm font-medium text-zinc-100 truncate">
                                      {vault.title}
                                    </div>
                                    {density === "comoda" && (
                                      <div className="font-mono text-[10px] text-zinc-500 truncate mt-0.5">
                                        {vault.clientName} ──►{" "}
                                        {vault.beneficiaryName}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {col.id === "amount" && (
                                  <span className="font-mono text-xs sm:text-sm font-bold text-white tabular-nums">
                                    {vault.currency === "ARGt"
                                      ? "$ "
                                      : vault.currency === "BRAt"
                                      ? "R$ "
                                      : ""}
                                    {vault.amountFormatted}
                                  </span>
                                )}

                                {col.id === "currency" && (
                                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[#141418] border border-[#27272a] text-zinc-200">
                                    {vault.currency}
                                  </span>
                                )}

                                {col.id === "progress" && (
                                  <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                                    <span className="text-zinc-300 tracking-tighter">
                                      [
                                      {"■".repeat(vault.criteriaPassed) +
                                        "□".repeat(
                                          Math.max(
                                            0,
                                            vault.criteriaTotal -
                                              vault.criteriaPassed
                                          )
                                        )}
                                      ]
                                    </span>
                                    <span className="text-[11px] text-zinc-400">
                                      {vault.criteriaPassed}/
                                      {vault.criteriaTotal}
                                    </span>
                                  </div>
                                )}

                                {col.id === "oracle" && (
                                  <span className="font-mono text-[11px] text-zinc-400 truncate">
                                    {vault.oracleEngine}
                                  </span>
                                )}

                                {col.id === "status" && (
                                  <span
                                    className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${
                                      vault.status === "LIBERADO"
                                        ? "bg-[#1FE05A] text-black border-white"
                                        : vault.status === "VALIDANDO_ORACULO"
                                        ? "bg-amber-950/60 text-amber-300 border-amber-700/50"
                                        : "bg-pinterest-surface text-pinterest-ice border-pinterest-accent"
                                    }`}
                                  >
                                    {vault.status === "LIBERADO" ? (
                                      <Unlock className="w-3 h-3" />
                                    ) : (
                                      <Lock className="w-3 h-3" />
                                    )}
                                    <span>
                                      {vault.status === "LIBERADO"
                                        ? "LIBERADO"
                                        : vault.status === "VALIDANDO_ORACULO"
                                        ? "ORÁCULO..."
                                        : "EN CUSTODIA"}
                                    </span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                MITAD DERECHA: PANEL LATERAL MAESTRO-DETALLE «COSTADO» (UI-02)
                ════════════════════════════════════════════════════════════════ */}
            <aside
              aria-label="Inspector detallado de bóveda Costado"
              inert={!selectedVault ? true : undefined}
              style={{
                width: selectedVault ? `${panelWidth}px` : "0px",
                transition: isResizingPanel
                  ? "none"
                  : "width 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              className={`relative shrink-0 bg-[#0d0d10] border-t lg:border-t-0 lg:border-l border-[#27272a] overflow-hidden max-w-full ${
                !selectedVault ? "border-none" : ""
              }`}
            >
              {/* Tirador Redimensionable de Costado (role="separator") */}
              {selectedVault && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Ajustar ancho del panel de inspección"
                  tabIndex={0}
                  onPointerDown={startPanelResize}
                  onDoubleClick={() => {
                    setPanelWidth(DEFAULT_PANEL_WIDTH);
                    window.localStorage.setItem(
                      STORAGE_KEY_WIDTH,
                      String(DEFAULT_PANEL_WIDTH)
                    );
                  }}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 48 : 16;
                    if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      setPanelWidth((w) => Math.min(600, w + step));
                    } else if (e.key === "ArrowRight") {
                      e.preventDefault();
                      setPanelWidth((w) => Math.max(340, w - step));
                    } else if (e.key === "r" || e.key === "R") {
                      setPanelWidth(DEFAULT_PANEL_WIDTH);
                    }
                  }}
                  title="Arrastrar borde • Doble clic para restablecer ancho"
                  className="hidden lg:flex absolute left-0 top-0 bottom-0 w-3 z-30 items-center justify-center cursor-col-resize group/sep focus-visible:outline-none"
                >
                  <span className="w-1 h-12 group-hover/sep:h-20 rounded-full bg-zinc-700 group-hover/sep:bg-white transition-all" />
                </div>
              )}

              {selectedVault && (
                <div
                  className={`flex flex-col h-full min-w-[320px] transition-opacity duration-150 ${
                    isTransitioningDetail ? "opacity-60" : "opacity-100"
                  }`}
                >
                  {/* Barra Superior del Panel Costado */}
                  <header className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f23] bg-[#09090b]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-white text-black tabular-nums">
                        #{selectedVault.id}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 uppercase">
                        {selectedVault.category}
                      </span>
                    </div>

                    {/* Botones de Recorrido Rápido (↑ / ↓ / ✕) */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigateVaultByDelta(-1)}
                        title="Bóveda anterior (Tecla k)"
                        className="p-1.5 rounded-lg bg-[#141418] hover:bg-white hover:text-black text-zinc-300 border border-[#27272a] transition-colors cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateVaultByDelta(1)}
                        title="Siguiente bóveda (Tecla j)"
                        className="p-1.5 rounded-lg bg-[#141418] hover:bg-white hover:text-black text-zinc-300 border border-[#27272a] transition-colors cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveVaultId(null)}
                        title="Cerrar inspector (Esc)"
                        className="p-1.5 rounded-lg bg-[#141418] hover:bg-white hover:text-black text-zinc-300 border border-[#27272a] transition-colors ml-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </header>

                  {/* Cuerpo Scrollable Limpio del Inspector Costado */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Título y Monto Principal */}
                    <div className="pb-5 border-b border-zinc-900">
                      <h3 className="text-lg sm:text-xl font-semibold text-white leading-snug mb-3">
                        {selectedVault.title}
                      </h3>
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="font-mono text-3xl font-bold text-white tabular-nums">
                            {selectedVault.amountFormatted}{" "}
                            <span className="text-base font-normal text-pinterest-ice">
                              {selectedVault.currency}
                            </span>
                          </span>
                        </div>
                        <span
                          className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            selectedVault.status === "LIBERADO"
                              ? "bg-[#1FE05A] text-black"
                              : "bg-pinterest-surface text-pinterest-ice"
                          }`}
                        >
                          {selectedVault.status === "LIBERADO"
                            ? "✓ LIBERADO"
                            : "● CUSTODIA 1:1"}
                        </span>
                      </div>
                    </div>

                    {/* Sello Criptográfico en Arte ASCII Libre */}
                    <div className="py-2 text-center border-b border-zinc-900 pb-5">
                      <pre className="font-mono text-xs leading-[1.2] text-pinterest-bright font-bold select-none py-1">
                        {generateVaultAsciiStamp(
                          selectedVault.asciiSeed,
                          glyphRamp,
                          selectedVault.status === "LIBERADO"
                        ).join("\n")}
                      </pre>
                      <span className="font-mono text-[10px] text-zinc-500 block mt-2">
                        {selectedVault.clientName} → {selectedVault.beneficiaryName} · {selectedVault.blockNumber}
                      </span>
                    </div>

                    {/* Lista Interactiva Limpia de Criterios */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                          CONDICIONES ({selectedVault.criteriaPassed}/
                          {selectedVault.criteriaTotal})
                        </h4>
                        <span className="font-mono text-[10px] text-zinc-500">
                          Tocá para verificar
                        </span>
                      </div>
                      <div className="divide-y divide-zinc-900">
                        {selectedVault.criteriaList.map((crit) => {
                          const isOk = crit.status === "verified";
                          return (
                            <button
                              key={crit.id}
                              type="button"
                              onClick={() =>
                                handleVerifyFromInspector(
                                  selectedVault,
                                  crit.id
                                )
                              }
                              className="w-full text-left py-3 flex items-start gap-3 transition-colors cursor-pointer group"
                            >
                              <span
                                className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isOk
                                    ? "bg-pinterest-primary text-[var(--accent-ink)]"
                                    : "border border-zinc-700 text-zinc-500 group-hover:border-white"
                                }`}
                              >
                                {isOk ? "✓" : ""}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div
                                  className={`text-xs sm:text-sm leading-snug ${
                                    isOk ? "text-white font-medium" : "text-zinc-400"
                                  }`}
                                >
                                  {crit.title}
                                </div>
                                <span className="font-mono text-[10px] text-zinc-500 block mt-0.5">
                                  {crit.oracleLabel}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Pie del Panel Costado: Botón Copiar Link con Onda */}
                  <footer className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-[#1f1f23] bg-[#09090b]">
                    <button
                      type="button"
                      onClick={handleCopyDeepLink}
                      className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs font-semibold transition-all cursor-pointer ${
                        copiedLink
                          ? "bg-white text-black animate-copy-wave"
                          : "bg-[#141418] text-white border border-[#27272a] hover:border-white"
                      }`}
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>✓ Enlace copiado</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Copiar link (?vault={selectedVault.id})</span>
                        </>
                      )}
                    </button>

                    <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                      ANCHO: {panelWidth}px
                    </span>
                  </footer>
                </div>
              )}
            </aside>
          </div>

          {/* ── PIE DE ESTADO DE LA TABLA «PILAR» ── */}
          <footer className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-[#0d0d10] border-t border-[#1f1f23] font-mono text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span>
                Mostrando <strong className="text-white">{filteredVaults.length}</strong> de{" "}
                <strong className="text-white">{vaults.length}</strong> bóvedas en Avalanche
              </span>
              <span className="text-zinc-700">·</span>
              <span>
                Columnas fijas:{" "}
                <strong className="text-white">{pinnedCols.length}</strong>
              </span>
            </div>

            <div className="text-[11px] text-zinc-500">
              {selectedVault ? (
                <span>
                  Inspeccionando{" "}
                  <strong className="text-white">#{selectedVault.id}</strong> · Usa{" "}
                  <kbd className="px-1 py-0.2 rounded bg-black border border-zinc-800 text-zinc-300">
                    j
                  </kbd>{" "}
                  /{" "}
                  <kbd className="px-1 py-0.2 rounded bg-black border border-zinc-800 text-zinc-300">
                    k
                  </kbd>{" "}
                  para recorrer
                </span>
              ) : (
                <span>Haz clic en cualquier fila para abrir el panel Costado</span>
              )}
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}
