"use client";

import { useEffect, useState } from "react";

// Inspired by Pin 16 of Pinterest board: "Loaders made of text"
const SPINNER_FRAMES = [
  ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  ["[■□□□□□□□]", "[■■□□□□□□]", "[■■■□□□□□]", "[■■■■□□□□]", "[■■■■■□□□]", "[■■■■■■□□]", "[■■■■■■■□]", "[■■■■■■■■]"],
  ["·", "•", "●", "•", "·"],
  ["◴", "◷", "◶", "◵"],
  [">)))'>", " >)))'>", "  >)))'>", "   >)))'>", "    >)))'>", "   <'(((<", "  <'(((<", " <'(((<"]
];

interface AsciiTextSpinnerProps {
  variant?: 0 | 1 | 2 | 3;
  intervalMs?: number;
  className?: string;
  label?: string;
}

export function AsciiTextSpinner({
  variant = 0,
  intervalMs = 80,
  className = "text-blue-500 font-mono text-xs",
  label,
}: AsciiTextSpinnerProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = SPINNER_FRAMES[variant] || SPINNER_FRAMES[0];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [frames.length, intervalMs]);

  return (
    <span className={`inline-flex items-center gap-1.5 select-none ${className}`}>
      <span>{frames[frameIndex]}</span>
      {label && <span className="text-zinc-400 font-sans tracking-wide text-xs">{label}</span>}
    </span>
  );
}
