"use client";

import React from "react";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
}

export interface BenchoSegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  variant?: "white-pill" | "accent-pill" | "subtle-carbon";
  ariaLabel: string;
  className?: string;
}

export function BenchoSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  variant = "white-pill",
  ariaLabel,
  className = "",
}: BenchoSegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.id === value)
  );
  const count = Math.max(1, options.length);

  const isSmall = size === "sm";

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={
        {
          "--seg-count": count,
          "--seg-idx": activeIndex,
        } as React.CSSProperties
      }
      className={`relative grid items-center p-1 rounded-xl bg-[#09090b] border border-[#27272a] select-none isolation-auto ${
        isSmall ? "min-h-[38px]" : "min-h-[44px]"
      } ${className}`}
    >
      {/* Pulgar Deslizante con Curva de Resorte (Pilar / Bencho Spring) */}
      <div
        aria-hidden="true"
        style={{
          width: `calc((100% - 8px) / ${count})`,
          transform: `translateX(calc(${activeIndex} * 100%))`,
          transition: "transform 0.5s cubic-bezier(0.34, 1.4, 0.64, 1)",
        }}
        className={`pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg ${
          variant === "white-pill"
            ? "bg-white ios-bevel-white"
            : variant === "accent-pill"
            ? "bg-pinterest-primary ios-bevel-accent"
            : "bg-[#1c1c21] border border-pinterest-accent shadow-sm"
        }`}
      />

      {/* Botones de Opción */}
      <div
        style={{
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        }}
        className="relative z-10 grid w-full h-full"
      >
        {options.map((opt) => {
          const isActive = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(opt.id)}
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg transition-colors duration-200 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)] ${
                isSmall ? "text-[11px]" : "text-xs"
              } ${
                isActive
                  ? variant === "white-pill"
                    ? "text-black font-semibold"
                    : variant === "accent-pill"
                    ? "text-[var(--accent-ink)] font-semibold"
                    : "text-white font-semibold"
                  : "text-zinc-300 hover:text-white font-medium"
              }`}
            >
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              <span>{opt.label}</span>
              {opt.badge && (
                <span
                  className={`hidden sm:inline font-mono text-[10px] px-1 py-0.2 rounded ${
                    isActive
                      ? variant === "white-pill"
                        ? "bg-black/15 text-black"
                        : variant === "accent-pill"
                        ? "bg-black/25 text-current"
                        : "bg-pinterest-surface text-pinterest-ice"
                      : "text-zinc-400"
                  }`}
                >
                  {opt.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
