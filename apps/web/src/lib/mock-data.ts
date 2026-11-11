/**
 * Datos semilla de la demo offline de localito.
 * Montos siempre en centavos enteros (10.000 TL = 1_000_000).
 */

export type MockRole = "member" | "merchant";
export type MovementDirection = "in" | "out";
export type MovementStatus = "completed" | "pending" | "failed";

export interface MockParticipantSeed {
  alias: string;
  displayName: string;
  avatar: string;
  role: MockRole;
  description: string;
  balanceCents: number;
  creditLimitCents: number;
}

export interface MovementTemplate {
  minutesAgo: number;
  direction: MovementDirection;
  counterpartyAlias: string;
  amountCents: number;
  note: string;
  status?: MovementStatus;
}

export interface MockMovementSeed {
  id: string;
  ownerAlias: string;
  direction: MovementDirection;
  counterpartyAlias: string;
  counterpartyName: string;
  amountCents: number;
  note: string;
  createdAt: string;
  balanceAfterCents: number;
  status: MovementStatus;
}

export const MOCK_PARTICIPANTS: MockParticipantSeed[] = [
  {
    alias: "ana",
    displayName: "Ana Ferraro",
    avatar: "🧉",
    role: "member",
    description: "Vecina del barrio · organiza la feria de los sábados",
    balanceCents: 1_845_000,
    creditLimitCents: 300_000,
  },
  {
    alias: "bruno",
    displayName: "Bruno Salas",
    avatar: "🎸",
    role: "member",
    description: "Músico y feriante · da clases de guitarra",
    balanceCents: 1_278_000,
    creditLimitCents: 250_000,
  },
  {
    alias: "kiosco",
    displayName: "Kiosco Doña Rosa",
    avatar: "🏪",
    role: "merchant",
    description: "Kiosco de la esquina · Av. San Martín 240",
    balanceCents: 2_430_000,
    creditLimitCents: 0,
  },
  {
    alias: "cafe",
    displayName: "Café La Verdad",
    avatar: "☕",
    role: "merchant",
    description: "Café de barrio · tueste propio",
    balanceCents: 985_000,
    creditLimitCents: 0,
  },
  {
    alias: "foto",
    displayName: "Estudio Lumen",
    avatar: "📸",
    role: "merchant",
    description: "Fotografía y revelado · retratos de la feria",
    balanceCents: 1_462_000,
    creditLimitCents: 0,
  },
  {
    alias: "huerta",
    displayName: "Huerta La Quinta",
    avatar: "🥬",
    role: "merchant",
    description: "Verdulería agroecológica · canasta semanal",
    balanceCents: 1_124_000,
    creditLimitCents: 0,
  },
];

/* Historial ordenado de más viejo a más nuevo por participante. */
const MOVEMENTS_BY_ALIAS: Record<string, MovementTemplate[]> = {
  ana: [
    { minutesAgo: 18_900, direction: "in", counterpartyAlias: "cafe", amountCents: 310_000, note: "Catering de la feria" },
    { minutesAgo: 14_600, direction: "out", counterpartyAlias: "kiosco", amountCents: 95_000, note: "Recarga de la SUBE" },
    { minutesAgo: 11_200, direction: "in", counterpartyAlias: "bruno", amountCents: 275_000, note: "Alquiler del puesto" },
    { minutesAgo: 8_400, direction: "out", counterpartyAlias: "huerta", amountCents: 186_000, note: "Compra de feria" },
    { minutesAgo: 6_700, direction: "out", counterpartyAlias: "cafe", amountCents: 42_000, note: "Cortado y tostadas" },
    { minutesAgo: 4_900, direction: "in", counterpartyAlias: "foto", amountCents: 150_000, note: "Fotos de la feria" },
    { minutesAgo: 3_150, direction: "out", counterpartyAlias: "kiosco", amountCents: 78_000, note: "Kiosco del barrio" },
    { minutesAgo: 2_300, direction: "in", counterpartyAlias: "foto", amountCents: 90_000, note: "Fotos para el grupo de vecinos" },
    { minutesAgo: 1_450, direction: "out", counterpartyAlias: "huerta", amountCents: 115_000, note: "Verdulería de la semana" },
    { minutesAgo: 610, direction: "in", counterpartyAlias: "bruno", amountCents: 320_000, note: "Clases de guitarra" },
    { minutesAgo: 140, direction: "out", counterpartyAlias: "cafe", amountCents: 48_500, note: "Café con leche y medialunas" },
  ],
  bruno: [
    { minutesAgo: 16_800, direction: "out", counterpartyAlias: "foto", amountCents: 86_000, note: "Revelado de fotos" },
    { minutesAgo: 12_400, direction: "in", counterpartyAlias: "kiosco", amountCents: 210_000, note: "Cobro de la peña" },
    { minutesAgo: 9_300, direction: "out", counterpartyAlias: "cafe", amountCents: 174_000, note: "Cena después del show" },
    { minutesAgo: 7_200, direction: "in", counterpartyAlias: "huerta", amountCents: 120_000, note: "Flete a la feria" },
    { minutesAgo: 5_600, direction: "out", counterpartyAlias: "kiosco", amountCents: 38_000, note: "Agua y pila" },
    { minutesAgo: 3_900, direction: "out", counterpartyAlias: "huerta", amountCents: 69_000, note: "Verdulería" },
    { minutesAgo: 2_750, direction: "in", counterpartyAlias: "foto", amountCents: 145_000, note: "Fotos del recital" },
    { minutesAgo: 1_900, direction: "out", counterpartyAlias: "kiosco", amountCents: 295_000, note: "Bebidas para la peña" },
    { minutesAgo: 780, direction: "in", counterpartyAlias: "ana", amountCents: 320_000, note: "Clases de guitarra" },
    { minutesAgo: 220, direction: "out", counterpartyAlias: "cafe", amountCents: 62_000, note: "Café y facturas" },
  ],
  kiosco: [
    { minutesAgo: 15_200, direction: "in", counterpartyAlias: "ana", amountCents: 265_000, note: "Venta de la peña" },
    { minutesAgo: 11_500, direction: "out", counterpartyAlias: "huerta", amountCents: 265_000, note: "Pedido de la semana" },
    { minutesAgo: 8_900, direction: "in", counterpartyAlias: "bruno", amountCents: 210_000, note: "Cobro de la peña" },
    { minutesAgo: 6_100, direction: "out", counterpartyAlias: "foto", amountCents: 190_000, note: "Fotos para el Instagram" },
    { minutesAgo: 4_800, direction: "in", counterpartyAlias: "ana", amountCents: 95_000, note: "Recarga de la SUBE" },
    { minutesAgo: 3_300, direction: "in", counterpartyAlias: "huerta", amountCents: 51_000, note: "Compras del mediodía" },
    { minutesAgo: 2_050, direction: "out", counterpartyAlias: "cafe", amountCents: 128_000, note: "Café para el local" },
    { minutesAgo: 1_260, direction: "in", counterpartyAlias: "foto", amountCents: 64_000, note: "Cigarrillos y cambio" },
    { minutesAgo: 540, direction: "in", counterpartyAlias: "bruno", amountCents: 38_000, note: "Agua y pila" },
    { minutesAgo: 130, direction: "in", counterpartyAlias: "ana", amountCents: 78_000, note: "Kiosco del barrio" },
  ],
  cafe: [
    { minutesAgo: 13_900, direction: "out", counterpartyAlias: "foto", amountCents: 150_000, note: "Fotos del menú" },
    { minutesAgo: 10_300, direction: "in", counterpartyAlias: "ana", amountCents: 310_000, note: "Catering de la feria" },
    { minutesAgo: 7_600, direction: "in", counterpartyAlias: "bruno", amountCents: 174_000, note: "Cena después del show" },
    { minutesAgo: 5_200, direction: "out", counterpartyAlias: "kiosco", amountCents: 64_000, note: "Insumos de limpieza" },
    { minutesAgo: 3_700, direction: "in", counterpartyAlias: "foto", amountCents: 89_000, note: "Desayuno de estudio" },
    { minutesAgo: 2_400, direction: "in", counterpartyAlias: "kiosco", amountCents: 128_000, note: "Café para el local" },
    { minutesAgo: 1_600, direction: "out", counterpartyAlias: "huerta", amountCents: 132_000, note: "Verdulería para la cocina" },
    { minutesAgo: 700, direction: "in", counterpartyAlias: "bruno", amountCents: 62_000, note: "Café y facturas" },
    { minutesAgo: 180, direction: "in", counterpartyAlias: "ana", amountCents: 48_500, note: "Café con leche y medialunas" },
  ],
  foto: [
    { minutesAgo: 15_800, direction: "in", counterpartyAlias: "huerta", amountCents: 110_000, note: "Book de la quinta" },
    { minutesAgo: 11_900, direction: "out", counterpartyAlias: "kiosco", amountCents: 54_000, note: "Pilas y tarjetas" },
    { minutesAgo: 8_100, direction: "in", counterpartyAlias: "bruno", amountCents: 145_000, note: "Fotos del recital" },
    { minutesAgo: 6_300, direction: "out", counterpartyAlias: "cafe", amountCents: 150_000, note: "Fotos del menú" },
    { minutesAgo: 4_600, direction: "in", counterpartyAlias: "ana", amountCents: 150_000, note: "Fotos de la feria" },
    { minutesAgo: 3_100, direction: "out", counterpartyAlias: "huerta", amountCents: 74_000, note: "Verdulería" },
    { minutesAgo: 1_850, direction: "in", counterpartyAlias: "kiosco", amountCents: 190_000, note: "Fotos para el Instagram" },
    { minutesAgo: 900, direction: "in", counterpartyAlias: "bruno", amountCents: 86_000, note: "Revelado de fotos" },
    { minutesAgo: 260, direction: "out", counterpartyAlias: "cafe", amountCents: 89_000, note: "Desayuno de estudio" },
  ],
  huerta: [
    { minutesAgo: 17_300, direction: "in", counterpartyAlias: "ana", amountCents: 186_000, note: "Compra de feria" },
    { minutesAgo: 12_200, direction: "out", counterpartyAlias: "bruno", amountCents: 120_000, note: "Flete a la feria" },
    { minutesAgo: 9_700, direction: "out", counterpartyAlias: "foto", amountCents: 110_000, note: "Book de la quinta" },
    { minutesAgo: 6_800, direction: "in", counterpartyAlias: "foto", amountCents: 74_000, note: "Verdulería" },
    { minutesAgo: 4_100, direction: "out", counterpartyAlias: "cafe", amountCents: 98_000, note: "Almuerzo de la quinta" },
    { minutesAgo: 2_900, direction: "in", counterpartyAlias: "bruno", amountCents: 69_000, note: "Verdulería" },
    { minutesAgo: 1_520, direction: "out", counterpartyAlias: "kiosco", amountCents: 51_000, note: "Compras del mediodía" },
    { minutesAgo: 680, direction: "in", counterpartyAlias: "cafe", amountCents: 132_000, note: "Verdulería para la cocina" },
    { minutesAgo: 110, direction: "in", counterpartyAlias: "ana", amountCents: 115_000, note: "Verdulería de la semana", status: "pending" },
  ],
};

const nameByAlias = (alias: string) =>
  MOCK_PARTICIPANTS.find((p) => p.alias === alias)?.displayName ?? alias;

/**
 * Materializa el seed con timestamps ISO relativos a `now` y calcula
 * `balanceAfterCents` hacia atrás desde el saldo actual, así todo el historial
 * cierra aritméticamente sin tener que escribir saldos a mano.
 */
export function buildMockSeed(now: number = Date.now()): {
  participants: MockParticipantSeed[];
  movements: MockMovementSeed[];
} {
  const participants = MOCK_PARTICIPANTS.map((p) => ({ ...p }));
  const movements: MockMovementSeed[] = [];

  for (const participant of participants) {
    const templates = MOVEMENTS_BY_ALIAS[participant.alias] ?? [];
    const ordered = [...templates].sort((a, b) => a.minutesAgo - b.minutesAgo);
    let running = participant.balanceCents;

    ordered.forEach((template, index) => {
      const status = template.status ?? "completed";
      movements.push({
        id: `mv_${participant.alias}_${String(index + 1).padStart(2, "0")}`,
        ownerAlias: participant.alias,
        direction: template.direction,
        counterpartyAlias: template.counterpartyAlias,
        counterpartyName: nameByAlias(template.counterpartyAlias),
        amountCents: template.amountCents,
        note: template.note,
        createdAt: new Date(now - template.minutesAgo * 60_000).toISOString(),
        balanceAfterCents: running,
        status,
      });

      // Un movimiento pendiente todavía no impactó en el saldo.
      if (status === "completed") {
        running -=
          template.direction === "in" ? template.amountCents : -template.amountCents;
      }
    });
  }

  return { participants, movements };
}
