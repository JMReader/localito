import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const CURRENCY = 'localito';
export const DEFAULT_CREDIT_LIMIT_CENTS = 50_000;
export const DEFAULT_MAX_POSITIVE_CENTS = 100_000;
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_ALIAS_LENGTH = 64;
export const MAX_NOTE_LENGTH = 280;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 120;
export const BUSY_TIMEOUT_MS = 5_000;

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

const LEDGER_ENTRIES_TABLE = `
CREATE TABLE IF NOT EXISTS ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL REFERENCES transactions(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  delta_cents INTEGER NOT NULL CHECK (delta_cents <> 0),
  balance_after_cents INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('payment_out', 'payment_in')),
  created_at TEXT NOT NULL,
  CHECK (
    (kind = 'payment_out' AND delta_cents < 0) OR
    (kind = 'payment_in' AND delta_cents > 0)
  ),
  UNIQUE (transaction_id, participant_id)
);
`;

const SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(alias) BETWEEN 1 AND 64),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  role TEXT NOT NULL CHECK (role IN ('member', 'merchant')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  balance_cents INTEGER NOT NULL DEFAULT 0,
  credit_limit_cents INTEGER NOT NULL DEFAULT 0 CHECK (credit_limit_cents >= 0),
  max_positive_cents INTEGER NOT NULL DEFAULT 0 CHECK (max_positive_cents >= 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL REFERENCES participants(id),
  to_id TEXT NOT NULL REFERENCES participants(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'localito' CHECK (currency = 'localito'),
  note TEXT CHECK (note IS NULL OR length(note) <= 280),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed')),
  idempotency_key TEXT CHECK (
    idempotency_key IS NULL OR length(idempotency_key) BETWEEN 1 AND 120
  ),
  created_at TEXT NOT NULL,
  CHECK (from_id <> to_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency
  ON transactions(from_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_from
  ON transactions(from_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_to
  ON transactions(to_id, created_at DESC);

${LEDGER_ENTRIES_TABLE}

CREATE INDEX IF NOT EXISTS idx_ledger_participant
  ON ledger_entries(participant_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction
  ON ledger_entries(transaction_id);

${SESSIONS_TABLE}

CREATE INDEX IF NOT EXISTS idx_sessions_participant ON sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

DROP INDEX IF EXISTS ledger_entries_transaction;
`;

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function runTransaction(db: DatabaseSync, fn: () => void): void {
  db.exec('BEGIN IMMEDIATE');
  let committed = false;
  try {
    fn();
    db.exec('COMMIT');
    committed = true;
  } finally {
    if (!committed) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // La transacción ya se cerró por un error previo.
      }
    }
  }
}

function tableExists(db: DatabaseSync, table: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { name: string } | undefined;
  return Boolean(row);
}

function columnNames(db: DatabaseSync, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
    (column) => column.name,
  );
}

function migrateLegacySessions(db: DatabaseSync): void {
  if (!tableExists(db, 'sessions')) return;
  const columns = columnNames(db, 'sessions');
  if (!columns.includes('token') || columns.includes('token_hash')) return;

  const rows = db
    .prepare('SELECT token, participant_id, created_at FROM sessions')
    .all() as Array<{ token: string; participant_id: string; created_at: string }>;

  runTransaction(db, () => {
    db.exec(`
      CREATE TABLE sessions_migrated (
        token_hash TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )
    `);
    const insert = db.prepare(`
      INSERT OR IGNORE INTO sessions_migrated (token_hash, participant_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const row of rows) {
      const createdAt = Number.isNaN(Date.parse(row.created_at))
        ? new Date().toISOString()
        : row.created_at;
      const expiresAt = new Date(Date.parse(createdAt) + SESSION_TTL_MS).toISOString();
      insert.run(hashSessionToken(row.token), row.participant_id, createdAt, expiresAt);
    }
    db.exec('DROP TABLE sessions');
    db.exec('ALTER TABLE sessions_migrated RENAME TO sessions');
  });
}

function migrateLegacyLedgerEntries(db: DatabaseSync): void {
  if (!tableExists(db, 'ledger_entries')) return;
  const columns = columnNames(db, 'ledger_entries');
  if (columns.includes('kind')) return;

  runTransaction(db, () => {
    db.exec(LEDGER_ENTRIES_TABLE.replace('IF NOT EXISTS ledger_entries', 'ledger_entries_migrated'));
    db.exec(`
      INSERT INTO ledger_entries_migrated
        (id, transaction_id, participant_id, delta_cents, balance_after_cents, kind, created_at)
      SELECT id, transaction_id, participant_id, delta_cents, balance_after_cents,
             CASE WHEN delta_cents < 0 THEN 'payment_out' ELSE 'payment_in' END,
             created_at
      FROM ledger_entries
    `);
    db.exec('DROP TABLE ledger_entries');
    db.exec('ALTER TABLE ledger_entries_migrated RENAME TO ledger_entries');
  });
}

export function createDb(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL');

  migrateLegacySessions(db);
  migrateLegacyLedgerEntries(db);
  db.exec(SCHEMA);
  seedDemoParticipants(db);
  return db;
}

function seedDemoParticipants(db: DatabaseSync): void {
  const now = new Date().toISOString();
  runTransaction(db, () => {
    const insert = db.prepare(`
      INSERT INTO participants
        (id, alias, display_name, role, status, balance_cents, credit_limit_cents, max_positive_cents, created_at)
      VALUES (?, ?, ?, ?, 'active', 0, ?, ?, ?)
      ON CONFLICT(alias) DO UPDATE SET
        display_name = COALESCE(NULLIF(participants.display_name, ''), excluded.display_name),
        role = COALESCE(NULLIF(participants.role, ''), excluded.role)
    `);
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
  });
}

export function findParticipantById(db: DatabaseSync, id: string): ParticipantRow | undefined {
  return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
}

export function findParticipantByAlias(db: DatabaseSync, alias: string): ParticipantRow | undefined {
  return db.prepare('SELECT * FROM participants WHERE alias = ?').get(alias) as ParticipantRow | undefined;
}

export function findParticipantByToken(db: DatabaseSync, token: string): ParticipantRow | undefined {
  if (!token) return undefined;
  return db
    .prepare(`
      SELECT p.*
      FROM sessions s
      JOIN participants p ON p.id = s.participant_id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `)
    .get(hashSessionToken(token), new Date().toISOString()) as ParticipantRow | undefined;
}

export function createSession(db: DatabaseSync, participantId: string): string {
  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString());
  db.prepare(`
    INSERT INTO sessions (token_hash, participant_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(hashSessionToken(token), participantId, now.toISOString(), expiresAt);

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
