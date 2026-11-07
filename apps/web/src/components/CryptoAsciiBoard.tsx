"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import {
  Coins,
  Sparkles,
  Layers,
  ArrowUpRight,
  Orbit,
  Volume2,
  VolumeX,
  Palette,
  Eye,
  CheckCircle2,
} from "lucide-react";

// ============================================================================
// TIPOS Y MODELO DE DATOS VOXEL
// ============================================================================

export type CryptoCategory = "all" | "crypto" | "stablecoin";
export type PosterTheme = "cobalt" | "carbon";

export interface CryptoToken {
  id: string;
  name: string;
  symbol: string;
  category: "crypto" | "stablecoin";
  chain: string;
  pegType?: "fiat" | "crypto-collateral" | "synthetic" | "latam-peso";
  price: string;
  change24h: string;
  isPositive: boolean;
  colorHex: number;
  highlightHex: number;
  accentColor: string;
  glowColor: string;
  contract: string;
  description: string;
  voxelBlocks: string[]; // Arte Voxel Unicode 3D de alta densidad
}

// ============================================================================
// CATÁLOGO DE TOKENS: ARTE VOXEL 3D UNICODE (ESTILO SEGMINT POSTER)
// ============================================================================

export const CRYPTO_REGISTRY: CryptoToken[] = [
  // --- CRIPTOMONEDAS L1 / L2 ---
  {
    id: "ETH",
    name: "Ethereum",
    symbol: "ETH",
    category: "crypto",
    chain: "Ethereum Mainnet EVM",
    price: "$3,410.50",
    change24h: "+5.18%",
    isPositive: true,
    colorHex: 0x1e50ff,
    highlightHex: 0xa5b4fc,
    accentColor: "#627EEA",
    glowColor: "rgba(98, 126, 234, 0.45)",
    contract: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    description: "Moneda canónica del póster Segmint: diamante octaédrico extruido en relieve 3D sobre disco de micro-cubos.",
    voxelBlocks: [
      "        ▄██▄        ",
      "       ▄████▄       ",
      "      ▄██████▄      ",
      "     ▄██▓▓████▄     ",
      "    ▄██▓▓▓█████▄    ",
      "    ▀██▓▓▓█████▀    ",
      "     ▀██▓▓████▀     ",
      "      ▀██████▀      ",
      "       ▀████▀       ",
      "        ▀██▀        ",
    ],
  },
  {
    id: "BTC",
    name: "Bitcoin",
    symbol: "BTC",
    category: "crypto",
    chain: "Bitcoin Core UTXO",
    price: "$98,420.00",
    change24h: "+3.42%",
    isPositive: true,
    colorHex: 0xd97706,
    highlightHex: 0xfef08a,
    accentColor: "#F7931A",
    glowColor: "rgba(247, 147, 26, 0.45)",
    contract: "Native UTXO PoW",
    description: "Medalla voxel circular con el emblema ₿ elevado en 3 niveles de altura con doble espina vertical.",
    voxelBlocks: [
      "    ▄▄▄▄████▄▄▄▄    ",
      "   ██  █▀▀██▀▀█ ██  ",
      "  ██   █████   ██   ",
      "  ██   █▀▀██   ██   ",
      "  ██   █████   ██   ",
      "   ██  █▄▄██▄▄█ ██  ",
      "    ▀▀▀▀████▀▀▀▀    ",
    ],
  },
  {
    id: "SOL",
    name: "Solana",
    symbol: "SOL",
    category: "crypto",
    chain: "Solana Mainnet-Beta",
    price: "$212.80",
    change24h: "+8.91%",
    isPositive: true,
    colorHex: 0x059669,
    highlightHex: 0x6ee7b7,
    accentColor: "#14F195",
    glowColor: "rgba(20, 241, 149, 0.45)",
    contract: "So11111111111111111111111111111111111111112",
    description: "Tres losas de velocidad a 45° escalonadas en elevación voxel con sombras proyectadas.",
    voxelBlocks: [
      "  ███████████████▄  ",
      "  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀  ",
      "    ███████████████▄",
      "    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀",
      "  ███████████████▄  ",
      "  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀  ",
    ],
  },
  {
    id: "AVAX",
    name: "Avalanche",
    symbol: "AVAX",
    category: "crypto",
    chain: "Avalanche C-Chain",
    price: "$41.60",
    change24h: "+2.74%",
    isPositive: true,
    colorHex: 0xdc2626,
    highlightHex: 0xfca5a5,
    accentColor: "#E84142",
    glowColor: "rgba(232, 65, 66, 0.45)",
    contract: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    description: "Pico de montaña voxel con corte angular negativo que forma la icónica letra A.",
    voxelBlocks: [
      "        ▄██▄        ",
      "       ▄████▄       ",
      "      ▄██▀▀██▄      ",
      "     ▄██    ██▄     ",
      "    ▄███    ████▄   ",
      "   ▄████▄  ▄█████▄  ",
    ],
  },
  {
    id: "POL",
    name: "Polygon",
    symbol: "POL",
    category: "crypto",
    chain: "Polygon PoS / zkEVM",
    price: "$0.58",
    change24h: "-1.12%",
    isPositive: false,
    colorHex: 0x7c3aed,
    highlightHex: 0xd8b4fe,
    accentColor: "#8247E5",
    glowColor: "rgba(130, 71, 229, 0.45)",
    contract: "0x455e53CBB86018Ac2B8092DDcd39d8444aFFC3e6",
    description: "Bucle infinito entrelazado de bloques con puentes de altura variable.",
    voxelBlocks: [
      "   ▄████▄    ▄████▄   ",
      "  ██▀  ▀██  ██▀  ▀██  ",
      "  ██    ▀████▀    ██  ",
      "  ██    ▄████▄    ██  ",
      "  ██▄  ▄██  ██▄  ▄██  ",
      "   ▀████▀    ▀████▀   ",
    ],
  },
  {
    id: "XRP",
    name: "Ripple",
    symbol: "XRP",
    category: "crypto",
    chain: "XRP Ledger",
    price: "$1.48",
    change24h: "+14.30%",
    isPositive: true,
    colorHex: 0x0284c7,
    highlightHex: 0x7dd3fc,
    accentColor: "#00AAE4",
    glowColor: "rgba(0, 170, 228, 0.45)",
    contract: "Native Ledger",
    description: "Convergencia de tres nodos fluidos interconectados con relieve central.",
    voxelBlocks: [
      "  ▄██▄        ▄██▄  ",
      "   ▀███▄    ▄███▀   ",
      "     ▀███▄▄███▀     ",
      "       ▀████▀       ",
      "     ▄███▀▀███▄     ",
      "   ▄███▀    ▀███▄   ",
      "  ▀██▀        ▀██▀  ",
    ],
  },
  {
    id: "DOGE",
    name: "Dogecoin",
    symbol: "DOGE",
    category: "crypto",
    chain: "Dogecoin Core",
    price: "$0.26",
    change24h: "+6.05%",
    isPositive: true,
    colorHex: 0xb45309,
    highlightHex: 0xfef08a,
    accentColor: "#C2A633",
    glowColor: "rgba(194, 166, 51, 0.45)",
    contract: "Native PoW",
    description: "La letra Đ mayúscula barrada modelada en voxels dorados de perfil industrial.",
    voxelBlocks: [
      "    ▄████████▄▄     ",
      "    ██  ▀▀▀▀████▄   ",
      "  ████████████████  ",
      "    ██      ████▀   ",
      "  ████████████████  ",
      "    ██  ▄▄▄▄████▀   ",
      "    ▀████████▀▀     ",
    ],
  },

  // --- STABLECOINS ---
  {
    id: "USDT",
    name: "Tether USD",
    symbol: "USDT",
    category: "stablecoin",
    chain: "Multi-Chain (Omni/ERC/TRC/AVAX)",
    pegType: "fiat",
    price: "$1.000",
    change24h: "+0.02%",
    isPositive: true,
    colorHex: 0x0f766e,
    highlightHex: 0x5eead4,
    accentColor: "#26A17B",
    glowColor: "rgba(38, 161, 123, 0.45)",
    contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    description: "Pilar de bóveda en T extruido sobre disco esmeralda con marco rectangular de reserva.",
    voxelBlocks: [
      "   ▄████████████▄   ",
      "   ██████████████   ",
      "        ████        ",
      "     ▄████████▄     ",
      "     ██  ██  ██     ",
      "     ▀████████▀     ",
      "        ████        ",
      "        ████        ",
    ],
  },
  {
    id: "USDC",
    name: "USD Coin",
    symbol: "USDC",
    category: "stablecoin",
    chain: "Circle Standard EVM/Solana",
    pegType: "fiat",
    price: "$0.9999",
    change24h: "-0.01%",
    isPositive: false,
    colorHex: 0x1d4ed8,
    highlightHex: 0x93c5fd,
    accentColor: "#2775CA",
    glowColor: "rgba(39, 117, 202, 0.45)",
    contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    description: "Muralla concéntrica de cubos con símbolo de dólar $ central elevado.",
    voxelBlocks: [
      "     ▄████████▄     ",
      "    ███  ██  ███    ",
      "   ███  ▄██▄  ███   ",
      "   ███  ▀██▀  ███   ",
      "    ███  ██  ███    ",
      "     ▀████████▀     ",
    ],
  },
  {
    id: "DAI",
    name: "MakerDAO Dai",
    symbol: "DAI",
    category: "stablecoin",
    chain: "Ethereum / Sky Protocol",
    pegType: "crypto-collateral",
    price: "$1.0001",
    change24h: "+0.01%",
    isPositive: true,
    colorHex: 0xb45309,
    highlightHex: 0xfde68a,
    accentColor: "#F5AC37",
    glowColor: "rgba(245, 172, 55, 0.45)",
    contract: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    description: "Doble puente transversal en relieve sobre la estructura arqueada de Maker.",
    voxelBlocks: [
      "   ▄██████████▄     ",
      "   ██  ████  ██     ",
      "  ██████████████    ",
      "   ██  ████  ██     ",
      "  ██████████████    ",
      "   ██  ████  ██     ",
      "   ▀██████████▀     ",
    ],
  },
  {
    id: "ARGT",
    name: "ARGt Stablecoin",
    symbol: "ARGt",
    category: "stablecoin",
    chain: "Avalanche C-Chain / Belo",
    pegType: "latam-peso",
    price: "$0.00085",
    change24h: "+0.00%",
    isPositive: true,
    colorHex: 0x0284c7,
    highlightHex: 0xfef08a,
    accentColor: "#74ACDF",
    glowColor: "rgba(116, 172, 223, 0.5)",
    contract: "0x78923a9d45e56d7821cba1029487c02b89f2a4",
    description: "Sol de Mayo con rayos radiales de cubos y bóveda de liquidación ARS para el Smart Escrow de HackTwin.",
    voxelBlocks: [
      "     ▀   ██   ▀     ",
      "   ▀   ▄████▄   ▀   ",
      "  ██ ▄████████▄ ██  ",
      "  ██ ▀████████▀ ██  ",
      "   ▄   ▀████▀   ▄   ",
      "     ▄   ██   ▄     ",
    ],
  },
];

// Generador de audio de micro-clicks táctiles (Web Audio API)
class SoundFx {
  private ctx: AudioContext | null = null;
  public enabled = true;

  playClick(pitch = 750) {
    if (!this.enabled || typeof window === "undefined") return;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.2, this.ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch {
      // AudioContext bloqueado
    }
  }
}

const sfx = new SoundFx();

// ============================================================================
// COMPONENTE: VISOR 3D VOXEL COIN HERO (THREE.JS R186 - REFERENCIA PINTEREST)
// ============================================================================

interface VoxelCoinHeroProps {
  token: CryptoToken;
  theme: PosterTheme;
}

function VoxelCoinHero({ token, theme }: VoxelCoinHeroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const coinGroupRef = useRef<THREE.Group | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);

  const GRID_SIZE = 32;
  const CUBE_SIZE = 0.12;
  const STEP = CUBE_SIZE + 0.012;
  const RADIUS = (GRID_SIZE / 2) * STEP * 0.94;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Escena y Cámara con perspectiva isométrica
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, -0.4, 5.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = theme === "cobalt" ? 1.35 : 1.15;
    rendererRef.current = renderer;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. Luces PBR para marcar biseles y sombras de los cubos
    const ambientLight = new THREE.AmbientLight(0xffffff, theme === "cobalt" ? 0.75 : 0.45);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(5, 7, 6);
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0xffffff, 1.8);
    rim.position.set(-5, -4, 3);
    scene.add(rim);

    const pointLight = new THREE.PointLight(token.colorHex, 4.0, 10);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);
    pointLightRef.current = pointLight;

    // 3. Grupo de la Moneda Voxel
    const coinGroup = new THREE.Group();
    coinGroupRef.current = coinGroup;
    scene.add(coinGroup);

    // Ángulo isométrico inicial idéntico a la imagen de Pinterest
    coinGroup.rotation.x = 0.45;
    coinGroup.rotation.y = -0.35;

    // Geometría y Material de los Cubos
    const maxInstances = GRID_SIZE * GRID_SIZE;
    const cubeGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.35,
      roughness: 0.25,
    });

    const instancedMesh = new THREE.InstancedMesh(cubeGeo, cubeMat, maxInstances);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    coinGroup.add(instancedMesh);
    instancedMeshRef.current = instancedMesh;

    // Nube de partículas cúbicas dispersas alrededor
    const dustCount = 70;
    const dustGeo = new THREE.BoxGeometry(CUBE_SIZE * 0.7, CUBE_SIZE * 0.7, CUBE_SIZE * 0.7);
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
    const dustMesh = new THREE.InstancedMesh(dustGeo, dustMat, dustCount);
    coinGroup.add(dustMesh);

    const dustDummy = new THREE.Object3D();
    const dustList: Array<{ x: number; y: number; z: number; angle: number; speed: number }> = [];
    for (let i = 0; i < dustCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = RADIUS * 1.12 + Math.random() * 1.0;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r - Math.random() * 0.7;
      const z = (Math.random() - 0.5) * 1.2;
      dustList.push({ x, y, z, angle, speed: 0.002 + Math.random() * 0.005 });
      dustDummy.position.set(x, y, z);
      dustDummy.scale.setScalar(0.4 + Math.random() * 0.7);
      dustDummy.updateMatrix();
      dustMesh.setMatrixAt(i, dustDummy.matrix);
    }
    dustMesh.instanceMatrix.needsUpdate = true;

    // Función constructora del relieve de la moneda
    const dummy = new THREE.Object3D();
    const tempCol = new THREE.Color();
    const half = GRID_SIZE / 2;

    const buildMesh = (tok: CryptoToken) => {
      let idx = 0;
      for (let ix = 0; ix < GRID_SIZE; ix++) {
        for (let iy = 0; iy < GRID_SIZE; iy++) {
          const u = (ix - half + 0.5) / half;
          const v = (iy - half + 0.5) / half;
          const dist = Math.hypot(u, v);

          if (dist <= 0.94) {
            let h = 1.0; // Altura base

            // Micro-variación arquitectónica de superficie
            const noise = (Math.sin(u * 16) * Math.cos(v * 16) + 1) * 0.5;
            if (noise > 0.84) h += 0.24;

            // Esculpido según el token
            if (tok.id === "ETH") {
              const absU = Math.abs(u);
              if (v >= 0.04 && v <= 0.65) {
                const w = 0.44 * (1.0 - (v - 0.04) / 0.61);
                if (absU <= w) {
                  h += 1.3 + (1.0 - absU / (w + 0.01)) * 0.9;
                  if (u > 0) h += 0.25;
                }
              }
              if (v <= -0.04 && v >= -0.65) {
                const w = 0.44 * (1.0 - (-v - 0.04) / 0.61);
                if (absU <= w) {
                  h += 1.1 + (1.0 - absU / (w + 0.01)) * 0.7;
                  if (u > 0) h += 0.25;
                }
              }
            } else if (tok.id === "BTC") {
              const absU = Math.abs(u);
              if (absU < 0.22 && (Math.abs(v) > 0.55 && Math.abs(v) < 0.72)) h += 1.1;
              if (u >= -0.28 && u <= -0.12 && Math.abs(v) <= 0.55) h += 1.35;
              if (u >= -0.12 && u <= 0.35 && Math.abs(v) <= 0.52) {
                const inTop = (u >= -0.02 && u <= 0.18 && v >= 0.16 && v <= 0.41);
                const inBot = (u >= -0.02 && u <= 0.22 && v >= -0.41 && v <= -0.08);
                if (!inTop && !inBot) h += 1.35;
              }
            } else if (tok.id === "SOL") {
              for (let b = -1; b <= 1; b++) {
                const dy = v - (b * 0.36 + u * 0.22);
                if (Math.abs(dy) < 0.11 && Math.abs(u) < 0.52) h += 1.3;
              }
            } else if (tok.id === "AVAX") {
              if (v >= -0.55 && v <= 0.65) {
                const hw = 0.55 * (1.0 - (v + 0.55) / 1.2);
                if (Math.abs(u) <= hw) {
                  const inInner = v >= -0.35 && v <= 0.45 && Math.abs(u) <= 0.22 * (1.0 - (v + 0.35) / 0.8);
                  if (!inInner) h += 1.4;
                }
              }
            } else {
              // Genérico / Stablecoins: Anillo exterior y monograma elevado
              if (dist >= 0.42 && dist <= 0.62) h += 1.25;
              if (Math.abs(u) <= 0.16 && Math.abs(v) <= 0.45) h += 1.4;
              if (Math.abs(v) <= 0.14 && Math.abs(u) <= 0.38) h += 1.3;
            }

            const posX = (ix - half) * STEP;
            const posY = (iy - half) * STEP;
            const posZ = (h * CUBE_SIZE) / 2;

            dummy.position.set(posX, posY, posZ);
            dummy.scale.set(1.0, 1.0, h);
            dummy.updateMatrix();

            instancedMesh.setMatrixAt(idx, dummy.matrix);

            // Shading de color por altura
            if (h > 2.0) {
              tempCol.set(tok.highlightHex);
            } else if (h > 1.2) {
              tempCol.set(tok.colorHex);
            } else {
              tempCol.set(theme === "cobalt" ? 0x0f2db0 : 0x18181b);
            }

            instancedMesh.setColorAt(idx, tempCol);
            idx++;
          }
        }
      }

      instancedMesh.count = idx;
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    };

    buildMesh(token);

    // 4. Interacción con Mouse: Inclinación 3D y Seguidor de Luz
    let targetRotX = 0.45;
    let targetRotY = -0.35;
    let currentRotX = targetRotX;
    let currentRotY = targetRotY;

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      targetRotY = -0.35 + nx * 0.9;
      targetRotX = 0.45 - ny * 0.7;

      pointLight.position.x = nx * 3.5;
      pointLight.position.y = -ny * 3.5;
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);

    // 5. Loop de Render con oscilación suave
    let animId: number;
    let clock = new THREE.Clock();

    const loop = () => {
      const elapsed = clock.getElapsedTime();

      currentRotX += (targetRotX + Math.sin(elapsed * 1.2) * 0.04 - currentRotX) * 0.08;
      currentRotY += (targetRotY + Math.cos(elapsed * 0.8) * 0.05 - currentRotY) * 0.08;

      coinGroup.rotation.x = currentRotX;
      coinGroup.rotation.y = currentRotY;

      // Partículas flotantes
      for (let i = 0; i < dustCount; i++) {
        const d = dustList[i];
        d.angle += d.speed;
        const currentR = RADIUS * 1.12 + Math.sin(elapsed * 2.0 + i) * 0.2;
        dustDummy.position.set(
          Math.cos(d.angle) * currentR,
          Math.sin(d.angle) * currentR - 0.2,
          d.z + Math.cos(elapsed + i) * 0.1
        );
        dustDummy.updateMatrix();
        dustMesh.setMatrixAt(i, dustDummy.matrix);
      }
      dustMesh.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(loop);
    };

    loop();

    const onResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      cubeGeo.dispose();
      cubeMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
    };
  }, [token, theme]);

  return (
    <div className="relative w-full h-[400px] md:h-[460px] flex items-center justify-center overflow-hidden rounded-2xl">
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing z-10" />

      {/* Indicador de Ayuda */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-none flex items-center gap-2 text-[11px] font-mono opacity-80">
        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
        <span>HOVER: TILT 3D // RAYCASTER EMBOSS</span>
      </div>

      <div className="absolute bottom-3 right-4 z-20 pointer-events-none text-right text-[11px] font-mono opacity-80">
        <span>ESTÁNDAR: VOXEL INSTANCED MESH (R186)</span>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: TABLERO CRYPTO VOXEL (ESTÉTICA PINTEREST PIN)
// ============================================================================

export function CryptoAsciiBoard() {
  const [selectedId, setSelectedId] = useState<string>("ETH");
  const [category, setCategory] = useState<CryptoCategory>("all");
  const [theme, setTheme] = useState<PosterTheme>("cobalt");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const selectedToken = useMemo(() => {
    return CRYPTO_REGISTRY.find((t) => t.id === selectedId) || CRYPTO_REGISTRY[0];
  }, [selectedId]);

  const filteredTokens = useMemo(() => {
    if (category === "all") return CRYPTO_REGISTRY;
    return CRYPTO_REGISTRY.filter((t) => t.category === category);
  }, [category]);

  const toggleSound = () => {
    sfx.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleSelectToken = (tok: CryptoToken) => {
    sfx.playClick(tok.category === "stablecoin" ? 880 : 640);
    setSelectedId(tok.id);
  };

  return (
    <div
      className={`w-full max-w-6xl mx-auto rounded-3xl transition-colors duration-500 overflow-hidden border-4 shadow-2xl ${
        theme === "cobalt"
          ? "bg-[#0b3fe6] text-white border-black"
          : "bg-[#09090b] text-zinc-100 border-zinc-800"
      }`}
    >
      {/* ═══ 1. POSTER HEADER: ESTILO SEGMINT 2023 / PINTEREST ═══ */}
      <div className="p-6 md:p-10 text-center relative z-20">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest opacity-80 mb-3">
          <span>[ THREE.JS R186 ]</span>
          <span>• 3D VOXEL COIN ENGINE •</span>
          <span>[ PIN #636063 ]</span>
        </div>

        {/* Título Principal con Silkscreen Pixel Font */}
        <h1 className="font-pixel text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
          THANKS FOR WATCH
        </h1>

        {/* Barra de Herramientas y Selectores de Moneda Voxel */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {CRYPTO_REGISTRY.map((tok) => {
            const isSel = tok.id === selectedId;
            return (
              <button
                key={tok.id}
                onClick={() => handleSelectToken(tok)}
                className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider rounded border-2 transition-all cursor-pointer select-none ${
                  isSel
                    ? "bg-white text-blue-700 border-white shadow-[2px_2px_0px_#000000] translate-x-0.5 translate-y-0.5"
                    : "bg-black/30 hover:bg-black/50 text-white border-white/60 hover:border-white shadow-[3px_3px_0px_#000000]"
                }`}
              >
                {tok.symbol}
              </button>
            );
          })}
        </div>

        {/* Controles de Tema y Audio */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs font-mono">
          <button
            onClick={() => setTheme(theme === "cobalt" ? "carbon" : "cobalt")}
            className="flex items-center gap-1.5 px-3 py-1 bg-black/40 hover:bg-black/60 rounded border border-white/40 transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Tema: {theme === "cobalt" ? "Azul Segmint" : "Carbon Negro"}</span>
          </button>

          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-3 py-1 bg-black/40 hover:bg-black/60 rounded border border-white/40 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Audio {soundEnabled ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* ═══ 2. HERO: ESCENARIO 3D VOXEL DE LA MONEDA SELECCIONADA ═══ */}
      <div className="relative px-4 sm:px-8">
        <VoxelCoinHero token={selectedToken} theme={theme} />
      </div>

      {/* ═══ 3. ZONA DE TRANSICIÓN: DISPERSIÓN DE PÍXELES DEL PÓSTER ═══ */}
      <div className="relative w-full h-12 overflow-hidden flex justify-center items-end gap-1 pointer-events-none opacity-80">
        <div className="w-3 h-3 bg-[#f0f3f8] mb-2" />
        <div className="w-4 h-4 bg-[#f0f3f8] mb-4" />
        <div className="w-5 h-5 bg-[#f0f3f8] mb-1" />
        <div className="w-3 h-3 bg-[#f0f3f8] mb-5" />
        <div className="w-4 h-4 bg-[#f0f3f8] mb-3" />
        <div className="w-6 h-6 bg-[#f0f3f8] mb-1" />
        <div className="w-4 h-4 bg-[#f0f3f8] mb-4" />
        <div className="w-3 h-3 bg-[#f0f3f8] mb-2" />
        <div className="w-5 h-5 bg-[#f0f3f8] mb-6" />
        <div className="w-4 h-4 bg-[#f0f3f8] mb-2" />
      </div>

      {/* ═══ 4. PANEL INFERIOR EDITORIAL & TABLERO DE CARDS VOXEL ═══ */}
      <div className="w-full bg-[#f0f3f8] text-[#0a0b10] p-6 sm:p-10 border-t-4 border-black">
        {/* Cabecera Editorial Segmint 2026 */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b-2 border-zinc-300">
          <div>
            <div className="font-pixel text-3xl sm:text-4xl font-bold tracking-tight text-blue-700">
              SEGMINT 2026
            </div>
            <p className="text-xs font-sans tracking-wide text-zinc-600 mt-1 max-w-md">
              MARKETING & WEB3 PROTOCOL APPROACH WITH VOXEL RELIEF AND THREE.JS R186 ENGINE
            </p>
          </div>

          {/* Filtros de Categoría */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setCategory("all")}
              className={`px-3 py-1.5 rounded border border-black transition-colors ${
                category === "all" ? "bg-black text-white" : "bg-white text-black hover:bg-zinc-200"
              }`}
            >
              Todas ({CRYPTO_REGISTRY.length})
            </button>
            <button
              onClick={() => setCategory("crypto")}
              className={`px-3 py-1.5 rounded border border-black transition-colors ${
                category === "crypto" ? "bg-black text-white" : "bg-white text-black hover:bg-zinc-200"
              }`}
            >
              Criptos L1/L2
            </button>
            <button
              onClick={() => setCategory("stablecoin")}
              className={`px-3 py-1.5 rounded border border-black transition-colors ${
                category === "stablecoin" ? "bg-black text-white" : "bg-white text-black hover:bg-zinc-200"
              }`}
            >
              Stablecoins
            </button>
          </div>
        </div>

        {/* Grilla de Tarjetas Voxel 3D */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
          {filteredTokens.map((tok) => {
            const isSel = tok.id === selectedId;
            return (
              <div
                key={tok.id}
                onClick={() => handleSelectToken(tok)}
                className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isSel
                    ? "bg-white border-blue-600 shadow-[4px_4px_0px_#0033cc] translate-x-0.5 translate-y-0.5"
                    : "bg-white border-zinc-300 hover:border-black shadow-[3px_3px_0px_#000000]"
                }`}
              >
                <div>
                  {/* Header de la card */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-base text-black">{tok.symbol}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-black/20 bg-zinc-100 text-zinc-700">
                          {tok.category === "stablecoin" ? "STABLE" : "L1/L2"}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 font-sans">{tok.name}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-black">{tok.price}</div>
                      <div className={`font-mono text-[10px] ${tok.isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                        {tok.change24h}
                      </div>
                    </div>
                  </div>

                  {/* Representación Voxel 3D de Alta Densidad */}
                  <div className="my-4 py-3 flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800">
                    <pre
                      className="font-mono text-[9px] leading-[11px] text-center font-bold tracking-tight"
                      style={{ color: tok.accentColor }}
                    >
                      {tok.voxelBlocks.join("\n")}
                    </pre>
                  </div>

                  <p className="text-[11px] font-sans text-zinc-600 leading-snug line-clamp-2">
                    {tok.description}
                  </p>
                </div>

                {/* Footer de la card */}
                <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span className="truncate max-w-[120px]">{tok.chain}</span>
                  <span className="text-blue-600 font-bold hover:underline flex items-center gap-0.5">
                    <span>Modelar 3D</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Técnico */}
        <div className="mt-12 pt-6 border-t-2 border-zinc-300 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-600 gap-4">
          <div>( WEB 3 ) ( NFT ) ( THREE.JS R186 INSTANCED MESH )</div>
          <div>© HACKTWIN CREATIVE LABS • SEGMINT PIN #636063147423013825</div>
        </div>
      </div>
    </div>
  );
}
