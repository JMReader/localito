import type { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import cors from '@fastify/cors';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { z } from 'zod';

import {
  MAX_ALIAS_LENGTH,
  MAX_IDEMPOTENCY_KEY_LENGTH,
  MAX_NOTE_LENGTH,
  createDb,
  createSession,
  findParticipantByAlias,
  findParticipantByToken,
  participantView,
} from './db.js';
import type { ParticipantRow } from './db.js';
import { ApiError } from './errors.js';
import {
  getStats,
  getTransactionForParticipant,
  listTransactions,
  pay,
  resetDemo,
} from './ledger.js';

const DEFAULT_DB_PATH = fileURLToPath(new URL('../data/localito.db', import.meta.url));
const DEFAULT_CORS_ORIGINS = 'http://localhost:3000,http://localhost:5173';

export type CreateAppOptions = {
  db?: DatabaseSync;
  dbPath?: string;
  demoMode?: boolean;
  corsOrigins?: string[];
  logger?: boolean;
};

const LoginSchema = z.object({
  alias: z
    .string()
    .trim()
    .min(1, 'Indicá un alias de demo.')
    .max(MAX_ALIAS_LENGTH, `El alias no puede superar los ${MAX_ALIAS_LENGTH} caracteres.`),
});

const SearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
});

const PaymentSchema = z.object({
  to: z
    .string()
    .trim()
    .min(1, 'Indicá a quién le pagás.')
    .max(MAX_ALIAS_LENGTH, `El alias no puede superar los ${MAX_ALIAS_LENGTH} caracteres.`),
  amount_cents: z.number().int().positive('El monto debe ser mayor a cero.'),
  note: z
    .string()
    .trim()
    .max(MAX_NOTE_LENGTH, `La nota no puede superar los ${MAX_NOTE_LENGTH} caracteres.`)
    .nullish(),
});

const ListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const ResetSchema = z.object({
  confirm: z.literal('reset'),
});

function formatIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
      issues: formatIssues(result.error),
    });
  }
  return result.data;
}

function readIdempotencyKey(request: FastifyRequest): string | null {
  const raw = request.headers['idempotency-key'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      `La clave de idempotencia no puede superar los ${MAX_IDEMPOTENCY_KEY_LENGTH} caracteres.`,
    );
  }
  return trimmed;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function requireParticipant(db: DatabaseSync, request: FastifyRequest): ParticipantRow {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Necesitás iniciar sesión.');
  }
  const participant = findParticipantByToken(db, header.slice('Bearer '.length).trim());
  if (!participant) {
    throw new ApiError(401, 'UNAUTHORIZED', 'La sesión no es válida. Volvé a entrar.');
  }
  return participant;
}

function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.replace(/^\[|\]$/g, '');
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.localhost') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const demoMode = options.demoMode ?? (process.env.DEMO_MODE ?? 'true') !== 'false';
  const dbPath = options.dbPath ?? process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
  const corsOrigins =
    options.corsOrigins ??
    (process.env.CORS_ORIGINS ?? DEFAULT_CORS_ORIGINS)
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

  const db = options.db ?? createDb(dbPath);
  const app = Fastify({ logger: options.logger ?? false });
  const allowedOrigins = new Set(corsOrigins);

  app.addHook('onClose', async () => {
    db.close();
  });

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (allowedOrigins.has('*')) return callback(null, true);
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      if (demoMode && isLocalOrigin(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    }

    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 400 || statusCode === 415) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'La petición no se pudo interpretar.' },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado.' },
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Recurso no encontrado.' } }),
  );

  app.get('/', async () => ({
    name: 'localito-api',
    status: 'ok',
    version: '0.1.0',
    endpoints: [
      '/api/health',
      '/api/auth/demo',
      '/api/me',
      '/api/participants',
      '/api/payments',
      '/api/transactions',
      '/api/stats',
    ],
  }));

  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'localito-api',
    version: '0.1.0',
    time: new Date().toISOString(),
  }));

  app.post('/api/auth/demo', async (request, reply) => {
    const { alias } = parseInput(LoginSchema, request.body);
    const participant = findParticipantByAlias(db, alias);
    if (!participant) {
      throw new ApiError(404, 'NOT_FOUND', 'No existe un participante con ese alias.');
    }
    const token = createSession(db, participant.id);
    return reply.status(200).send({ token, participant: participantView(participant) });
  });

  app.get('/api/me', async (request) => participantView(requireParticipant(db, request)));

  app.get('/api/participants', async (request) => {
    requireParticipant(db, request);
    const { q } = parseInput(SearchSchema, request.query);

    const rows = q
      ? (db
          .prepare(
            "SELECT * FROM participants WHERE alias LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\' ORDER BY alias LIMIT 20",
          )
          .all(`%${escapeLike(q)}%`, `%${escapeLike(q)}%`) as ParticipantRow[])
      : (db.prepare('SELECT * FROM participants ORDER BY alias LIMIT 20').all() as ParticipantRow[]);

    return { participants: rows.map(participantView) };
  });

  app.post('/api/payments', async (request, reply) => {
    const me = requireParticipant(db, request);
    const body = parseInput(PaymentSchema, request.body);
    const note = body.note && body.note.length > 0 ? body.note : null;

    const result = pay(db, {
      fromId: me.id,
      toIdentifier: body.to,
      amountCents: body.amount_cents,
      note,
      idempotencyKey: readIdempotencyKey(request),
    });

    return reply.status(201).send({
      transaction: result.transaction,
      idempotent_replay: result.idempotentReplay,
    });
  });

  app.get('/api/transactions', async (request) => {
    const me = requireParticipant(db, request);
    const { limit } = parseInput(ListSchema, request.query);
    return { transactions: listTransactions(db, me.id, limit ?? 50) };
  });

  app.get('/api/transactions/:id', async (request) => {
    const me = requireParticipant(db, request);
    const { id } = request.params as { id: string };
    const transaction = getTransactionForParticipant(db, id, me.id);
    if (!transaction) {
      throw new ApiError(404, 'NOT_FOUND', 'No encontramos ese movimiento.');
    }
    return { transaction };
  });

  app.get('/api/stats', async (request) => {
    requireParticipant(db, request);
    return getStats(db);
  });

  app.post('/api/demo/reset', async (request) => {
    if (!demoMode) {
      throw new ApiError(404, 'NOT_FOUND', 'El reset de demo no está disponible.');
    }
    requireParticipant(db, request);
    parseInput(ResetSchema, request.body);
    resetDemo(db);
    return { reset: true };
  });

  return app;
}

let defaultAppPromise: Promise<FastifyInstance> | null = null;

export default async function handler(req: any, res: any) {
  if (!defaultAppPromise) {
    defaultAppPromise = createApp({
      logger: false,
      dbPath: process.env.DATABASE_PATH ?? ':memory:',
      demoMode: true,
      corsOrigins: ['*'],
    });
  }
  const app = await defaultAppPromise;
  await app.ready();
  app.server.emit('request', req, res);
}
