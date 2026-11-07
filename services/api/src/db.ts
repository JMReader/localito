import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const CURRENCY = 'localito';
export const DEFAULT_CREDIT_LIMIT_CENTS = 50_000;
export const DEFAULT_MAX_POSITIVE_CENTS = 100_000;

export type ParticipantRow = {
  id: string;
  alias: string;
  display_name: string;
  role: string;
  status: string;
  balance_cents: number;
  credit_limit_cents: number;
  max_positive_cents: number;
  created_at: string;
};

export type ParticipantView = {
  id: string;
  alias: string;
  display_name: string;
  role: string;
  status: string;
  balance_cents: number;
  credit_limit_cents: number;
  available_cents: number;
  max_positive_cents: number;
  receive_capacity_cents: number;
};

export type TransactionRow = {
  id: string;
  from_id: string;
  to_id: string;
  amount_cents: number;
  currency: string;
  note: string | null;
  status: string;
  idempotency_key: string | null;
  created_at: string;
};

type DemoParticipant = Pick<ParticipantRow, 'id' | 'alias' | 'display_name' | 'role'>;

const DEMO_PARTICIPANTS: DemoParticipant[] = [
  { id: 'p_ana', alias: 'ana', display_name: 'Ana', role: 'member' },
  { id: 'p_bruno', alias: 'bruno', display_name: 'Bruno', role: 'member' },
  { id: 'p_kiosco', alias: 'kiosco', display_name: 'Kiosco La Esquina', role: 'merchant' },
  { id: 'p_cafe', alias: 'cafe', display_name: 'Café Central', role: 'merchant' },
  { id: 'p_foto', alias: 'foto', display_name: 'Fotocopias Norte', role: 'merchant' },
];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  balance_cents INTEGER NOT NULL DEFAULT 0,
  credit_limit_cents INTEGER NOT NULL DEFAULT 0,
  max_positive_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL REFERENCES participants(id),
  to_id TEXT NOT NULL REFERENCES participants(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'localito',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  idempotency_key TEXT,
  created_at TEXT NOT NULL,
  CHECK (from_id <> to_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency
  ON transactions(from_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL REFERENCES transactions(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  delta_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ledger_entries_transaction ON ledger_entries(transaction_id);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
`;

export function createDb(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec(SCHEMA);
  seedIfEmpty(db);
  return db;
}

function seedIfEmpty(db: DatabaseSync): void {
  const row = db.prepare('SELECT COUNT(*) AS count FROM participants').get() as { count: number };
  if (row.count > 0) return;

  const insert = db.prepare(`
    INSERT INTO participants
      (id, alias, display_name, role, status, balance_cents, credit_limit_cents, max_positive_cents, created_at)
    VALUES (?, ?, ?, ?, 'active', 0, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  for (const participant of DEMO_PARTICIPANTS) {
    insert.run(
      participant.id,
      participant.alias,
      participant.display_name,
      participant.role,
      DEFAULT_CREDIT_LIMIT_CENTS,
      DEFAULT_MAX_POSITIVE_CENTS,
      now,
    );
  }
}

export function findParticipantById(db: DatabaseSync, id: string): ParticipantRow | undefined {
  return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
}

export function findParticipantByAlias(db: DatabaseSync, alias: string): ParticipantRow | undefined {
  return db.prepare('SELECT * FROM participants WHERE alias = ?').get(alias) as ParticipantRow | undefined;
}

export function findParticipantByAliasOrId(db: DatabaseSync, value: string): ParticipantRow | undefined {
  return db
    .prepare('SELECT * FROM participants WHERE alias = ? OR id = ? LIMIT 1')
    .get(value, value) as ParticipantRow | undefined;
}

export function findParticipantByToken(db: DatabaseSync, token: string): ParticipantRow | undefined {
  return db
    .prepare(`
      SELECT p.*
      FROM sessions s
      JOIN participants p ON p.id = s.participant_id
      WHERE s.token = ?
    `)
    .get(token) as ParticipantRow | undefined;
}

export function createSession(db: DatabaseSync, participantId: string): string {
  const token = randomUUID();
  db.prepare('INSERT INTO sessions (token, participant_id, created_at) VALUES (?, ?, ?)').run(
    token,
    participantId,
    new Date().toISOString(),
  );
  return token;
}

export function participantView(row: ParticipantRow): ParticipantView {
  return {
    id: row.id,
    alias: row.alias,
    display_name: row.display_name,
    role: row.role,
    status: row.status,
    balance_cents: row.balance_cents,
    credit_limit_cents: row.credit_limit_cents,
    available_cents: row.balance_cents + row.credit_limit_cents,
    max_positive_cents: row.max_positive_cents,
    receive_capacity_cents: row.max_positive_cents - row.balance_cents,
  };
}
