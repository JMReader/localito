"use client";

import React, { useEffect, useRef, useCallback } from "react";

export type OrbMode = "idle" | "voice" | "thinking" | "speaking";

export interface PaletteDef {
  name: string;
  dotColor: string;
  coreColor: string;
  ringColor: string;
  dimColor: string;
  highlight: string;
  haloColor: string;
}

export const PALETTES: PaletteDef[] = [
  {
    name: "Monochrome Minimal",
    dotColor: "#FFFFFF",
    coreColor: "#FFFFFF",
    ringColor: "#E4E4E7",
    dimColor: "#52525B",
    highlight: "#FFFFFF",
    haloColor: "rgba(255, 255, 255, 0.22)",
  },
  {
    name: "Electric Cobalt",
    dotColor: "#0066FF",
    coreColor: "#FFFFFF",
    ringColor: "#388BFD",
    dimColor: "#1B3B6F",
    highlight: "#93C5FD",
    haloColor: "rgba(0, 102, 255, 0.25)",
  },
  {
    name: "Cyber Cyan",
    dotColor: "#00F0FF",
    coreColor: "#FFFFFF",
    ringColor: "#22D3EE",
    dimColor: "#164E63",
    highlight: "#A5F3FC",
    haloColor: "rgba(0, 240, 255, 0.25)",
  },
  {
    name: "Matrix Emerald",
    dotColor: "#10B981",
    coreColor: "#FFFFFF",
    ringColor: "#34D399",
    dimColor: "#064E3B",
    highlight: "#A7F3D0",
    haloColor: "rgba(16, 185, 129, 0.25)",
  },
  {
    name: "Solar Amber",
    dotColor: "#F59E0B",
    coreColor: "#FFFFFF",
    ringColor: "#FBBF24",
    dimColor: "#78350F",
    highlight: "#FDE68A",
    haloColor: "rgba(245, 158, 11, 0.25)",
  },
];

interface ParticleNode {
  baseX: number;
  baseY: number;
  baseZ: number;
  kind: "solid" | "hollow" | "double" | "micro";
  size: number;
  phase: number;
  freq: number;
  isCluster?: boolean;
}

interface AsciiSphereOrbProps {
  seed?: string;
  mode?: OrbMode;
  paletteIndex?: number;
  showOrbitRing?: boolean;
  className?: string;
  onOrbClick?: () => void;
}

export function AsciiSphereOrb({
  seed = "HackaTwin-Sphere-01",
  mode = "idle",
  paletteIndex = 0,
  showOrbitRing = true,
  className = "w-full h-full",
  onOrbClick,
}: AsciiSphereOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef({
    mode,
    seed,
    paletteIndex,
    showOrbitRing,
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    isHovered: false,
    squishScaleY: 1.0,
    squishVelocity: 0.0,
    blinkProgress: 1.0,
    isBlinking: false,
    rippleRadius: 999.0,
    rippleIntensity: 0.0,
  });

  useEffect(() => { stateRef.current.mode = mode; }, [mode]);
  useEffect(() => { stateRef.current.seed = seed; }, [seed]);
  useEffect(() => { stateRef.current.paletteIndex = paletteIndex; }, [paletteIndex]);
  useEffect(() => { stateRef.current.showOrbitRing = showOrbitRing; }, [showOrbitRing]);

  // Blink trigger
  const triggerBlink = useCallback(() => {
    if (stateRef.current.isBlinking) return;
    stateRef.current.isBlinking = true;
    const start = performance.now();
    const duration = 180;

    const animateBlink = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1.0, elapsed / duration);
      stateRef.current.blinkProgress = Math.sin(progress * Math.PI) > 0.4 ? 0.05 : 1.0;
      if (progress < 1.0) {
        requestAnimationFrame(animateBlink);
      } else {
        stateRef.current.blinkProgress = 1.0;
        stateRef.current.isBlinking = false;
      }
    };
    requestAnimationFrame(animateBlink);
  }, []);

  // Autonomous blink schedule
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const scheduleNext = () => {
      const delay = 3500 + Math.random() * 3500;
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

    // Radius of the 3D sphere
    const baseSphereRadius = 152;
    const particles: ParticleNode[] = [];

    // Simple deterministic pseudo-random from seed
    let hash = 42;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const pseudoRand = () => {
      hash = (Math.imul(hash, 1664525) + 1013904223) | 0;
      return (hash >>> 0) / 4294967296;
    };

    // 1. Primary Fibonacci Lattice for the overall sphere structure
    const totalPrimaryNodes = 360;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < totalPrimaryNodes; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / totalPrimaryNodes);

      const x = Math.cos(theta) * Math.sin(phi) * baseSphereRadius;
      const y = Math.sin(theta) * Math.sin(phi) * baseSphereRadius;
      const z = Math.cos(phi) * baseSphereRadius;

      const rVal = pseudoRand();
      let kind: "solid" | "hollow" | "double" | "micro" = "hollow";
      let size = 3.8;

      if (rVal < 0.20) {
        // Prominent glowing solid circles (Pinterest pin: luminous dots)
        kind = "solid";
        size = 5.2 + pseudoRand() * 2.8;
      } else if (rVal < 0.65) {
        // Crisp hollow rings
        kind = "hollow";
        size = 4.0 + pseudoRand() * 2.6;
      } else if (rVal < 0.85) {
        // Concentric double rings
        kind = "double";
        size = 5.6 + pseudoRand() * 2.2;
      } else {
        // Micro dots
        kind = "micro";
        size = 2.4 + pseudoRand() * 1.6;
      }

      particles.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        kind,
        size,
        phase: pseudoRand() * Math.PI * 2,
        freq: 0.8 + pseudoRand() * 0.8,
      });
    }

    // 2. Dense Ring Clusters (Pinterest Pin: dense patches of small tangent hollow circles)
    // Create 6 cluster centers on the sphere surface
    const clusterCenters = [
      { theta: 0.8, phi: 1.1 },
      { theta: 2.5, phi: 2.1 },
      { theta: 4.2, phi: 1.4 },
      { theta: 5.6, phi: 2.3 },
      { theta: 1.6, phi: 2.5 },
      { theta: 3.4, phi: 0.8 },
    ];

    clusterCenters.forEach((cCenter) => {
      const clusterCount = 14 + Math.floor(pseudoRand() * 8);
      const cx = Math.cos(cCenter.theta) * Math.sin(cCenter.phi);
      const cy = Math.sin(cCenter.theta) * Math.sin(cCenter.phi);
      const cz = Math.cos(cCenter.phi);

      for (let k = 0; k < clusterCount; k++) {
        // Small tangent offsets around cluster center
        const angle = pseudoRand() * Math.PI * 2;
        const spread = 0.08 + pseudoRand() * 0.16; // Small angular radius
        const offsetTheta = cCenter.theta + Math.cos(angle) * spread;
        const offsetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cCenter.phi + Math.sin(angle) * spread));

        const px = Math.cos(offsetTheta) * Math.sin(offsetPhi) * baseSphereRadius;
        const py = Math.sin(offsetTheta) * Math.sin(offsetPhi) * baseSphereRadius;
        const pz = Math.cos(offsetPhi) * baseSphereRadius;

        particles.push({
          baseX: px,
          baseY: py,
          baseZ: pz,
          kind: pseudoRand() < 0.85 ? "hollow" : "double",
          size: 3.2 + pseudoRand() * 2.0,
          phase: pseudoRand() * Math.PI * 2,
          freq: 1.0,
          isCluster: true,
        });
      }
    });

    // Resize handling
    let width = container.clientWidth || 500;
    let height = container.clientHeight || 500;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = container.clientWidth || 500;
      height = container.clientHeight || 500;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // Mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      stateRef.current.targetMouseX = Math.max(-1.5, Math.min(1.5, x));
      stateRef.current.targetMouseY = Math.max(-1.5, Math.min(1.5, y));

      const dist = Math.hypot(x, y);
      const isHover = dist < 0.88;
      if (isHover !== stateRef.current.isHovered) {
        stateRef.current.isHovered = isHover;
        canvas.style.cursor = isHover ? "pointer" : "default";
      }
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Blobatar Hollow Eye Sockets (negative space cutout on sphere surface)
    const eyeBaseLX = -40;
    const eyeBaseRX = 40;
    const eyeBaseY = 24;
    const eyeBaseZ = baseSphereRadius * 0.90;
    const eyeRadius = 28;

    // Animation Loop
    let animId: number;
    let lastTime = performance.now();
    let rotY = 0;
    let rotX = 0;

    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      const state = stateRef.current;
      const pal = PALETTES[state.paletteIndex % PALETTES.length];

      // Smooth mouse damping
      state.mouseX += (state.targetMouseX - state.mouseX) * 0.085;
      state.mouseY += (state.targetMouseY - state.mouseY) * 0.085;

      // Spring-Damper Squish (Hooke's Law physics)
      const targetSquish = state.isHovered ? 0.90 : 1.0;
      const springK = 190.0;
      const dampingC = 12.5;
      const displacement = state.squishScaleY - targetSquish;
      const force = -springK * displacement - dampingC * state.squishVelocity;
      state.squishVelocity += force * dt;
      state.squishScaleY += state.squishVelocity * dt;

      const squishY = state.squishScaleY;
      const squishXZ = 1.0 + (1.0 - squishY) * 0.52;

      // Ripple propagation from click
      if (state.rippleIntensity > 0.01) {
        state.rippleRadius += dt * 340;
        state.rippleIntensity = Math.max(0, state.rippleIntensity - dt * 1.6);
      }

      // ── ESTADO EN REPOSO TRANQUILO (Sin auto-giro) ──
      // Solo responde a acciones externas (mouse, hover, clic, modo)
      let organicNoiseSpeed = 0.0005;
      let organicNoiseAmp = 0.9; // Amplitud base sutil y tranquila

      if (state.isHovered) {
        // Excitación por presencia del cursor
        organicNoiseSpeed = 0.0015;
        organicNoiseAmp = 2.2;
      }

      // Modulación por acción externa de modos
      if (state.mode === "voice") {
        organicNoiseSpeed = 0.0028;
        organicNoiseAmp = 5.5;
      } else if (state.mode === "thinking") {
        organicNoiseSpeed = 0.0040;
        organicNoiseAmp = 4.0;
      } else if (state.mode === "speaking") {
        const pulse = Math.sin(time * 0.012) * 0.5 + 0.5;
        organicNoiseSpeed = 0.0020;
        organicNoiseAmp = 3.2 + pulse * 4.5;
      }

      // NO auto-girar: orientación estable al frente con sutil paralaje reactivo al mouse
      const targetRotY = state.mouseX * 0.35;
      rotY += (targetRotY - rotY) * 0.085;

      const targetRotX = -state.mouseY * 0.28;
      rotX += (targetRotX - rotX) * 0.085;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Eye positions with mouse tracking look-at
      const eyeLookX = state.mouseX * 16;
      const eyeLookY = state.mouseY * 14;

      // Left Eye 3D coordinates
      let eLX = eyeBaseLX * cosY - eyeBaseZ * sinY;
      let eLZ = eyeBaseLX * sinY + eyeBaseZ * cosY;
      let eLY = eyeBaseY * cosX - eLZ * sinX;
      eLZ = eyeBaseY * sinX + eLZ * cosX;
      eLX += eyeLookX;
      eLY += eyeLookY;

      // Right Eye 3D coordinates
      let eRX = eyeBaseRX * cosY - eyeBaseZ * sinY;
      let eRZ = eyeBaseRX * sinY + eyeBaseZ * cosY;
      let eRY = eyeBaseY * cosX - eRZ * sinX;
      eRZ = eyeBaseY * sinX + eRZ * cosX;
      eRX += eyeLookX;
      eRY += eyeLookY;

      const focalLength = 520;
      const centerX = width * 0.5;
      const centerY = height * 0.5;

      // Clear Canvas to Pitch Black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Transform and Project Particles
      interface ProjectedNode {
        x2d: number;
        y2d: number;
        z3d: number;
        scale: number;
        alpha: number;
        kind: "solid" | "hollow" | "double" | "micro";
        renderSize: number;
        isEyeRim: boolean;
      }

      const projectedList: ProjectedNode[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Prolonged organic noise morphing across the spherical surface
        const phiNorm = p.baseZ / baseSphereRadius;
        const thetaNorm = Math.atan2(p.baseY, p.baseX);
        const noiseWave =
          Math.sin(thetaNorm * 2.0 + time * organicNoiseSpeed * 1.5 + p.phase) *
          Math.cos(phiNorm * 3.0 + time * organicNoiseSpeed * 2.0) *
          organicNoiseAmp;

        const curR = baseSphereRadius + noiseWave;

        // Base coordinates on deformed sphere
        const len = Math.hypot(p.baseX, p.baseY, p.baseZ);
        let px = (p.baseX / len) * curR * squishXZ;
        let py = (p.baseY / len) * curR * squishY;
        let pz = (p.baseZ / len) * curR * squishXZ;

        // 3D Rotation (Y then X)
        let x1 = px * cosY - pz * sinY;
        let z1 = px * sinY + pz * cosY;
        let y1 = py * cosX - z1 * sinX;
        let z2 = py * sinX + z1 * cosX;

        // Blobatar Hollow Eye Cavity Check
        const blinkComp = Math.max(0.12, state.blinkProgress);
        const dEyeL = Math.hypot(x1 - eLX, (y1 - eLY) / blinkComp);
        const dEyeR = Math.hypot(x1 - eRX, (y1 - eRY) / blinkComp);

        let isEyeRim = false;
        // Pure hollow negative cutout in the center
        if (dEyeL < eyeRadius) {
          if (dEyeL < eyeRadius * 0.72) continue; // Completely empty cavity!
          isEyeRim = true;
        } else if (dEyeR < eyeRadius) {
          if (dEyeR < eyeRadius * 0.72) continue; // Completely empty cavity!
          isEyeRim = true;
        }

        // Perspective projection
        const projScale = focalLength / (focalLength + z2);
        const x2d = centerX + x1 * projScale;
        const y2d = centerY - y1 * projScale;

        // Depth cue: front particles are bright, back particles are subtle
        const depthNorm = (z2 + baseSphereRadius) / (baseSphereRadius * 2);
        const alpha = Math.max(0.18, Math.min(1.0, 0.28 + depthNorm * 0.72));
        const renderSize = Math.max(1.2, p.size * projScale);

        projectedList.push({
          x2d,
          y2d,
          z3d: z2,
          scale: projScale,
          alpha,
          kind: p.kind,
          renderSize,
          isEyeRim,
        });
      }

      // 3. Optional Orbital Ring (Solar System / Circular Motion Graphics)
      if (state.showOrbitRing) {
        const orbitRadius = baseSphereRadius * 1.38;
        const orbitPts = 72;
        const orbitTilt = 0.42; // ~24 degrees inclination

        // Draw back half of orbit ring first
        ctx.save();
        ctx.beginPath();
        for (let o = 0; o <= orbitPts; o++) {
          const ang = (o / orbitPts) * Math.PI * 2;
          const ox = Math.cos(ang) * orbitRadius;
          const oy = Math.sin(ang) * orbitRadius * Math.sin(orbitTilt);
          const oz = Math.sin(ang) * orbitRadius * Math.cos(orbitTilt);

          // Rotate with current orientation
          const ox1 = ox * cosY - oz * sinY;
          const oz1 = ox * sinY + oz * cosY;
          const oy1 = oy * cosX - oz1 * sinX;
          const oz2 = oy * sinX + oz1 * cosX;

          const pScale = focalLength / (focalLength + oz2);
          const ox2d = centerX + ox1 * pScale;
          const oy2d = centerY - oy1 * pScale;

          if (o === 0) ctx.moveTo(ox2d, oy2d);
          else ctx.lineTo(ox2d, oy2d);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1.0;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Satellite Beads on Orbit (Solo se desplazan por acción externa del mouse)
        const beadCount = 3;
        for (let b = 0; b < beadCount; b++) {
          const beadAng = (((b * Math.PI * 2) / beadCount) + state.mouseX * 0.5) % (Math.PI * 2);
          const bx = Math.cos(beadAng) * orbitRadius;
          const by = Math.sin(beadAng) * orbitRadius * Math.sin(orbitTilt);
          const bz = Math.sin(beadAng) * orbitRadius * Math.cos(orbitTilt);

          const bx1 = bx * cosY - bz * sinY;
          const bz1 = bx * sinY + bz * cosY;
          const by1 = by * cosX - bz1 * sinX;
          const bz2 = by * sinX + bz1 * cosX;

          const bpScale = focalLength / (focalLength + bz2);
          const bx2d = centerX + bx1 * bpScale;
          const by2d = centerY - by1 * bpScale;

          projectedList.push({
            x2d: bx2d,
            y2d: by2d,
            z3d: bz2,
            scale: bpScale,
            alpha: bz2 > 0 ? 0.95 : 0.35,
            kind: b === 0 ? "solid" : "double",
            renderSize: (b === 0 ? 5.5 : 4.5) * bpScale,
            isEyeRim: false,
          });
        }
      }

      // Sort by Z for proper 3D depth layering
      projectedList.sort((a, b) => a.z3d - b.z3d);

      // Render Projected Nodes (Pinterest Pin Style)
      for (let i = 0; i < projectedList.length; i++) {
        const node = projectedList[i];
        ctx.globalAlpha = node.alpha;

        const isFront = node.z3d > 0;

        if (node.isEyeRim) {
          // Eye socket rim: accent color ring contour
          ctx.strokeStyle = pal.ringColor;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(node.x2d, node.y2d, node.renderSize * 1.25, 0, Math.PI * 2);
          ctx.stroke();
          continue;
        }

        // Kinetic shockwave ripple on click
        let rippleBonus = 0;
        if (state.rippleIntensity > 0.01) {
          const distToCenter = Math.hypot(node.x2d - centerX, node.y2d - centerY);
          const diff = Math.abs(distToCenter - state.rippleRadius);
          if (diff < 32) {
            rippleBonus = (1 - diff / 32) * state.rippleIntensity;
          }
        }

        if (node.kind === "solid" || rippleBonus > 0.45) {
          // Prominent luminous solid circle (Pinterest: glowing white filled spheres)
          ctx.fillStyle = isFront ? pal.coreColor : pal.ringColor;
          ctx.beginPath();
          ctx.arc(node.x2d, node.y2d, node.renderSize * (1.0 + rippleBonus * 0.4), 0, Math.PI * 2);
          ctx.fill();

          // Soft outer corona halo for front prominent solid nodes
          if (isFront && node.renderSize > 3.6) {
            ctx.strokeStyle = pal.haloColor;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(node.x2d, node.y2d, node.renderSize * 1.5, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (node.kind === "double") {
          // Double Concentric Ring
          ctx.strokeStyle = isFront ? pal.ringColor : pal.dimColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(node.x2d, node.y2d, node.renderSize, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(node.x2d, node.y2d, node.renderSize * 0.52, 0, Math.PI * 2);
          ctx.stroke();
        } else if (node.kind === "hollow") {
          // Single Clean Hollow Ring (Pinterest: delicate circular outline)
          ctx.strokeStyle = isFront ? pal.ringColor : pal.dimColor;
          ctx.lineWidth = isFront ? 1.35 : 0.85;
          ctx.beginPath();
          ctx.arc(node.x2d, node.y2d, node.renderSize, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Micro satellite dot
          ctx.fillStyle = isFront ? pal.ringColor : pal.dimColor;
          ctx.beginPath();
          ctx.arc(node.x2d, node.y2d, node.renderSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render Blink Slits if blinking
      if (state.blinkProgress < 0.25) {
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = pal.highlight;
        ctx.lineWidth = 2.4;

        // Project eye centers to 2D
        const scaleEL = focalLength / (focalLength + eLZ);
        const eyeLX2d = centerX + eLX * scaleEL;
        const eyeLY2d = centerY - eLY * scaleEL;

        const scaleER = focalLength / (focalLength + eRZ);
        const eyeRX2d = centerX + eRX * scaleER;
        const eyeRY2d = centerY - eRY * scaleER;

        ctx.beginPath();
        ctx.moveTo(eyeLX2d - 12, eyeLY2d);
        ctx.lineTo(eyeLX2d + 12, eyeLY2d);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(eyeRX2d - 12, eyeRY2d);
        ctx.lineTo(eyeRX2d + 12, eyeRY2d);
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      ro.disconnect();
    };
  }, [seed]);

  const handleClick = () => {
    stateRef.current.squishVelocity -= 0.85;
    triggerBlink();
    stateRef.current.rippleRadius = 10.0;
    stateRef.current.rippleIntensity = 1.0;
    if (onOrbClick) onOrbClick();
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative select-none overflow-hidden bg-black ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
}
