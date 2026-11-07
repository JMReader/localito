import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createDb } from '../src/db.js';

type Ctx = { app: FastifyInstance; db: DatabaseSync };

const openApps: FastifyInstance[] = [];

async function setup(demoMode = true): Promise<Ctx> {
  const db = createDb(':memory:');
  const app = await createApp({ db, demoMode, corsOrigins: [] });
  openApps.push(app);
  return { app, db };
}

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

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

  it('rechaza pagos sin margen y no toca saldos', async () => {
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
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM transactions').get() as { count: number },
    ).toEqual({ count: 0 });
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

  it('reset borra movimientos, sesiones y saldos', async () => {
    const { app, db } = await setup();
    const token = await login(app, 'ana');
    await pay(app, token, { to: 'kiosco', amount_cents: 1500 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/demo/reset',
      payload: { confirm: 'reset' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ reset: true });

    expect(sumBalances(db)).toBe(0);
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM transactions').get() as { count: number },
    ).toEqual({ count: 0 });

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
    const response = await app.inject({
      method: 'POST',
      url: '/api/demo/reset',
      payload: { confirm: 'otra-cosa' },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('no expone el reset cuando DEMO_MODE está apagado', async () => {
    const { app } = await setup(false);
    const response = await app.inject({
      method: 'POST',
      url: '/api/demo/reset',
      payload: { confirm: 'reset' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });
});
