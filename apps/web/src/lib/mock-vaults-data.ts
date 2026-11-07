/* ═══════════════════════════════════════════════════════════════════════════
   DATASET MAESTRO ONCHAIN // CRITERIALOCK & TWIN FINANCE (AVALANCHE C-CHAIN)
   Rampas de Glifos ASCII, Activos Stablecoin (ARGt / USDT / USDC / BRAt)
   y Registros de Bóvedas de Bloqueo de Plata con Bloques Estilo Notion.
   ═══════════════════════════════════════════════════════════════════════════ */

export type GlyphRampKey = "Classic" | "Blocks" | "Dots" | "Binary";

export const ASCII_RAMPS: Record<GlyphRampKey, readonly string[]> = {
  Classic: [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"],
  Blocks: [" ", "·", "░", "▒", "▓", "█"],
  Dots: [" ", "·", "•", "●"],
  Binary: [" ", ".", ":", "0", "1"],
};

/* ── Paletas Principales Extraídas del Tablero de Pinterest "twin" ──────────
   1. Segmint Electric Cobalt (#0047FF): Pin #5 (Segmint 2023), Pin #1 (Dashboard),
      Pin #15 (Build Web Onchain) y Pin #19 (Born to Build DAO).
   2. Signal Acid Green (#1FE05A): Pin #4 (Squircle Verde Ácido), Pin #19 (DAO Lime)
      y estética cripto-fintech de Lemon Cash Argentina.
   3. Physical Cyber Cyan (#00F0FF): Pin #11 (The Physical Data Platform).
   4. Thermal Solar Amber (#F59E0B): Pin #11 (Núcleo Térmico) & Voxel Gold.
   5. Carbon Monochrome (#FFFFFF): Pin #2, #3, #6, #8 (Halftone ASCII puro).
   ─────────────────────────────────────────────────────────────────────────── */
export type PinterestPaletteKey =
  | "cobalt"
  | "emerald"
  | "cyan"
  | "amber"
  | "monochrome";

export interface PinterestPaletteConfig {
  id: PinterestPaletteKey;
  label: string;
  shortLabel: string;
  pinSource: string;
  primaryHex: string;
  brightHex: string;
  iceHex: string;
  contrastInk: "#FFFFFF" | "#000000";
  spherePaletteIndex: number;
}

export const PINTEREST_PALETTES: Record<
  PinterestPaletteKey,
  PinterestPaletteConfig
> = {
  cobalt: {
    id: "cobalt",
    label: "Segmint Cobalt",
    shortLabel: "Cobalt #0047FF",
    pinSource: "Pin #05 Segmint 2023 & Pin #19 DAO",
    primaryHex: "#0047FF",
    brightHex: "#3B82F6",
    iceHex: "#93C5FD",
    contrastInk: "#FFFFFF",
    spherePaletteIndex: 1,
  },
  emerald: {
    id: "emerald",
    label: "Signal Acid Lime",
    shortLabel: "Acid #1FE05A",
    pinSource: "Pin #04 Signal Green & Lemon Cash",
    primaryHex: "#1FE05A",
    brightHex: "#34D399",
    iceHex: "#A7F3D0",
    contrastInk: "#000000",
    spherePaletteIndex: 3,
  },
  cyan: {
    id: "cyan",
    label: "Physical Cyan",
    shortLabel: "Cyan #00F0FF",
    pinSource: "Pin #11 Physical Data Platform",
    primaryHex: "#00D8EC",
    brightHex: "#22D3EE",
    iceHex: "#A5F3FC",
    contrastInk: "#000000",
    spherePaletteIndex: 2,
  },
  amber: {
    id: "amber",
    label: "Thermal Amber",
    shortLabel: "Amber #F59E0B",
    pinSource: "Pin #11 Thermal Spectrum",
    primaryHex: "#F59E0B",
    brightHex: "#FBBF24",
    iceHex: "#FDE68A",
    contrastInk: "#000000",
    spherePaletteIndex: 4,
  },
  monochrome: {
    id: "monochrome",
    label: "Carbon Halftone",
    shortLabel: "Mono #FFFFFF",
    pinSource: "Pin #02 & #06 ASCII Halftone",
    primaryHex: "#FFFFFF",
    brightHex: "#E4E4E7",
    iceHex: "#FFFFFF",
    contrastInk: "#000000",
    spherePaletteIndex: 0,
  },
};

export type SupportedCurrency = "ARGt" | "USDT" | "USDC" | "BRAt";

export type OracleType =
  | "github-ci"
  | "figma-sign"
  | "ai-arbitrator"
  | "logistics-qr"
  | "multisig"
  | "slither-audit";

export interface NotionCriteriaBlock {
  id: string;
  code: string;
  title: string;
  oracleType: OracleType;
  oracleLabel: string;
  quorumProp: string;
  targetHash: string;
  status: "verified" | "pending" | "verifying";
  verifiedBlock?: string;
}

export interface VaultRecord {
  id: string;
  title: string;
  category: string;
  clientName: string;
  clientAddress: string;
  beneficiaryName: string;
  beneficiaryAddress: string;
  amountNumeric: number;
  amountFormatted: string;
  currency: SupportedCurrency;
  criteriaPassed: number;
  criteriaTotal: number;
  oracleEngine: string;
  status: "CUSTODIA_ACTIVA" | "VALIDANDO_ORACULO" | "LIBERADO";
  createdAt: string;
  txHash: string;
  blockNumber: string;
  asciiSeed: string;
  summary: string;
  criteriaList: NotionCriteriaBlock[];
  activityTimeline: Array<{
    time: string;
    title: string;
    detail: string;
    isHighlight?: boolean;
  }>;
}

export interface StablecoinAsset {
  id: string;
  symbol: string;
  name: string;
  issuer: string;
  category: "local-twin" | "usd-stable" | "infra";
  pegLabel: string;
  asciiGlyph: string;
  settlementTime: string;
  networkFee: string;
  contractShort: string;
  arsEquivalent: number;
  volumeLocked: string;
  description: string;
  asciiSparkline: string;
  accentColor: string;
  highlightColor: string;
}

export const CURRENCY_RATES_TO_ARS: Record<SupportedCurrency, number> = {
  ARGt: 1,
  USDT: 1180,
  USDC: 1180,
  BRAt: 205,
};

export const STABLECOIN_ASSETS: StablecoinAsset[] = [
  {
    id: "argt",
    symbol: "ARGt",
    name: "Peso Argentino Digital",
    issuer: "Twin Finance",
    category: "local-twin",
    pegLabel: "PEG 1:1 ARS // COLATERALIZADO",
    asciiGlyph: "A$",
    settlementTime: "0.78 seg",
    networkFee: "< $0.004",
    contractShort: "0x794A...3e82",
    arsEquivalent: 1,
    volumeLocked: "$ 148,500,000 ARGt",
    description:
      "Moneda local tokenizada 1:1 por Twin Finance sobre Avalanche. Ideal para bloquear honorarios, alquileres y servicios locales sin fricción bancaria ni CBU bloqueados.",
    asciiSparkline: "══════════● 1.000",
    accentColor: "#3B82F6",
    highlightColor: "#93C5FD",
  },
  {
    id: "usdt",
    symbol: "USDT",
    name: "Tether USDt",
    issuer: "Tether Operations",
    category: "usd-stable",
    pegLabel: "PEG 1:1 USD // RESERVA GLOBAL",
    asciiGlyph: "₮",
    settlementTime: "0.82 seg",
    networkFee: "< $0.004",
    contractShort: "0x9702...846f",
    arsEquivalent: 1180,
    volumeLocked: "412,800 USDT",
    description:
      "El estándar de dólar digital más líquido de Argentina y LATAM. Protege el poder adquisitivo del contrato frente a la inflación mientras dura el desarrollo.",
    asciiSparkline: "══════════● 1.000",
    accentColor: "#1FE05A",
    highlightColor: "#86EFAC",
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    issuer: "Circle Native",
    category: "usd-stable",
    pegLabel: "PEG 1:1 USD // AUDITADO",
    asciiGlyph: "$",
    settlementTime: "0.80 seg",
    networkFee: "< $0.004",
    contractShort: "0xB97E...890d",
    arsEquivalent: 1180,
    volumeLocked: "195,400 USDC",
    description:
      "Dólar digital nativo en Avalanche C-Chain para contratos corporativos, agencias de software y auditorías internacionales B2B.",
    asciiSparkline: "══════════● 1.000",
    accentColor: "#388BFD",
    highlightColor: "#BAE6FD",
  },
  {
    id: "brat",
    symbol: "BRAt",
    name: "Real Brasileño Digital",
    issuer: "Twin Finance",
    category: "local-twin",
    pegLabel: "PEG 1:1 BRL // CROSS-BORDER",
    asciiGlyph: "R$",
    settlementTime: "0.85 seg",
    networkFee: "< $0.004",
    contractShort: "0x3c1F...92a1",
    arsEquivalent: 205,
    volumeLocked: "R$ 890,000 BRAt",
    description:
      "Riel directo entre Brasil y Argentina para exportadores PyME y desarrolladores que cobran desde San Pablo con liquidación automática a ARGt.",
    asciiSparkline: "══════════● 1.000",
    accentColor: "#22D3EE",
    highlightColor: "#A5F3FC",
  },
  {
    id: "dai",
    symbol: "DAI",
    name: "Dai Decentralized",
    issuer: "Sky / Maker Protocol",
    category: "usd-stable",
    pegLabel: "PEG 1:1 USD // ONCHAIN",
    asciiGlyph: "◈",
    settlementTime: "0.88 seg",
    networkFee: "< $0.005",
    contractShort: "0xd586...2475",
    arsEquivalent: 1180,
    volumeLocked: "84,200 DAI",
    description:
      "Stablecoin descentralizada colateralizada por contratos inteligentes. Cero riesgo de censura para fideicomisos autónomos.",
    asciiSparkline: "══════════● 1.000",
    accentColor: "#F59E0B",
    highlightColor: "#FDE68A",
  },
  {
    id: "avax",
    symbol: "AVAX",
    name: "Avalanche C-Chain",
    issuer: "Ava Labs",
    category: "infra",
    pegLabel: "FINALIDAD SUB-SEGUNDO",
    asciiGlyph: "▲",
    settlementTime: "0.75 seg",
    networkFee: "Nativo",
    contractShort: "ChainID: 43114",
    arsEquivalent: 34200,
    volumeLocked: "100% Uptime",
    description:
      "Motor de ejecución de CriteriaLock. Permite crear un bloqueo de plata y verificar oráculos con finalidad irreversible en menos de 1 segundo.",
    asciiSparkline: "··::==++**#▲ 43114",
    accentColor: "#3B82F6",
    highlightColor: "#93C5FD",
  },
];

export const CRITERIA_PRESETS: Array<Omit<NotionCriteriaBlock, "id" | "code">> = [
  {
    title: "Merge de Pull Request en rama main con 100% tests en verde",
    oracleType: "github-ci",
    oracleLabel: "GitHub Action CI",
    quorumProp: "Auto · SHA-256",
    targetHash: "0x8f4a...c91e",
    status: "pending",
  },
  {
    title: "Aprobación criptográfica del prototipo final en Figma",
    oracleType: "figma-sign",
    oracleLabel: "Firma 2/2 Cliente",
    quorumProp: "Multisig 2/2",
    targetHash: "0x3b12...a704",
    status: "pending",
  },
  {
    title: "Confirmación de recepción con escaneo de QR logístico Belo",
    oracleType: "logistics-qr",
    oracleLabel: "Oráculo Logístico QR",
    quorumProp: "Prueba Física",
    targetHash: "0x6d90...f11b",
    status: "pending",
  },
  {
    title: "Auditoría automática Slither sin vulnerabilidades críticas",
    oracleType: "slither-audit",
    oracleLabel: "Slither AST Judge",
    quorumProp: "Zero-High-Risk",
    targetHash: "0x9c21...e440",
    status: "pending",
  },
];

export const INITIAL_VAULTS: VaultRecord[] = [
  {
    id: "TW-8841",
    title: "Desarrollo MVP Pasarela de Pagos QR + Integración ARGt",
    category: "Desarrollo Software",
    clientName: "Fintech Austral S.A.",
    clientAddress: "0x4a91...88b2",
    beneficiaryName: "Estudio Binario (Buenos Aires)",
    beneficiaryAddress: "0x9f2c...31a0",
    amountNumeric: 2450000,
    amountFormatted: "2,450,000",
    currency: "ARGt",
    criteriaPassed: 2,
    criteriaTotal: 3,
    oracleEngine: "GitHub CI + Multisig 2/3",
    status: "CUSTODIA_ACTIVA",
    createdAt: "Hace 18 min",
    txHash: "0x794a8b1c...3e82",
    blockNumber: "#49,201,455",
    asciiSeed: "CriteriaLock-TW-8841",
    summary:
      "Fondos depositados y congelados en Avalanche C-Chain. Los primeros 2 criterios técnicos ya fueron validados automáticamente por el oráculo de GitHub Actions. Resta la firma del hito de aceptación UI.",
    criteriaList: [
      {
        id: "c-8841-1",
        code: "RULE-01",
        title: "Suite de Tests E2E pasando al 100% (Coverage > 92%)",
        oracleType: "github-ci",
        oracleLabel: "GitHub Action",
        quorumProp: "Auto · PR #142",
        targetHash: "0x8f4a...c91e",
        status: "verified",
        verifiedBlock: "Bloque #49,201,182",
      },
      {
        id: "c-8841-2",
        code: "RULE-02",
        title: "Auditoría estática Slither: 0 vulnerabilidades altas",
        oracleType: "slither-audit",
        oracleLabel: "Slither Oracle",
        quorumProp: "AST Verified",
        targetHash: "0x2d77...90a1",
        status: "verified",
        verifiedBlock: "Bloque #49,201,310",
      },
      {
        id: "c-8841-3",
        code: "RULE-03",
        title: "Firma de conformidad de entrega en producción (Vercel)",
        oracleType: "multisig",
        oracleLabel: "Firma 2/3",
        quorumProp: "Quórum 2 de 3",
        targetHash: "0x5e19...b220",
        status: "pending",
      },
    ],
    activityTimeline: [
      {
        time: "18:24:10",
        title: "Hito RULE-02 verificado por Slither Oracle",
        detail: "Hash de prueba anclado en Bloque #49,201,310",
        isHighlight: true,
      },
      {
        time: "18:11:42",
        title: "Hito RULE-01 superado vía GitHub Webhook",
        detail: "Commit 9f8a2c pasó 84/84 tests unitarios",
      },
      {
        time: "17:45:03",
        title: "Bloqueo de Plata constituido (2,450,000 ARGt)",
        detail: "Depositado por 0x4a91...88b2 en CriteriaLockEscrow.sol",
      },
    ],
  },
  {
    id: "TW-8839",
    title: "Exportación Lote 400 Cajas Malbec (Mendoza ➔ San Pablo)",
    category: "Comercio Exterior PyME",
    clientName: "Importadora Paulista Ltda.",
    clientAddress: "0x7c12...44f9",
    beneficiaryName: "Bodega Los Andes S.R.L.",
    beneficiaryAddress: "0x1d88...90e1",
    amountNumeric: 14800,
    amountFormatted: "14,800",
    currency: "USDT",
    criteriaPassed: 3,
    criteriaTotal: 3,
    oracleEngine: "Oráculo Aduana + GPS",
    status: "LIBERADO",
    createdAt: "Hace 42 min",
    txHash: "0x91c4f02a...7b11",
    blockNumber: "#49,200,890",
    asciiSeed: "Bodega-Andes-TW-8839",
    summary:
      "Operación de comercio transfronterizo sin carta de crédito bancaria. Al confirmarse el cruce aduanero en Paso de los Libres y el escaneo en depósito, el smart contract liberó los 14,800 USDT en 0.8 segundos.",
    criteriaList: [
      {
        id: "c-8839-1",
        code: "RULE-01",
        title: "Emisión de Carta de Porte Electrónica y Despacho AFIP",
        oracleType: "logistics-qr",
        oracleLabel: "API Aduana",
        quorumProp: "Doc #AF-9921",
        targetHash: "0x1a44...88c2",
        status: "verified",
        verifiedBlock: "Bloque #49,198,104",
      },
      {
        id: "c-8839-2",
        code: "RULE-02",
        title: "Telemetría GPS en frontera Uruguaiana verificada",
        oracleType: "ai-arbitrator",
        oracleLabel: "GPS Oracle",
        quorumProp: "Lat/Long OK",
        targetHash: "0x6b20...11f0",
        status: "verified",
        verifiedBlock: "Bloque #49,199,512",
      },
      {
        id: "c-8839-3",
        code: "RULE-03",
        title: "Escaneo de QR de recepción en almacén destino",
        oracleType: "logistics-qr",
        oracleLabel: "QR Firmado",
        quorumProp: "Firma Destino",
        targetHash: "0x9e01...44a9",
        status: "verified",
        verifiedBlock: "Bloque #49,200,890",
      },
    ],
    activityTimeline: [
      {
        time: "18:02:19",
        title: "PLATA LIBERADA AUTOMÁTICAMENTE (14,800 USDT)",
        detail: "Transferencia instantánea a 0x1d88...90e1 (Gas: $0.004)",
        isHighlight: true,
      },
      {
        time: "18:02:18",
        title: "Quórum 3/3 alcanzado tras escaneo QR en San Pablo",
        detail: "Verificación criptográfica completada en 780ms",
      },
    ],
  },
  {
    id: "TW-8835",
    title: "Diseño de Identidad Visual + Sistema de Componentes Figma",
    category: "Diseño UI/UX",
    clientName: "Protocolo Delta Labs",
    clientAddress: "0x3e09...12c4",
    beneficiaryName: "Octavio V. (Design Craft)",
    beneficiaryAddress: "0x8a55...77d2",
    amountNumeric: 1850000,
    amountFormatted: "1,850,000",
    currency: "ARGt",
    criteriaPassed: 2,
    criteriaTotal: 2,
    oracleEngine: "Figma Code Connect + Firma",
    status: "LIBERADO",
    createdAt: "Hace 1 hora",
    txHash: "0x44b8e110...9c04",
    blockNumber: "#49,199,120",
    asciiSeed: "Octavio-Design-TW-8835",
    summary:
      "Custodia para sprint de diseño de 2 semanas. Fondos asegurados desde el día 1 en ARGt y liberados tras la publicación de los tokens en Figma y el merge del design system.",
    criteriaList: [
      {
        id: "c-8835-1",
        code: "RULE-01",
        title: "Entrega de archivo maestro con variables y Auto-Layout",
        oracleType: "figma-sign",
        oracleLabel: "Figma Webhook",
        quorumProp: "Node Validated",
        targetHash: "0x77c1...09b3",
        status: "verified",
        verifiedBlock: "Bloque #49,198,900",
      },
      {
        id: "c-8835-2",
        code: "RULE-02",
        title: "Aprobación final del cliente sobre prototipo interactivo",
        oracleType: "multisig",
        oracleLabel: "Firma 2/2",
        quorumProp: "Firmado",
        targetHash: "0x55a0...32e1",
        status: "verified",
        verifiedBlock: "Bloque #49,199,120",
      },
    ],
    activityTimeline: [
      {
        time: "17:38:05",
        title: "Liquidación ejecutada: 1,850,000 ARGt",
        detail: "Acreditado en billetera del diseñador sin comisiones",
        isHighlight: true,
      },
    ],
  },
  {
    id: "TW-8831",
    title: "Auditoría de Seguridad Smart Contracts & Fuzzing Foundry",
    category: "Ciberseguridad",
    clientName: "VaultFi Protocol",
    clientAddress: "0x6f21...99a8",
    beneficiaryName: "ZeroSlop Security Group",
    beneficiaryAddress: "0x2b44...61c9",
    amountNumeric: 6500,
    amountFormatted: "6,500",
    currency: "USDC",
    criteriaPassed: 1,
    criteriaTotal: 3,
    oracleEngine: "AI Arbitrator + GitHub CI",
    status: "VALIDANDO_ORACULO",
    createdAt: "Hace 2 horas",
    txHash: "0x52d1a904...11e7",
    blockNumber: "#49,197,600",
    asciiSeed: "Audit-Foundry-TW-8831",
    summary:
      "Bóveda en USDC para auditoría adversaria de contratos. El primer entregable (suite de invariantes Foundry) está verificado; el oráculo evalúa actualmente el reporte final.",
    criteriaList: [
      {
        id: "c-8831-1",
        code: "RULE-01",
        title: "10,000 corridas de Fuzzing sin quiebre de invariantes",
        oracleType: "github-ci",
        oracleLabel: "Foundry CI",
        quorumProp: "10k Runs OK",
        targetHash: "0x90e2...14a8",
        status: "verified",
        verifiedBlock: "Bloque #49,197,990",
      },
      {
        id: "c-8831-2",
        code: "RULE-02",
        title: "Validación de cobertura determinista del 100% de archivos",
        oracleType: "ai-arbitrator",
        oracleLabel: "Coverage Ledger",
        quorumProp: "En revisión",
        targetHash: "0x31b8...77f2",
        status: "verifying",
      },
      {
        id: "c-8831-3",
        code: "RULE-03",
        title: "Verificación de parches de mitigación por el equipo cliente",
        oracleType: "multisig",
        oracleLabel: "Firma 2/2",
        quorumProp: "Pendiente",
        targetHash: "0x88d4...02c1",
        status: "pending",
      },
    ],
    activityTimeline: [
      {
        time: "18:30:00",
        title: "Oráculo evaluando Coverage Ledger SHA-256",
        detail: "Inspeccionando 24 contratos en Avalanche C-Chain",
        isHighlight: true,
      },
    ],
  },
  {
    id: "TW-8824",
    title: "Desarrollo de Agente Autónomo de Conciliación Contable",
    category: "IA & Automatización",
    clientName: "Grupo Logístico Sur",
    clientAddress: "0x9a10...55d3",
    beneficiaryName: "TwinLabs AI",
    beneficiaryAddress: "0x4c81...20b7",
    amountNumeric: 3200,
    amountFormatted: "3,200",
    currency: "USDT",
    criteriaPassed: 2,
    criteriaTotal: 3,
    oracleEngine: "Webhook API + Firma",
    status: "CUSTODIA_ACTIVA",
    createdAt: "Hace 3 horas",
    txHash: "0x19f3c882...6a20",
    blockNumber: "#49,195,410",
    asciiSeed: "Agent-AI-TW-8824",
    summary:
      "Custodia condicionada a la precisión del modelo en el dataset de prueba (>98% de facturas conciliadas sin intervención humana).",
    criteriaList: [
      {
        id: "c-8824-1",
        code: "RULE-01",
        title: "Despliegue de contenedor Docker en servidor privado",
        oracleType: "github-ci",
        oracleLabel: "Healthcheck OK",
        quorumProp: "HTTP 200",
        targetHash: "0x44f1...82a0",
        status: "verified",
        verifiedBlock: "Bloque #49,196,012",
      },
      {
        id: "c-8824-2",
        code: "RULE-02",
        title: "Benchmark sobre 500 facturas AFIP con precisión >= 98.5%",
        oracleType: "ai-arbitrator",
        oracleLabel: "Eval Harness",
        quorumProp: "99.1% Score",
        targetHash: "0x72a9...11c4",
        status: "verified",
        verifiedBlock: "Bloque #49,196,890",
      },
      {
        id: "c-8824-3",
        code: "RULE-03",
        title: "Sign-off operativo tras 48hs en entorno productivo",
        oracleType: "multisig",
        oracleLabel: "Firma Cliente",
        quorumProp: "En espera",
        targetHash: "0x15c0...99e2",
        status: "pending",
      },
    ],
    activityTimeline: [
      {
        time: "16:40:12",
        title: "Benchmark superado con 99.1% de exactitud",
        detail: "Oráculo de evaluación firmó el criterio RULE-02",
        isHighlight: true,
      },
    ],
  },
  {
    id: "TW-8819",
    title: "Producción Audiovisual & Motion Graphics 3D para Lanzamiento",
    category: "Creative Coding",
    clientName: "Lemonade Studio",
    clientAddress: "0x5b77...19a2",
    beneficiaryName: "Kinetix 3D Collective",
    beneficiaryAddress: "0x7e33...84f1",
    amountNumeric: 980000,
    amountFormatted: "980,000",
    currency: "ARGt",
    criteriaPassed: 2,
    criteriaTotal: 2,
    oracleEngine: "Hash Entrega + Firma",
    status: "LIBERADO",
    createdAt: "Hace 5 horas",
    txHash: "0x83a7d119...4f09",
    blockNumber: "#49,191,004",
    asciiSeed: "Kinetix-Motion-TW-8819",
    summary:
      "Bloqueo en pesos digitales ARGt para asegurar el pago del render final 4K a 60fps sin demoras administrativas.",
    criteriaList: [
      {
        id: "c-8819-1",
        code: "RULE-01",
        title: "Verificación de hash SHA-256 del master ProRes 4K",
        oracleType: "ai-arbitrator",
        oracleLabel: "Media Hash",
        quorumProp: "Verificado",
        targetHash: "0x61d2...40a1",
        status: "verified",
        verifiedBlock: "Bloque #49,190,800",
      },
      {
        id: "c-8819-2",
        code: "RULE-02",
        title: "Aprobación de dirección de arte y entrega de editables",
        oracleType: "figma-sign",
        oracleLabel: "Firma 2/2",
        quorumProp: "Aprobado",
        targetHash: "0x29f8...71b4",
        status: "verified",
        verifiedBlock: "Bloque #49,191,004",
      },
    ],
    activityTimeline: [
      {
        time: "14:15:33",
        title: "Fondos liberados (980,000 ARGt)",
        detail: "Liquidación inmediata en Avalanche C-Chain",
        isHighlight: true,
      },
    ],
  },
  {
    id: "TW-8812",
    title: "Suministro de Licencias SaaS y Migración Cloud B2B (Brasil-Arg)",
    category: "Infraestructura B2B",
    clientName: "NuvemTech Sao Paulo",
    clientAddress: "0x2d19...63e0",
    beneficiaryName: "AndesCloud Ingeniería",
    beneficiaryAddress: "0x6a90...41c8",
    amountNumeric: 45000,
    amountFormatted: "45,000",
    currency: "BRAt",
    criteriaPassed: 3,
    criteriaTotal: 4,
    oracleEngine: "Terraform CI + Multisig",
    status: "CUSTODIA_ACTIVA",
    createdAt: "Hace 6 horas",
    txHash: "0x67e2b401...8d33",
    blockNumber: "#49,188,210",
    asciiSeed: "Nuvem-BRAt-TW-8812",
    summary:
      "Contrato denominado en Reales Digitales (BRAt) de Twin Finance con liquidación programada al completar el cutover de base de datos sin downtime.",
    criteriaList: [
      {
        id: "c-8812-1",
        code: "RULE-01",
        title: "Plan de Terraform aplicado con 0 drift en producción",
        oracleType: "github-ci",
        oracleLabel: "Terraform CI",
        quorumProp: "State Verified",
        targetHash: "0x81a3...55d0",
        status: "verified",
        verifiedBlock: "Bloque #49,188,900",
      },
      {
        id: "c-8812-2",
        code: "RULE-02",
        title: "Prueba de estrés a 15,000 req/s con latencia p99 < 45ms",
        oracleType: "github-ci",
        oracleLabel: "k6 Load Oracle",
        quorumProp: "p99: 31ms",
        targetHash: "0x49c2...18f1",
        status: "verified",
        verifiedBlock: "Bloque #49,189,450",
      },
      {
        id: "c-8812-3",
        code: "RULE-03",
        title: "Auditoría de seguridad de bordes y WAF activa",
        oracleType: "slither-audit",
        oracleLabel: "Sec Audit",
        quorumProp: "Passed",
        targetHash: "0x10e9...63a4",
        status: "verified",
        verifiedBlock: "Bloque #49,190,110",
      },
      {
        id: "c-8812-4",
        code: "RULE-04",
        title: "Confirmación de cambio de DNS y ventana de estabilidad",
        oracleType: "multisig",
        oracleLabel: "Firma CTO",
        quorumProp: "Pendiente",
        targetHash: "0x94b1...27c0",
        status: "pending",
      },
    ],
    activityTimeline: [
      {
        time: "15:20:09",
        title: "Criterio 3/4 verificado (WAF & Edge Security)",
        detail: "75% del contrato validado onchain",
        isHighlight: true,
      },
    ],
  },
];
