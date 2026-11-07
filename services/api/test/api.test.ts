import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { SESSION_TTL_MS, createDb, hashSessionToken } from '../src/db.js';
import { ApiError } from '../src/errors.js';
import { isIdempotencyUniqueViolation, replayOrConflict } from '../src/ledger.js';

type Ctx = { app: FastifyInstance; db: DatabaseSync };

const openApps: FastifyInstance[] = [];
const tempDirs: string[] = [];

async function setup(demoMode = true): Promise<Ctx> {
  const db = createDb(':memory:');
  const app = await createApp({ db, demoMode, corsOrigins: [] });
  openApps.push(app);
  return { app, db };
}

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'localito-test-'));
  tempDirs.push(dir);
  return join(dir, 'localito.db');
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

async function login(app: FastifyInstance, alias: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/demo',
    payload: { alias },
  });
  expect(response.statusCode).toBe(200);
  return response.json().token as string;
}

function pay(
  app: FastifyInstance,
  token: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string,
) {
  return app.inject({
    method: 'POST',
    url: '/api/payments',
    headers: {
      ...bearer(token),
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    payload,
  });
}

function sumBalances(db: DatabaseSync): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(balance_cents), 0) AS total FROM participants')
    .get() as { total: number };
  return row.total;
}

function countRows(db: DatabaseSync, table: 'transactions' | 'ledger_entries' | 'sessions'): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}

function expectLedgerInvariants(db: DatabaseSync): void {
  expect(sumBalances(db)).toBe(0);

  const deltaSum = db
    .prepare('SELECT COALESCE(SUM(delta_cents), 0) AS total FROM ledger_entries')
    .get() as { total: number };
  expect(deltaSum.total).toBe(0);

  const txCount = db.prepare('SELECT COUNT(*) AS count FROM transactions').get() as { count: number };
  const entryCount = db
    .prepare('SELECT COUNT(*) AS count FROM ledger_entries')
    .get() as { count: number };
  expect(entryCount.count).toBe(txCount.count * 2);

  expect(
    db
      .prepare(
        'SELECT transaction_id FROM ledger_entries GROUP BY transaction_id HAVING COUNT(*) <> 2',
      )
      .all(),
  ).toEqual([]);
  expect(
    db
      .prepare(
        'SELECT transaction_id FROM ledger_entries GROUP BY transaction_id HAVING SUM(delta_cents) <> 0',
      )
      .all(),
  ).toEqual([]);

  const participants = db
    .prepare(`
      SELECT p.id, p.balance_cents,
             (SELECT le.balance_after_cents
              FROM ledger_entries le
              WHERE le.participant_id = p.id
              ORDER BY le.id DESC
              LIMIT 1) AS latest_balance
      FROM participants p
    `)
    .all() as Array<{ id: string; balance_cents: number; latest_balance: number | null }>;
  for (const participant of participants) {
    if (participant.latest_balance !== null) {
      expect(participant.balance_cents).toBe(participant.latest_balance);
    } else {
      expect(participant.balance_cents).toBe(0);
    }
  }
}

describe('health y autenticación', () => {
  it('GET /api/health responde sin token', async () => {
    const { app } = await setup();
    const response = await app.inject({ url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'localito-api',
      version: '0.1.0',
    });
    expect(typeof response.json().time).toBe('string');
  });

  it('POST /api/auth/demo devuelve token y participante con límites', async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/demo',
      payload: { alias: 'ana' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      token: expect.any(String),
      participant: {
        id: 'p_ana',
        alias: 'ana',
        display_name: 'Ana',
        role: 'member',
        status: 'active',
        balance_cents: 0,
        credit_limit_cents: 50_000,
        available_cents: 50_000,
        max_positive_cents: 100_000,
        receive_capacity_cents: 100_000,
      },
    });
  });

  it('rechaza aliases inexistentes con 404', async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/demo',
      payload: { alias: 'nadie' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('protege /api/me y los pagos con Bearer', async () => {
    const { app } = await setup();

    const withoutToken = await app.inject({ url: '/api/me' });
    expect(withoutToken.statusCode).toBe(401);
    expect(withoutToken.json().error.code).toBe('UNAUTHORIZED');

    const invalid = await app.inject({ url: '/api/me', headers: bearer('token-falso') });
    expect(invalid.statusCode).toBe(401);

    const payment = await app.inject({
      method: 'POST',
      url: '/api/payments',
      payload: { to: 'kiosco', amount_cents: 100 },
    });
    expect(payment.statusCode).toBe(401);
  });

  it('guarda sólo el hash SHA-256 del token, con vencimiento a 24 horas', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    const row = db
      .prepare('SELECT token_hash, created_at, expires_at FROM sessions')
      .get() as { token_hash: string; created_at: string; expires_at: string };

    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.token_hash).toBe(hashSessionToken(token));
    expect(row.token_hash).not.toBe(token);
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(Date.parse(row.expires_at) - Date.parse(row.created_at)).toBe(SESSION_TTL_MS);
  });

  it('rechaza sesiones vencidas', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    db.prepare('UPDATE sessions SET expires_at = ?').run(
      new Date(Date.now() - 1_000).toISOString(),
    );

    const response = await app.inject({ url: '/api/me', headers: bearer(token) });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');

    const fresh = await login(app, 'ana');
    expect((await app.inject({ url: '/api/me', headers: bearer(fresh) })).statusCode).toBe(200);
  });
});

describe('pagos y libro mayor', () => {
  it('un pago confirmado mueve ambos saldos y mantiene suma cero', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    const response = await pay(
      app,
      token,
      { to: 'kiosco', amount_cents: 1500, note: 'Compra de demo' },
      'key-ok',
    );

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.idempotent_replay).toBe(false);
    expect(body.transaction).toMatchObject({
      status: 'confirmed',
      amount_cents: 1500,
      currency: 'localito',
      note: 'Compra de demo',
      balance_after_cents: -1500,
      counterparty_balance_after_cents: 1500,
      from: { id: 'p_ana', alias: 'ana', display_name: 'Ana' },
      to: { id: 'p_kiosco', alias: 'kiosco', display_name: 'Kiosco La Esquina' },
    });
    expect(body.transaction.id).toMatch(/^tx_/);

    expect(sumBalances(db)).toBe(0);
    expectLedgerInvariants(db);

    const me = await app.inject({ url: '/api/me', headers: bearer(token) });
    expect(me.json()).toMatchObject({
      balance_cents: -1500,
      available_cents: 48_500,
      receive_capacity_cents: 101_500,
    });

    const kioscoToken = await login(app, 'kiosco');
    const history = await app.inject({
      url: '/api/transactions',
      headers: bearer(kioscoToken),
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().transactions).toHaveLength(1);
    expect(history.json().transactions[0]).toMatchObject({
      id: body.transaction.id,
      direction: 'in',
      amount_cents: 1500,
      note: 'Compra de demo',
      balance_after_cents: 1500,
      counterparty: { alias: 'ana', display_name: 'Ana' },
    });
  });

  it('escribe exactamente dos asientos con kind y delta coherentes', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');
    const payment = await pay(app, token, { to: 'kiosco', amount_cents: 1000 }, 'two-entries');
    const transactionId = payment.json().transaction.id as string;

    const entries = db
      .prepare(
        `SELECT participant_id, delta_cents, balance_after_cents, kind
         FROM ledger_entries WHERE transaction_id = ? ORDER BY id`,
      )
      .all(transactionId) as Array<{
      participant_id: string;
      delta_cents: number;
      balance_after_cents: number;
      kind: string;
    }>;

    expect(entries).toEqual([
      {
        participant_id: 'p_ana',
        delta_cents: -1000,
        balance_after_cents: -1000,
        kind: 'payment_out',
      },
      {
        participant_id: 'p_kiosco',
        delta_cents: 1000,
        balance_after_cents: 1000,
        kind: 'payment_in',
      },
    ]);
    expectLedgerInvariants(db);
  });

  it('rechaza pagos sin margen y no toca saldos ni asientos', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    const response = await pay(app, token, { to: 'kiosco', amount_cents: 50_001 });

    expect(response.statusCode).toBe(422);
    expect(response.json().error).toMatchObject({
      code: 'INSUFFICIENT_CREDIT',
      details: {
        available_cents: 50_000,
        requested_cents: 50_001,
        shortfall_cents: 1,
      },
    });
    expect(sumBalances(db)).toBe(0);
    expect(countRows(db, 'transactions')).toBe(0);
    expect(countRows(db, 'ledger_entries')).toBe(0);
  });

  it('permite usar el límite exacto pero rechaza superarlo', async () => {
    const { app } = await setup();
    const token = await login(app, 'ana');

    const exact = await pay(app, token, { to: 'kiosco', amount_cents: 50_000 });
    expect(exact.statusCode).toBe(201);

    const overLimit = await pay(app, token, { to: 'kiosco', amount_cents: 1 });
    expect(overLimit.statusCode).toBe(422);
    expect(overLimit.json().error.code).toBe('INSUFFICIENT_CREDIT');
    expect(overLimit.json().error.details.shortfall_cents).toBe(1);
  });

  it('rechaza cuando el receptor llegó a su tope positivo', async () => {
    const { app } = await setup();
    const ana = await login(app, 'ana');
    const bruno = await login(app, 'bruno');
    const cafe = await login(app, 'cafe');

    expect((await pay(app, ana, { to: 'kiosco', amount_cents: 50_000 })).statusCode).toBe(201);
    expect((await pay(app, bruno, { to: 'kiosco', amount_cents: 50_000 })).statusCode).toBe(201);

    const response = await pay(app, cafe, { to: 'kiosco', amount_cents: 100 });

    expect(response.statusCode).toBe(422);
    expect(response.json().error).toMatchObject({
      code: 'RECEIVER_LIMIT',
      details: { receive_capacity_cents: 0, requested_cents: 100 },
    });
  });

  it('rechaza pagos a uno mismo', async () => {
    const { app } = await setup();
    const token = await login(app, 'ana');

    const response = await pay(app, token, { to: 'ana', amount_cents: 100 });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('SELF_PAYMENT');
  });

  it('rechaza emisor o receptor inactivo con PARTICIPANT_INACTIVE', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    db.prepare("UPDATE participants SET status = 'inactive' WHERE id = 'p_kiosco'").run();
    const receiverInactive = await pay(app, token, { to: 'kiosco', amount_cents: 100 });
    expect(receiverInactive.statusCode).toBe(409);
    expect(receiverInactive.json().error).toMatchObject({
      code: 'PARTICIPANT_INACTIVE',
      details: { participant: { id: 'p_kiosco', status: 'inactive' } },
    });

    db.prepare("UPDATE participants SET status = 'active' WHERE id = 'p_kiosco'").run();
    db.prepare("UPDATE participants SET status = 'inactive' WHERE id = 'p_ana'").run();
    const senderInactive = await pay(app, token, { to: 'kiosco', amount_cents: 100 });
    expect(senderInactive.statusCode).toBe(409);
    expect(senderInactive.json().error).toMatchObject({
      code: 'PARTICIPANT_INACTIVE',
      details: { participant: { id: 'p_ana', status: 'inactive' } },
    });

    expect(countRows(db, 'transactions')).toBe(0);
    expect(countRows(db, 'ledger_entries')).toBe(0);
  });

  it('sólo acepta el alias del destinatario, no su id interno', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    const byId = await pay(app, token, { to: 'p_kiosco', amount_cents: 100 });
    expect(byId.statusCode).toBe(404);
    expect(byId.json().error.code).toBe('NOT_FOUND');
    expect(countRows(db, 'transactions')).toBe(0);
  });

  it('valida montos inválidos con VALIDATION_ERROR', async () => {
    const { app } = await setup();
    const token = await login(app, 'ana');

    for (const amount of [0, -100, 1.5]) {
      const response = await pay(app, token, { to: 'kiosco', amount_cents: amount });
      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(response.json().error.details.issues)).toBe(true);
    }
  });

  it('limita la nota a 280 caracteres', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    const response = await pay(app, token, {
      to: 'kiosco',
      amount_cents: 100,
      note: 'x'.repeat(281),
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(countRows(db, 'transactions')).toBe(0);
  });

  it('rechaza destinatarios inexistentes', async () => {
    const { app } = await setup();
    const token = await login(app, 'ana');

    const response = await pay(app, token, { to: 'fantasma', amount_cents: 100 });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('reproduce el mismo pago con la misma clave sin mover saldos de nuevo', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    const first = await pay(app, token, { to: 'kiosco', amount_cents: 1500 }, 'replay-key');
    const second = await pay(app, token, { to: 'kiosco', amount_cents: 1500 }, 'replay-key');

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json().idempotent_replay).toBe(true);
    expect(second.json().transaction.id).toBe(first.json().transaction.id);

    expect(sumBalances(db)).toBe(0);
    expect(countRows(db, 'transactions')).toBe(1);
    expect(countRows(db, 'ledger_entries')).toBe(2);
    const ana = await app.inject({ url: '/api/me', headers: bearer(token) });
    expect(ana.json().balance_cents).toBe(-1500);

    const stats = await app.inject({ url: '/api/stats', headers: bearer(token) });
    expect(stats.json().transaction_count).toBe(1);
    expect(stats.json().total_volume_cents).toBe(1500);
  });

  it('conflicto de idempotencia cuando cambia el payload', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    await pay(app, token, { to: 'kiosco', amount_cents: 1500 }, 'conflict-key');
    const response = await pay(app, token, { to: 'cafe', amount_cents: 1500 }, 'conflict-key');

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(sumBalances(db)).toBe(0);
    expect(countRows(db, 'transactions')).toBe(1);
  });

  it('maneja la carrera de clave duplicada sin 500 y respeta el replay', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');
    const first = await pay(app, token, { to: 'kiosco', amount_cents: 1200 }, 'race-key');
    expect(first.statusCode).toBe(201);

    let constraintError: unknown;
    try {
      db.prepare(`
        INSERT INTO transactions
          (id, from_id, to_id, amount_cents, currency, note, status, idempotency_key, created_at)
        VALUES ('tx_race', 'p_ana', 'p_kiosco', 1200, 'localito', NULL, 'confirmed', 'race-key', ?)
      `).run(new Date().toISOString());
    } catch (error) {
      constraintError = error;
    }
    expect(isIdempotencyUniqueViolation(constraintError)).toBe(true);

    const replay = await pay(app, token, { to: 'kiosco', amount_cents: 1200 }, 'race-key');
    expect(replay.statusCode).toBe(201);
    expect(replay.json().idempotent_replay).toBe(true);
    expect(replay.json().transaction.id).toBe(first.json().transaction.id);
    expect(countRows(db, 'transactions')).toBe(1);

    const row = db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(first.json().transaction.id) as Parameters<typeof replayOrConflict>[1];
    expect(
      replayOrConflict(db, row, 'p_kiosco', {
        fromId: 'p_ana',
        toIdentifier: 'kiosco',
        amountCents: 1200,
        note: null,
        idempotencyKey: 'race-key',
      }).idempotentReplay,
    ).toBe(true);
    expect(() =>
      replayOrConflict(db, row, 'p_kiosco', {
        fromId: 'p_ana',
        toIdentifier: 'kiosco',
        amountCents: 1300,
        note: null,
        idempotencyKey: 'race-key',
      }),
    ).toThrowError(ApiError);
  });

  it('limita la longitud de Idempotency-Key a 120 caracteres', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    const tooLong = await pay(app, token, { to: 'kiosco', amount_cents: 100 }, 'x'.repeat(121));
    expect(tooLong.statusCode).toBe(422);
    expect(tooLong.json().error.code).toBe('VALIDATION_ERROR');
    expect(countRows(db, 'transactions')).toBe(0);

    const atLimit = await pay(app, token, { to: 'kiosco', amount_cents: 100 }, 'x'.repeat(120));
    expect(atLimit.statusCode).toBe(201);
  });

  it('revierte todo el pago si falla un asiento', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');

    db.exec(`
      CREATE TRIGGER fail_receiver_entry
      BEFORE INSERT ON ledger_entries
      WHEN NEW.kind = 'payment_in'
      BEGIN
        SELECT RAISE(ABORT, 'falla forzada');
      END
    `);

    const response = await pay(app, token, { to: 'kiosco', amount_cents: 1000 });

    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe('INTERNAL_ERROR');
    expect(sumBalances(db)).toBe(0);
    expect(countRows(db, 'transactions')).toBe(0);
    expect(countRows(db, 'ledger_entries')).toBe(0);

    db.exec('DROP TRIGGER fail_receiver_entry');
  });

  it('mantiene las invariantes con múltiples pagos cruzados', async () => {
    const { app, db } = await setup();
    const ana = await login(app, 'ana');
    const bruno = await login(app, 'bruno');
    const kiosco = await login(app, 'kiosco');
    const cafe = await login(app, 'cafe');
    const foto = await login(app, 'foto');

    expect((await pay(app, ana, { to: 'kiosco', amount_cents: 1000 })).statusCode).toBe(201);
    expect((await pay(app, bruno, { to: 'ana', amount_cents: 500 })).statusCode).toBe(201);
    expect((await pay(app, kiosco, { to: 'cafe', amount_cents: 200 })).statusCode).toBe(201);
    expect((await pay(app, cafe, { to: 'foto', amount_cents: 100 })).statusCode).toBe(201);

    expect(countRows(db, 'transactions')).toBe(4);
    expect(countRows(db, 'ledger_entries')).toBe(8);
    expectLedgerInvariants(db);

    const stats = await app.inject({ url: '/api/stats', headers: bearer(ana) });
    expect(stats.json()).toMatchObject({
      transaction_count: 4,
      total_volume_cents: 1800,
      sum_balances_cents: 0,
      zero_sum_ok: true,
    });

    const fotoHistory = await app.inject({ url: '/api/transactions', headers: bearer(foto) });
    expect(fotoHistory.json().transactions[0]).toMatchObject({
      direction: 'in',
      amount_cents: 100,
      balance_after_cents: 100,
      counterparty: { alias: 'cafe' },
    });
  });
});

describe('historial y detalle', () => {
  it('lista solo los movimientos del usuario con dirección correcta', async () => {
    const { app } = await setup();
    const ana = await login(app, 'ana');
    const bruno = await login(app, 'bruno');
    const kiosco = await login(app, 'kiosco');

    await pay(app, ana, { to: 'kiosco', amount_cents: 1000 });
    await pay(app, bruno, { to: 'ana', amount_cents: 500 });

    const anaHistory = await app.inject({ url: '/api/transactions', headers: bearer(ana) });
    const transactions = anaHistory.json().transactions as Array<Record<string, unknown>>;
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      direction: 'in',
      counterparty: { alias: 'bruno' },
      amount_cents: 500,
      balance_after_cents: -500,
    });
    expect(transactions[1]).toMatchObject({
      direction: 'out',
      counterparty: { alias: 'kiosco' },
      amount_cents: 1000,
      balance_after_cents: -1000,
    });

    const limited = await app.inject({
      url: '/api/transactions?limit=1',
      headers: bearer(ana),
    });
    expect(limited.json().transactions).toHaveLength(1);

    const kioscoHistory = await app.inject({
      url: '/api/transactions',
      headers: bearer(kiosco),
    });
    expect(kioscoHistory.json().transactions).toHaveLength(1);
    expect(kioscoHistory.json().transactions[0].direction).toBe('in');
  });

  it('devuelve el detalle solo a los participantes', async () => {
    const { app } = await setup();
    const ana = await login(app, 'ana');
    const cafe = await login(app, 'cafe');

    const payment = await pay(app, ana, { to: 'kiosco', amount_cents: 1000 });
    const id = payment.json().transaction.id;

    const own = await app.inject({ url: `/api/transactions/${id}`, headers: bearer(ana) });
    expect(own.statusCode).toBe(200);
    expect(own.json().transaction.id).toBe(id);

    const outsider = await app.inject({
      url: `/api/transactions/${id}`,
      headers: bearer(cafe),
    });
    expect(outsider.statusCode).toBe(404);

    const missing = await app.inject({
      url: '/api/transactions/tx_inexistente',
      headers: bearer(ana),
    });
    expect(missing.statusCode).toBe(404);
  });

  it('expone el detalle con saldos relativos al usuario autenticado', async () => {
    const { app } = await setup();
    const ana = await login(app, 'ana');
    const kiosco = await login(app, 'kiosco');
    const bruno = await login(app, 'bruno');

    // ana paga 1000 y luego recibe 400 de bruno: el detalle debe usar el asiento
    // de cada transacción, no el saldo actual.
    const payment = await pay(app, ana, { to: 'kiosco', amount_cents: 1000 });
    const id = payment.json().transaction.id as string;
    await pay(app, bruno, { to: 'ana', amount_cents: 400 });

    const senderView = await app.inject({
      url: `/api/transactions/${id}`,
      headers: bearer(ana),
    });
    expect(senderView.statusCode).toBe(200);
    expect(senderView.json().transaction).toMatchObject({
      id,
      balance_after_cents: -1000,
      counterparty_balance_after_cents: 1000,
      from: { alias: 'ana' },
      to: { alias: 'kiosco' },
    });

    const receiverView = await app.inject({
      url: `/api/transactions/${id}`,
      headers: bearer(kiosco),
    });
    expect(receiverView.statusCode).toBe(200);
    expect(receiverView.json().transaction).toMatchObject({
      id,
      balance_after_cents: 1000,
      counterparty_balance_after_cents: -1000,
      from: { alias: 'ana' },
      to: { alias: 'kiosco' },
    });
  });

  it('busca participantes por alias o nombre', async () => {
    const { app } = await setup();
    const token = await login(app, 'ana');

    const all = await app.inject({ url: '/api/participants', headers: bearer(token) });
    expect(all.json().participants).toHaveLength(5);

    const search = await app.inject({
      url: '/api/participants?q=kios',
      headers: bearer(token),
    });
    expect(search.json().participants).toHaveLength(1);
    expect(search.json().participants[0]).toMatchObject({ alias: 'kiosco', role: 'merchant' });

    const byName = await app.inject({
      url: '/api/participants?q=central',
      headers: bearer(token),
    });
    expect(byName.json().participants).toEqual([
      expect.objectContaining({ alias: 'cafe', display_name: 'Café Central' }),
    ]);
  });

  it('trata los comodines de búsqueda como texto literal', async () => {
    const { app } = await setup();
    const token = await login(app, 'ana');

    for (const q of ['%', '_', '%%', '\\']) {
      const response = await app.inject({
        url: `/api/participants?q=${encodeURIComponent(q)}`,
        headers: bearer(token),
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().participants).toEqual([]);
    }

    const ana = await app.inject({ url: '/api/participants?q=ana', headers: bearer(token) });
    expect(ana.json().participants).toEqual([expect.objectContaining({ alias: 'ana' })]);
  });
});

describe('stats y reset', () => {
  it('stats reporta la invariante de suma cero', async () => {
    const { app } = await setup();
    const ana = await login(app, 'ana');
    const bruno = await login(app, 'bruno');

    await pay(app, ana, { to: 'kiosco', amount_cents: 1500 });
    await pay(app, bruno, { to: 'cafe', amount_cents: 3000 });

    const response = await app.inject({ url: '/api/stats', headers: bearer(ana) });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      participant_count: 5,
      transaction_count: 2,
      total_volume_cents: 4500,
      sum_balances_cents: 0,
      zero_sum_ok: true,
      currency: 'localito',
    });
  });

  it('exige Bearer para el reset y no borra nada sin sesión', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');
    await pay(app, token, { to: 'kiosco', amount_cents: 1500 });

    const unauthorized = await app.inject({
      method: 'POST',
      url: '/api/demo/reset',
      payload: { confirm: 'reset' },
    });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json().error.code).toBe('UNAUTHORIZED');
    expect(countRows(db, 'transactions')).toBe(1);
    expect(countRows(db, 'sessions')).toBe(1);
    expect(sumBalances(db)).toBe(0);
  });

  it('reset autenticado borra movimientos, sesiones y saldos', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');
    await pay(app, token, { to: 'kiosco', amount_cents: 1500 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/demo/reset',
      headers: bearer(token),
      payload: { confirm: 'reset' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ reset: true });

    expect(sumBalances(db)).toBe(0);
    expect(countRows(db, 'transactions')).toBe(0);
    expect(countRows(db, 'ledger_entries')).toBe(0);
    expect(countRows(db, 'sessions')).toBe(0);

    const oldSession = await app.inject({ url: '/api/me', headers: bearer(token) });
    expect(oldSession.statusCode).toBe(401);

    const freshToken = await login(app, 'kiosco');
    const me = await app.inject({ url: '/api/me', headers: bearer(freshToken) });
    expect(me.json().balance_cents).toBe(0);

    const stats = await app.inject({ url: '/api/stats', headers: bearer(freshToken) });
    expect(stats.json().transaction_count).toBe(0);
    expect(stats.json().zero_sum_ok).toBe(true);
  });

  it('exige confirmación explícita para el reset', async () => {
    const { app } = await setup();
    const token = await login(app, 'ana');
    const response = await app.inject({
      method: 'POST',
      url: '/api/demo/reset',
      headers: bearer(token),
      payload: { confirm: 'otra-cosa' },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('no expone el reset cuando DEMO_MODE está apagado, aun con sesión válida', async () => {
    const { app } = await setup(false);
    const token = await login(app, 'ana');
    const response = await app.inject({
      method: 'POST',
      url: '/api/demo/reset',
      headers: bearer(token),
      payload: { confirm: 'reset' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });
});

describe('contrato estricto de respuestas', () => {
  it('login, me y participantes exponen exactamente los campos del contrato', async () => {
    const { app } = await setup();
    const health = await app.inject({ url: '/api/health' });
    expect(Object.keys(health.json()).sort()).toEqual(['service', 'status', 'time', 'version']);

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/demo',
      payload: { alias: 'ana' },
    });
    const loginBody = loginResponse.json();
    expect(Object.keys(loginBody).sort()).toEqual(['participant', 'token']);
    expect(Object.keys(loginBody.participant).sort()).toEqual([
      'alias',
      'available_cents',
      'balance_cents',
      'credit_limit_cents',
      'display_name',
      'id',
      'max_positive_cents',
      'receive_capacity_cents',
      'role',
      'status',
    ]);

    const me = await app.inject({
      url: '/api/me',
      headers: bearer(loginBody.token as string),
    });
    expect(Object.keys(me.json()).sort()).toEqual(Object.keys(loginBody.participant).sort());

    const participants = await app.inject({
      url: '/api/participants?q=kiosco',
      headers: bearer(loginBody.token as string),
    });
    expect(Object.keys(participants.json()).sort()).toEqual(['participants']);
    expect(Object.keys(participants.json().participants[0]).sort()).toEqual(
      Object.keys(loginBody.participant).sort(),
    );
  });

  it('payment, historial, detalle, stats y errores respetan la forma congelada', async () => {
    const { app } = await setup();
    const token = await login(app, 'ana');

    const payment = await pay(app, token, { to: 'kiosco', amount_cents: 500 });
    const body = payment.json();
    expect(Object.keys(body).sort()).toEqual(['idempotent_replay', 'transaction']);
    expect(Object.keys(body.transaction).sort()).toEqual([
      'amount_cents',
      'balance_after_cents',
      'counterparty_balance_after_cents',
      'created_at',
      'currency',
      'from',
      'id',
      'note',
      'status',
      'to',
    ]);

    const history = await app.inject({ url: '/api/transactions', headers: bearer(token) });
    expect(Object.keys(history.json())).toEqual(['transactions']);
    expect(Object.keys(history.json().transactions[0]).sort()).toEqual([
      'amount_cents',
      'balance_after_cents',
      'counterparty',
      'created_at',
      'direction',
      'id',
      'note',
    ]);

    const detail = await app.inject({
      url: `/api/transactions/${body.transaction.id}`,
      headers: bearer(token),
    });
    expect(Object.keys(detail.json())).toEqual(['transaction']);
    expect(Object.keys(detail.json().transaction).sort()).toEqual(
      Object.keys(body.transaction).sort(),
    );

    const stats = await app.inject({ url: '/api/stats', headers: bearer(token) });
    expect(Object.keys(stats.json()).sort()).toEqual([
      'currency',
      'participant_count',
      'sum_balances_cents',
      'total_volume_cents',
      'transaction_count',
      'zero_sum_ok',
    ]);

    const error = await app.inject({
      method: 'POST',
      url: '/api/payments',
      headers: bearer(token),
      payload: { to: 'kiosco', amount_cents: 0 },
    });
    expect(error.statusCode).toBe(422);
    expect(Object.keys(error.json())).toEqual(['error']);
    expect(Object.keys(error.json().error).sort()).toEqual(['code', 'details', 'message']);
    expect(Object.keys(error.json().error.details)).toEqual(['issues']);

    const unauthorized = await app.inject({ url: '/api/me' });
    expect(Object.keys(unauthorized.json().error).sort()).toEqual(['code', 'message']);
  });
});

describe('seed y migraciones', () => {
  it('es idempotente al reabrir y repara un seed parcial', () => {
    const path = tempDbPath();

    const first = createDb(path);
    first.close();

    const second = createDb(path);
    expect((second.prepare('SELECT COUNT(*) AS count FROM participants').get() as { count: number }).count).toBe(5);
    second.prepare("DELETE FROM participants WHERE alias = 'foto'").run();
    second.close();

    const third = createDb(path);
    const aliases = third
      .prepare('SELECT alias FROM participants ORDER BY alias')
      .all() as Array<{ alias: string }>;
    expect(aliases.map((row) => row.alias)).toEqual(['ana', 'bruno', 'cafe', 'foto', 'kiosco']);
    const foto = third.prepare("SELECT * FROM participants WHERE alias = 'foto'").get() as {
      display_name: string;
      balance_cents: number;
    };
    expect(foto).toMatchObject({ display_name: 'Fotocopias Norte', balance_cents: 0 });
    third.close();
  });

  it('migra sesiones en claro y asientos sin kind sin perder datos', () => {
    const path = tempDbPath();
    const legacy = new DatabaseSync(path);
    legacy.exec(`
      CREATE TABLE participants (
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

      CREATE TABLE transactions (
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

      CREATE TABLE ledger_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT NOT NULL REFERENCES transactions(id),
        participant_id TEXT NOT NULL REFERENCES participants(id),
        delta_cents INTEGER NOT NULL,
        balance_after_cents INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE sessions (
        token TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL
      );
    `);
    const createdAt = '2026-11-07T10:00:00.000Z';
    legacy.prepare(
      `INSERT INTO participants
        (id, alias, display_name, role, status, balance_cents, credit_limit_cents, max_positive_cents, created_at)
       VALUES (?, ?, ?, ?, 'active', ?, 50000, 100000, ?)`,
    ).run('p_ana', 'ana', 'Ana', 'member', -1000, createdAt);
    legacy.prepare(
      `INSERT INTO participants
        (id, alias, display_name, role, status, balance_cents, credit_limit_cents, max_positive_cents, created_at)
       VALUES (?, ?, ?, ?, 'active', ?, 50000, 100000, ?)`,
    ).run('p_kiosco', 'kiosco', 'Kiosco La Esquina', 'merchant', 1000, createdAt);
    legacy.prepare(
      `INSERT INTO transactions
        (id, from_id, to_id, amount_cents, currency, note, status, idempotency_key, created_at)
       VALUES ('tx_legacy', 'p_ana', 'p_kiosco', 1000, 'localito', 'legacy', 'confirmed', NULL, ?)`,
    ).run(createdAt);
    legacy.prepare(
      `INSERT INTO ledger_entries (transaction_id, participant_id, delta_cents, balance_after_cents, created_at)
       VALUES ('tx_legacy', 'p_ana', -1000, -1000, ?)`,
    ).run(createdAt);
    legacy.prepare(
      `INSERT INTO ledger_entries (transaction_id, participant_id, delta_cents, balance_after_cents, created_at)
       VALUES ('tx_legacy', 'p_kiosco', 1000, 1000, ?)`,
    ).run(createdAt);
    legacy.prepare('INSERT INTO sessions (token, participant_id, created_at) VALUES (?, ?, ?)').run(
      'legacy-token',
      'p_ana',
      createdAt,
    );
    legacy.close();

    const migrated = createDb(path);
    const session = migrated
      .prepare('SELECT token_hash, expires_at FROM sessions WHERE participant_id = ?')
      .get('p_ana') as { token_hash: string; expires_at: string };
    expect(session.token_hash).toBe(hashSessionToken('legacy-token'));
    expect(Date.parse(session.expires_at)).toBe(Date.parse(createdAt) + SESSION_TTL_MS);

    const entries = migrated
      .prepare('SELECT delta_cents, kind FROM ledger_entries ORDER BY id')
      .all() as Array<{ delta_cents: number; kind: string }>;
    expect(entries).toEqual([
      { delta_cents: -1000, kind: 'payment_out' },
      { delta_cents: 1000, kind: 'payment_in' },
    ]);

    const balances = migrated
      .prepare('SELECT id, balance_cents FROM participants WHERE id IN (?, ?) ORDER BY id')
      .all('p_ana', 'p_kiosco') as Array<{ id: string; balance_cents: number }>;
    expect(balances).toEqual([
      { id: 'p_ana', balance_cents: -1000 },
      { id: 'p_kiosco', balance_cents: 1000 },
    ]);
    expectLedgerInvariants(migrated);
    migrated.close();
  });

  it('expone busy_timeout y foreign_keys tras abrir la base', () => {
    const db = createDb(':memory:');
    const busyTimeout = db.prepare('PRAGMA busy_timeout').get() as { timeout: number };
    const foreignKeys = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
    expect(busyTimeout.timeout).toBe(5_000);
    expect(foreignKeys.foreign_keys).toBe(1);
    db.close();
  });
});
