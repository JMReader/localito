import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import {
  CURRENCY,
  findParticipantByAliasOrId,
  findParticipantById,
  participantView,
} from './db.js';
import type { ParticipantRow, TransactionRow } from './db.js';
import { ApiError } from './errors.js';

export type TransactionParty = {
  id: string;
  alias: string;
  display_name: string;
};

export type TransactionView = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  from: TransactionParty;
  to: TransactionParty;
  note: string | null;
  created_at: string;
  balance_after_cents: number;
  counterparty_balance_after_cents: number;
};

export type TransactionSummary = {
  id: string;
  direction: 'in' | 'out';
  counterparty: { alias: string; display_name: string };
  amount_cents: number;
  note: string | null;
  created_at: string;
  balance_after_cents: number;
};

export type PayInput = {
  fromId: string;
  toIdentifier: string;
  amountCents: number;
  note: string | null;
  idempotencyKey: string | null;
};

export type PayResult = {
  transaction: TransactionView;
  idempotentReplay: boolean;
};

export type Stats = {
  participant_count: number;
  transaction_count: number;
  total_volume_cents: number;
  sum_balances_cents: number;
  zero_sum_ok: boolean;
  currency: string;
};

function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  let committed = false;
  try {
    const result = fn();
    db.exec('COMMIT');
    committed = true;
    return result;
  } finally {
    if (!committed) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // No hay transacción activa (por ejemplo, si COMMIT falló antes de abrirla).
      }
    }
  }
}

function party(row: ParticipantRow | undefined, fallbackId: string): TransactionParty {
  return {
    id: row?.id ?? fallbackId,
    alias: row?.alias ?? '',
    display_name: row?.display_name ?? '',
  };
}

export function buildTransactionView(db: DatabaseSync, transaction: TransactionRow): TransactionView {
  const from = findParticipantById(db, transaction.from_id);
  const to = findParticipantById(db, transaction.to_id);
  const entries = db
    .prepare('SELECT participant_id, balance_after_cents FROM ledger_entries WHERE transaction_id = ?')
    .all(transaction.id) as Array<{ participant_id: string; balance_after_cents: number }>;

  const fromBalance =
    entries.find((entry) => entry.participant_id === transaction.from_id)?.balance_after_cents ?? 0;
  const toBalance =
    entries.find((entry) => entry.participant_id === transaction.to_id)?.balance_after_cents ?? 0;

  return {
    id: transaction.id,
    status: transaction.status,
    amount_cents: transaction.amount_cents,
    currency: transaction.currency,
    from: party(from, transaction.from_id),
    to: party(to, transaction.to_id),
    note: transaction.note,
    created_at: transaction.created_at,
    balance_after_cents: fromBalance,
    counterparty_balance_after_cents: toBalance,
  };
}

function findTransactionByIdempotency(
  db: DatabaseSync,
  fromId: string,
  idempotencyKey: string,
): TransactionRow | undefined {
  return db
    .prepare('SELECT * FROM transactions WHERE from_id = ? AND idempotency_key = ?')
    .get(fromId, idempotencyKey) as TransactionRow | undefined;
}

function setBalance(db: DatabaseSync, participantId: string, balanceCents: number): void {
  db.prepare('UPDATE participants SET balance_cents = ? WHERE id = ?').run(balanceCents, participantId);
}

function insertLedgerEntry(
  db: DatabaseSync,
  transactionId: string,
  participantId: string,
  deltaCents: number,
  balanceAfterCents: number,
  createdAt: string,
): void {
  db.prepare(`
    INSERT INTO ledger_entries (transaction_id, participant_id, delta_cents, balance_after_cents, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(transactionId, participantId, deltaCents, balanceAfterCents, createdAt);
}

export function pay(db: DatabaseSync, input: PayInput): PayResult {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'El monto debe ser un entero mayor a cero.');
  }

  return withTransaction(db, () => {
    const receiver = findParticipantByAliasOrId(db, input.toIdentifier);
    if (!receiver) {
      throw new ApiError(404, 'NOT_FOUND', 'No encontramos a ese participante.');
    }
    if (receiver.id === input.fromId) {
      throw new ApiError(422, 'SELF_PAYMENT', 'No podés pagarte a vos mismo.');
    }

    if (input.idempotencyKey) {
      const existing = findTransactionByIdempotency(db, input.fromId, input.idempotencyKey);
      if (existing) {
        const samePayload =
          existing.to_id === receiver.id &&
          existing.amount_cents === input.amountCents &&
          (existing.note ?? null) === (input.note ?? null);
        if (!samePayload) {
          throw new ApiError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'Esa clave de idempotencia ya se usó para otro pago.',
          );
        }
        return { transaction: buildTransactionView(db, existing), idempotentReplay: true };
      }
    }

    const sender = findParticipantById(db, input.fromId);
    if (!sender) {
      throw new ApiError(401, 'UNAUTHORIZED', 'La sesión no es válida. Volvé a entrar.');
    }
    if (sender.status !== 'active') {
      throw new ApiError(409, 'PARTICIPANT_INACTIVE', 'Tu cuenta no está activa para pagar.', {
        participant: participantView(sender),
      });
    }
    if (receiver.status !== 'active') {
      throw new ApiError(
        409,
        'PARTICIPANT_INACTIVE',
        'El destinatario no está activo para recibir pagos.',
        { participant: participantView(receiver) },
      );
    }

    const availableCents = sender.balance_cents + sender.credit_limit_cents;
    if (availableCents < input.amountCents) {
      throw new ApiError(422, 'INSUFFICIENT_CREDIT', 'No tenés margen suficiente.', {
        available_cents: availableCents,
        requested_cents: input.amountCents,
        shortfall_cents: input.amountCents - availableCents,
      });
    }

    const receiveCapacityCents = receiver.max_positive_cents - receiver.balance_cents;
    if (receiveCapacityCents < input.amountCents) {
      throw new ApiError(
        422,
        'RECEIVER_LIMIT',
        'El destinatario no puede recibir más saldo.',
        {
          receive_capacity_cents: receiveCapacityCents,
          requested_cents: input.amountCents,
        },
      );
    }

    const createdAt = new Date().toISOString();
    const transaction: TransactionRow = {
      id: `tx_${randomUUID()}`,
      from_id: sender.id,
      to_id: receiver.id,
      amount_cents: input.amountCents,
      currency: CURRENCY,
      note: input.note,
      status: 'confirmed',
      idempotency_key: input.idempotencyKey,
      created_at: createdAt,
    };

    db.prepare(`
      INSERT INTO transactions
        (id, from_id, to_id, amount_cents, currency, note, status, idempotency_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transaction.id,
      transaction.from_id,
      transaction.to_id,
      transaction.amount_cents,
      transaction.currency,
      transaction.note,
      transaction.status,
      transaction.idempotency_key,
      transaction.created_at,
    );

    const senderBalance = sender.balance_cents - transaction.amount_cents;
    const receiverBalance = receiver.balance_cents + transaction.amount_cents;

    setBalance(db, sender.id, senderBalance);
    setBalance(db, receiver.id, receiverBalance);
    insertLedgerEntry(db, transaction.id, sender.id, -transaction.amount_cents, senderBalance, createdAt);
    insertLedgerEntry(db, transaction.id, receiver.id, transaction.amount_cents, receiverBalance, createdAt);

    return { transaction: buildTransactionView(db, transaction), idempotentReplay: false };
  });
}

type HistoryRow = {
  id: string;
  from_id: string;
  to_id: string;
  amount_cents: number;
  note: string | null;
  created_at: string;
  balance_after_cents: number;
};

export function listTransactions(
  db: DatabaseSync,
  participantId: string,
  limit: number,
): TransactionSummary[] {
  const rows = db
    .prepare(`
      SELECT t.id, t.from_id, t.to_id, t.amount_cents, t.note, t.created_at,
             le.balance_after_cents AS balance_after_cents
      FROM transactions t
      JOIN ledger_entries le ON le.transaction_id = t.id AND le.participant_id = ?
      WHERE t.from_id = ? OR t.to_id = ?
      ORDER BY t.created_at DESC, t.rowid DESC
      LIMIT ?
    `)
    .all(participantId, participantId, participantId, limit) as HistoryRow[];

  return rows.map((row) => {
    const isOutgoing = row.from_id === participantId;
    const counterparty = findParticipantById(db, isOutgoing ? row.to_id : row.from_id);
    const direction: 'in' | 'out' = isOutgoing ? 'out' : 'in';
    return {
      id: row.id,
      direction,
      counterparty: {
        alias: counterparty?.alias ?? '',
        display_name: counterparty?.display_name ?? '',
      },
      amount_cents: row.amount_cents,
      note: row.note,
      created_at: row.created_at,
      balance_after_cents: row.balance_after_cents,
    };
  });
}

export function getTransactionForParticipant(
  db: DatabaseSync,
  transactionId: string,
  participantId: string,
): TransactionView | undefined {
  const row = db
    .prepare('SELECT * FROM transactions WHERE id = ? AND (from_id = ? OR to_id = ?)')
    .get(transactionId, participantId, participantId) as TransactionRow | undefined;
  return row ? buildTransactionView(db, row) : undefined;
}

export function getStats(db: DatabaseSync): Stats {
  const participants = db
    .prepare('SELECT COUNT(*) AS count, COALESCE(SUM(balance_cents), 0) AS total FROM participants')
    .get() as { count: number; total: number };
  const transactions = db
    .prepare('SELECT COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS volume FROM transactions')
    .get() as { count: number; volume: number };

  return {
    participant_count: participants.count,
    transaction_count: transactions.count,
    total_volume_cents: transactions.volume,
    sum_balances_cents: participants.total,
    zero_sum_ok: participants.total === 0,
    currency: CURRENCY,
  };
}

export function resetDemo(db: DatabaseSync): void {
  withTransaction(db, () => {
    db.exec('DELETE FROM ledger_entries');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM sessions');
    db.exec('UPDATE participants SET balance_cents = 0');
  });
}
