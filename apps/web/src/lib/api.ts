import {
  buildMockSeed,
  type MockMovementSeed,
  type MockParticipantSeed,
} from "./mock-data";

export interface Participant {
  id: string;
  alias: string;
  display_name: string;
  role: "member" | "merchant";
  status: string;
  balance_cents: number;
  credit_limit_cents: number;
  available_cents: number;
  max_positive_cents: number;
  receive_capacity_cents: number;
}

export interface Transaction {
  id: string;
  direction: "in" | "out";
  counterparty: { alias: string; display_name: string };
  amount_cents: number;
  note?: string;
  created_at: string;
  balance_after_cents: number;
}

export interface PaymentTransaction {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  from: { id: string; alias: string; display_name: string };
  to: { id: string; alias: string; display_name: string };
  note?: string | null;
  created_at: string;
  balance_after_cents: number;
  counterparty_balance_after_cents: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface BalanceMovement {
  participant: Participant;
  movement: Transaction;
}

const STORAGE_KEY = "localito:mock:v1";
const STORE_VERSION = 1;
const TOKEN_PREFIX = "demo:";
const MIN_LATENCY_MS = 250;
const MAX_LATENCY_MS = 500;

const DEFAULT_BALANCE_CENTS = 1_000_000;
const DEFAULT_CREDIT_CENTS = 200_000;
const MEMBER_MAX_POSITIVE_CENTS = 5_000_000;
const MERCHANT_MAX_POSITIVE_CENTS = 10_000_000;

interface MockParticipantRecord {
  id: string;
  alias: string;
  display_name: string;
  avatar: string;
  description: string;
  role: "member" | "merchant";
  status: string;
  balance_cents: number;
  credit_limit_cents: number;
  max_positive_cents: number;
}

interface MockMovementRecord {
  id: string;
  owner_alias: string;
  direction: "in" | "out";
  counterparty: { alias: string; display_name: string };
  amount_cents: number;
  note?: string;
  created_at: string;
  balance_after_cents: number;
  status: string;
}

interface MockStore {
  version: number;
  participants: MockParticipantRecord[];
  movements: MockMovementRecord[];
  idempotency: Record<string, PaymentTransaction>;
}

let memoryStore: MockStore | null = null;

/* ------------------------------------------------------------------------- */
/* Infraestructura del store                                                  */
/* ------------------------------------------------------------------------- */

function simulateLatency(): Promise<void> {
  const ms =
    MIN_LATENCY_MS + Math.floor(Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS + 1));
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mock-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function isMockStore(value: unknown): value is MockStore {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MockStore>;
  return (
    candidate.version === STORE_VERSION &&
    Array.isArray(candidate.participants) &&
    Array.isArray(candidate.movements) &&
    !!candidate.idempotency &&
    typeof candidate.idempotency === "object"
  );
}

function readStorage(): MockStore | null {
  // Sin `window` no hay localStorage: en SSR el store vive sólo en memoria.
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isMockStore(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persist(store: MockStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage lleno o bloqueado: la demo sigue funcionando en memoria.
  }
}

function seedToParticipant(seed: MockParticipantSeed): MockParticipantRecord {
  return {
    id: `p_${seed.alias}`,
    alias: seed.alias,
    display_name: seed.displayName,
    avatar: seed.avatar,
    description: seed.description,
    role: seed.role,
    status: "active",
    balance_cents: seed.balanceCents,
    credit_limit_cents: seed.creditLimitCents,
    max_positive_cents:
      seed.role === "merchant" ? MERCHANT_MAX_POSITIVE_CENTS : MEMBER_MAX_POSITIVE_CENTS,
  };
}

function seedToMovement(seed: MockMovementSeed): MockMovementRecord {
  return {
    id: seed.id,
    owner_alias: seed.ownerAlias,
    direction: seed.direction,
    counterparty: {
      alias: seed.counterpartyAlias,
      display_name: seed.counterpartyName,
    },
    amount_cents: seed.amountCents,
    note: seed.note,
    created_at: seed.createdAt,
    balance_after_cents: seed.balanceAfterCents,
    status: seed.status,
  };
}

function createStore(): MockStore {
  const seed = buildMockSeed();
  return {
    version: STORE_VERSION,
    participants: seed.participants.map(seedToParticipant),
    movements: seed.movements.map(seedToMovement),
    idempotency: {},
  };
}

function loadStore(): MockStore {
  if (memoryStore) return memoryStore;
  memoryStore = readStorage() ?? createStore();
  persist(memoryStore);
  return memoryStore;
}

/* ------------------------------------------------------------------------- */
/* Helpers de dominio                                                         */
/* ------------------------------------------------------------------------- */

function apiError(code: string, message: string): ApiError {
  return { code, message };
}

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase().replace(/^[$@]+/, "");
}

function aliasFromToken(token: string): string {
  const alias = normalizeAlias(token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : "");
  if (!token.startsWith(TOKEN_PREFIX) || !alias) {
    throw apiError(
      "INVALID_SESSION",
      "La sesión demo no es válida. Volvé a entrar con un alias."
    );
  }
  return alias;
}

function createParticipant(alias: string): MockParticipantRecord {
  return {
    id: `p_${alias}`,
    alias,
    display_name: alias.charAt(0).toUpperCase() + alias.slice(1),
    avatar: "🙂",
    description: "Se sumó a la demo · perfil creado al entrar",
    role: "member",
    status: "active",
    balance_cents: DEFAULT_BALANCE_CENTS,
    credit_limit_cents: DEFAULT_CREDIT_CENTS,
    max_positive_cents: MEMBER_MAX_POSITIVE_CENTS,
  };
}

function ensureParticipant(store: MockStore, alias: string): MockParticipantRecord {
  const existing = store.participants.find((p) => p.alias === alias);
  if (existing) return existing;
  const created = createParticipant(alias);
  store.participants.push(created);
  return created;
}

function requireParticipant(store: MockStore, alias: string): MockParticipantRecord {
  const found = store.participants.find((p) => p.alias === alias);
  if (!found) {
    throw apiError(
      "INVALID_SESSION",
      "La sesión demo no es válida. Volvé a entrar con un alias."
    );
  }
  return found;
}

function toParticipant(record: MockParticipantRecord): Participant {
  return {
    id: record.id,
    alias: record.alias,
    display_name: record.display_name,
    role: record.role,
    status: record.status,
    balance_cents: record.balance_cents,
    credit_limit_cents: record.credit_limit_cents,
    available_cents: record.balance_cents + record.credit_limit_cents,
    max_positive_cents: record.max_positive_cents,
    receive_capacity_cents: Math.max(
      0,
      record.max_positive_cents - record.balance_cents
    ),
  };
}

function toTransaction(record: MockMovementRecord): Transaction {
  return {
    id: record.id,
    direction: record.direction,
    counterparty: { ...record.counterparty },
    amount_cents: record.amount_cents,
    note: record.note,
    created_at: record.created_at,
    balance_after_cents: record.balance_after_cents,
  };
}

function assertAmount(amountCents: number): void {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw apiError(
      "INVALID_AMOUNT",
      "El monto debe ser un entero positivo en centavos."
    );
  }
}

function appendMovement(
  store: MockStore,
  movement: Omit<MockMovementRecord, "balance_after_cents" | "status"> & {
    status?: string;
  }
): MockMovementRecord {
  const owner = store.participants.find((p) => p.alias === movement.owner_alias);
  const record: MockMovementRecord = {
    ...movement,
    balance_after_cents: owner?.balance_cents ?? 0,
    status: movement.status ?? "completed",
  };
  store.movements.push(record);
  return record;
}

/* ------------------------------------------------------------------------- */
/* API pública (contrato intacto, ahora contra el store local)                */
/* ------------------------------------------------------------------------- */

export async function login(alias: string) {
  await simulateLatency();
  const store = loadStore();
  const normalized = normalizeAlias(alias);
  if (!normalized) {
    throw apiError("INVALID_ALIAS", "Elegí un alias para entrar.");
  }
  const participant = ensureParticipant(store, normalized);
  persist(store);
  return {
    token: `${TOKEN_PREFIX}${normalized}`,
    participant: toParticipant(participant),
  };
}

export async function getMe(token: string): Promise<Participant> {
  await simulateLatency();
  const store = loadStore();
  const participant = ensureParticipant(store, aliasFromToken(token));
  persist(store);
  return toParticipant(participant);
}

export async function getParticipants(
  token: string,
  q?: string
): Promise<{ participants: Participant[] }> {
  await simulateLatency();
  aliasFromToken(token);
  const store = loadStore();
  const term = q?.trim().toLowerCase();
  const participants = term
    ? store.participants.filter(
        (p) =>
          p.alias.includes(term) ||
          p.display_name.toLowerCase().includes(term)
      )
    : store.participants;
  return { participants: participants.map(toParticipant) };
}

export async function pay(
  token: string,
  to: string,
  amountCents: number,
  note?: string,
  idempotencyKey?: string
): Promise<{ transaction: PaymentTransaction; idempotent_replay: boolean }> {
  await simulateLatency();
  const store = loadStore();

  const key = idempotencyKey?.trim() || randomId();
  const replay = store.idempotency[key];
  if (replay) {
    return { transaction: replay, idempotent_replay: true };
  }

  const payer = ensureParticipant(store, aliasFromToken(token));
  const recipientAlias = normalizeAlias(to);
  if (!recipientAlias) {
    throw apiError("INVALID_RECIPIENT", "Elegí un destinatario válido.");
  }
  if (recipientAlias === payer.alias) {
    throw apiError("SELF_PAYMENT", "No podés pagarte a vos mismo.");
  }
  assertAmount(amountCents);

  const receiver = ensureParticipant(store, recipientAlias);
  if (amountCents > payer.balance_cents + payer.credit_limit_cents) {
    throw apiError("INSUFFICIENT_FUNDS", "No tenés saldo suficiente para este pago.");
  }

  payer.balance_cents -= amountCents;
  receiver.balance_cents += amountCents;

  const createdAt = new Date().toISOString();
  const transactionId = randomId();
  const trimmedNote = note?.trim() || undefined;

  appendMovement(store, {
    id: `${transactionId}:out`,
    owner_alias: payer.alias,
    direction: "out",
    counterparty: {
      alias: receiver.alias,
      display_name: receiver.display_name,
    },
    amount_cents: amountCents,
    note: trimmedNote,
    created_at: createdAt,
  });

  appendMovement(store, {
    id: `${transactionId}:in`,
    owner_alias: receiver.alias,
    direction: "in",
    counterparty: {
      alias: payer.alias,
      display_name: payer.display_name,
    },
    amount_cents: amountCents,
    note: trimmedNote,
    created_at: createdAt,
  });

  const transaction: PaymentTransaction = {
    id: transactionId,
    status: "completed",
    amount_cents: amountCents,
    currency: "TL",
    from: {
      id: payer.id,
      alias: payer.alias,
      display_name: payer.display_name,
    },
    to: {
      id: receiver.id,
      alias: receiver.alias,
      display_name: receiver.display_name,
    },
    note: trimmedNote ?? null,
    created_at: createdAt,
    balance_after_cents: payer.balance_cents,
    counterparty_balance_after_cents: receiver.balance_cents,
  };

  store.idempotency[key] = transaction;
  persist(store);
  return { transaction, idempotent_replay: false };
}

export async function getMovements(token: string): Promise<Transaction[]> {
  await simulateLatency();
  const alias = aliasFromToken(token);
  const store = loadStore();
  return store.movements
    .filter((movement) => movement.owner_alias === alias)
    .sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
    )
    .map(toTransaction);
}

export async function deposit(
  token: string,
  amountCents: number
): Promise<BalanceMovement> {
  await simulateLatency();
  const store = loadStore();
  assertAmount(amountCents);
  const owner = requireParticipant(store, aliasFromToken(token));

  owner.balance_cents += amountCents;
  const createdAt = new Date().toISOString();
  const movement = appendMovement(store, {
    id: `mv_${randomId()}`,
    owner_alias: owner.alias,
    direction: "in",
    counterparty: { alias: "ars", display_name: "Ingreso de ARS" },
    amount_cents: amountCents,
    note: "Ingreso de ARS (demo)",
    created_at: createdAt,
  });

  persist(store);
  return { participant: toParticipant(owner), movement: toTransaction(movement) };
}

export async function withdraw(
  token: string,
  amountCents: number
): Promise<BalanceMovement> {
  await simulateLatency();
  const store = loadStore();
  assertAmount(amountCents);
  const owner = requireParticipant(store, aliasFromToken(token));

  if (amountCents > owner.balance_cents) {
    throw apiError("INSUFFICIENT_FUNDS", "No tenés saldo suficiente para este retiro.");
  }

  owner.balance_cents -= amountCents;
  const createdAt = new Date().toISOString();
  const movement = appendMovement(store, {
    id: `mv_${randomId()}`,
    owner_alias: owner.alias,
    direction: "out",
    counterparty: { alias: "ars", display_name: "Retiro a ARS" },
    amount_cents: amountCents,
    note: "Retiro a ARS (demo)",
    created_at: createdAt,
  });

  persist(store);
  return { participant: toParticipant(owner), movement: toTransaction(movement) };
}

export function resetMockData(): void {
  memoryStore = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage bloqueado: alcanza con limpiar la copia en memoria.
  }
}
