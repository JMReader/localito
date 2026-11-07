"use client";

import React, { useEffect, useRef } from "react";
import { Blobatar } from "@blobatar/react";
import { gaze } from "blobatar/gaze";
import "blobatar/motion.css";
import "blobatar/gaze.css";

interface CanonicalBlobatarProps {
  seed?: string;
  size?: number;
  className?: string;
}

export function CanonicalBlobatar({
  seed = "HackaTwin",
  size = 280,
  className = "",
}: CanonicalBlobatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current?.querySelector("svg");
    if (!el) return;

    try {
      const g = gaze(el as SVGSVGElement, { target: "pointer" });
      return () => g.stop();
    } catch (e) {
      console.warn("Blobatar gaze init error:", e);
    }
  }, [seed]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center ${className}`}
    >
      <Blobatar
        name={seed}
        size={size}
        animate="always"
      />
    </div>
  );
}
