"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { AsciiTextSpinner } from "@/components/AsciiTextSpinner";

export interface IosTactileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary-white"
    | "primary-accent"
    | "carbon-matte"
    | "ghost-ascii";
  size?: "sm" | "md" | "lg";
  asciiPrefix?: string;
  showArrow?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
}

export function IosTactileButton({
  variant = "primary-white",
  size = "md",
  asciiPrefix,
  showArrow = false,
  isLoading = false,
  loadingLabel,
  children,
  className = "",
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  ...rest
}: IosTactileButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const isReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading && btnRef.current && !isReducedMotion()) {
      gsap.to(btnRef.current, {
        scale: 0.96,
        duration: 0.08,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
    onPointerDown?.(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading && btnRef.current && !isReducedMotion()) {
      gsap.to(btnRef.current, {
        scale: 1,
        duration: 0.34,
        ease: "back.out(2.6)",
        overwrite: "auto",
      });
    }
    onPointerUp?.(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading && btnRef.current && !isReducedMotion()) {
      gsap.to(btnRef.current, {
        scale: 1,
        duration: 0.25,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
    onPointerLeave?.(e);
  };

  const sizeClasses = {
    sm: "min-h-[38px] px-3 text-xs rounded-lg gap-1.5",
    md: "min-h-[44px] px-4 text-xs sm:text-sm rounded-xl gap-2",
    lg: "min-h-[48px] px-5 sm:px-6 text-sm rounded-xl gap-2.5",
  }[size];

  const variantClasses = {
    "primary-white":
      "bg-white text-black font-semibold border border-white ios-bevel-white hover:bg-zinc-100 active:bg-zinc-200",
    "primary-accent":
      "bg-pinterest-primary font-semibold border border-pinterest-accent ios-bevel-accent hover:brightness-110 active:brightness-95",
    "carbon-matte":
      "bg-[#0d0d10] text-zinc-100 font-medium border border-[#27272a] ios-bevel-dark hover:border-pinterest-accent hover:bg-[#141418] hover:text-white",
    "ghost-ascii":
      "bg-transparent text-zinc-300 font-mono border border-transparent hover:border-[#27272a] hover:bg-[#0d0d10] hover:text-white",
  }[variant];

  return (
    <button
      ref={btnRef}
      disabled={disabled || isLoading}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={`group relative inline-flex items-center justify-center select-none whitespace-nowrap transition-all duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${sizeClasses} ${variantClasses} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <AsciiTextSpinner
            variant={0}
            className={
              variant === "primary-white"
                ? "text-black font-mono text-xs"
                : "text-current font-mono text-xs"
            }
          />
          <span>{loadingLabel || children}</span>
        </span>
      ) : (
        <>
          {asciiPrefix && (
            <span
              className={`font-mono text-[11px] tracking-tighter ${
                variant === "primary-white"
                  ? "text-zinc-700"
                  : variant === "primary-accent"
                  ? "opacity-80"
                  : "text-pinterest-ice group-hover:text-white"
              }`}
            >
              [{asciiPrefix}]
            </span>
          )}
          <span>{children}</span>
          {showArrow && (
            <span
              aria-hidden="true"
              className="font-mono text-xs transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] group-hover:translate-x-1"
            >
              ──►
            </span>
          )}
        </>
      )}
    </button>
  );
}
