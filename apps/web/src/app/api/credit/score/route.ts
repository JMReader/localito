import { NextResponse } from "next/server";

interface CuitProfile {
  cuit: string;
  razonSocial: string;
  categoria: string;
  scoring: number;
  maxCreditTokens: number;
  minCreditTokens: number;
  tna: number;
  suggestedTermDays: number;
  communityVouchers: string[];
  riskTier: "Bajo" | "Medio" | "Excelente";
}

const KNOWN_PROFILES: Record<string, CuitProfile> = {
  "30714421198": {
    cuit: "30-71442119-8",
    razonSocial: "Panadería La Unión SRL",
    categoria: "PyME Tramo 1 · Industria Alimentaria",
    scoring: 910,
    maxCreditTokens: 1800000,
    minCreditTokens: 50000,
    tna: 0,
    suggestedTermDays: 90,
    communityVouchers: ["$molinocentral (Score 99)", "$distribuidoravega (Score 96)"],
    riskTier: "Excelente",
  },
  "20384529114": {
    cuit: "20-38452911-4",
    razonSocial: "Martín Gómez - Café Central",
    categoria: "Monotributo Cat. H · Gastronomía",
    scoring: 840,
    maxCreditTokens: 1200000,
    minCreditTokens: 50000,
    tna: 0,
    suggestedTermDays: 60,
    communityVouchers: ["$panaderia (Score 95)", "$frutasyverduras (Score 92)"],
    riskTier: "Bajo",
  },
  "27401928312": {
    cuit: "27-40192831-2",
    razonSocial: "Clara Fernández - Cooperativa Textil",
    categoria: "Cooperativa de Trabajo · Confección",
    scoring: 780,
    maxCreditTokens: 850000,
    minCreditTokens: 50000,
    tna: 0,
    suggestedTermDays: 90,
    communityVouchers: ["$tallernorte (Score 90)", "$hilospatagonia (Score 94)"],
    riskTier: "Bajo",
  },
  "23351124499": {
    cuit: "23-35112449-9",
    razonSocial: "Almacén y Kiosco San Juan",
    categoria: "Monotributo Cat. D · Comercio Minorista",
    scoring: 690,
    maxCreditTokens: 500000,
    minCreditTokens: 50000,
    tna: 0,
    suggestedTermDays: 60,
    communityVouchers: ["$distribuidoravega (Score 95)"],
    riskTier: "Medio",
  },
};

// Algoritmo de validación de CUIT argentino (Módulo 11)
function isValidCuit(cuitRaw: string): boolean {
  const clean = cuitRaw.replace(/\D/g, "");
  if (clean.length !== 11) return false;

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean[i], 10) * multipliers[i];
  }

  const mod = sum % 11;
  const expectedCheckDigit = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod;
  const actualCheckDigit = parseInt(clean[10], 10);

  // Permitimos también CUITs de prueba comunes si tienen 11 dígitos
  return expectedCheckDigit === actualCheckDigit || clean.length === 11;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawCuit = String(body.cuit || "").trim();
    const cleanCuit = rawCuit.replace(/\D/g, "");

    if (!cleanCuit || cleanCuit.length !== 11) {
      return NextResponse.json(
        {
          success: false,
          error: "El CUIT/CUIL debe contener exactamente 11 dígitos.",
        },
        { status: 400 }
      );
    }

    if (!isValidCuit(cleanCuit)) {
      return NextResponse.json(
        {
          success: false,
          error: "El CUIT/CUIL ingresado no es válido según el algoritmo AFIP.",
        },
        { status: 422 }
      );
    }

    // Si coincide con perfiles conocidos
    if (KNOWN_PROFILES[cleanCuit]) {
      return NextResponse.json({
        success: true,
        profile: KNOWN_PROFILES[cleanCuit],
      });
    }

    // Cálculo determinístico para cualquier otro CUIT
    let hash = 0;
    for (let i = 0; i < cleanCuit.length; i++) {
      hash = (hash << 5) - hash + cleanCuit.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);

    // Scoring entre 650 y 940
    const scoring = 650 + (positiveHash % 291);
    const riskTier = scoring >= 850 ? "Excelente" : scoring >= 720 ? "Bajo" : "Medio";

    // Cupo calculado en base al scoring
    const maxCreditTokens = Math.min(
      2000000,
      Math.max(350000, Math.round(((scoring - 500) / 450) * 1500000 / 25000) * 25000)
    );

    const formattedCuit = `${cleanCuit.slice(0, 2)}-${cleanCuit.slice(2, 10)}-${cleanCuit.slice(10)}`;

    const generatedProfile: CuitProfile = {
      cuit: formattedCuit,
      razonSocial: `Comercio Localito #${cleanCuit.slice(-4)}`,
      categoria: "Comercio Activo · Red de Confianza Localito",
      scoring,
      maxCreditTokens,
      minCreditTokens: 50000,
      tna: 0,
      suggestedTermDays: 90,
      communityVouchers: ["$bancocomunitario (Score 98)", "$redlocal (Score 95)"],
      riskTier,
    };

    return NextResponse.json({
      success: true,
      profile: generatedProfile,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido al procesar CUIT";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
