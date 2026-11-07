# Localito API (demo mínima)

Backend del flujo mínimo de Localito: participantes de demo, saldo con signo, pagos entre
miembros, historial y verificación de la invariante `SUM(balance_cents) = 0`.

Stack: Node 24 + TypeScript ESM, Fastify 5, zod 4, `node:sqlite` (sin ORM), vitest.

## Comandos

```bash
npm install
npm run dev        # tsx watch src/server.ts
npm start          # tsx src/server.ts
npm run typecheck  # tsc --noEmit
npm test           # vitest run (:memory:)
npm run build      # tsc -> dist/
```

El esquema se crea al arrancar. La base vive en `data/localito.db` (ignorada por git) y se
siembra con los cinco participantes de demo si está vacía.

## Variables de entorno

| Variable | Default | Uso |
|---|---|---|
| `PORT` | `3001` | Puerto HTTP. |
| `HOST` | `127.0.0.1` | Interfaz de escucha (`0.0.0.0` para acceder desde la LAN). |
| `DATABASE_PATH` | `data/localito.db` | Ruta del archivo SQLite (`:memory:` para efímero). |
| `DEMO_MODE` | `true` | Habilita `POST /api/demo/reset` y CORS para orígenes locales. `false` lo apaga. |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Lista separada por comas. |

## Participantes de demo

| alias | nombre | rol | límite | tope positivo |
|---|---|---|---:|---:|
| `ana` | Ana | member | 50.000 | 100.000 |
| `bruno` | Bruno | member | 50.000 | 100.000 |
| `kiosco` | Kiosco La Esquina | merchant | 50.000 | 100.000 |
| `cafe` | Café Central | merchant | 50.000 | 100.000 |
| `foto` | Fotocopias Norte | merchant | 50.000 | 100.000 |

Todos arrancan en saldo `0`. Todos los montos son enteros en centavos.

## Endpoints

Base: `http://localhost:3001/api`. Todo salvo `/api/health` y `/api/auth/demo` requiere
`Authorization: Bearer <token>`. Los errores tienen la forma
`{ "error": { "code", "message", "details?" } }`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio (sin auth). |
| POST | `/api/auth/demo` | Body `{ "alias": "ana" }` → `{ token, participant }`. |
| GET | `/api/me` | Participante autenticado (objeto plano con saldo y límites). |
| GET | `/api/participants?q=` | Directorio, hasta 20 resultados. |
| POST | `/api/payments` | Body `{ to, amount_cents, note? }` + `Idempotency-Key`. |
| GET | `/api/transactions?limit=50` | Historial propio (máx. 100). |
| GET | `/api/transactions/:id` | Detalle si el usuario participó (`404` si no). |
| GET | `/api/stats` | Conteos, volumen y `zero_sum_ok`. |
| POST | `/api/demo/reset` | Body `{ "confirm": "reset" }`; solo con `DEMO_MODE=true`. |

Un reintento con la misma `Idempotency-Key` y el mismo payload devuelve la transacción original
con `idempotent_replay: true` (HTTP `201` en ambos casos). La misma clave con otro payload
responde `409 IDEMPOTENCY_CONFLICT`.

## Curl de ejemplo

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/demo \
  -H 'Content-Type: application/json' \
  -d '{"alias":"ana"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")

# Saldo propio
curl -s http://localhost:3001/api/me -H "Authorization: Bearer $TOKEN"

# Directorio
curl -s "http://localhost:3001/api/participants?q=kios" -H "Authorization: Bearer $TOKEN"

# Pago
curl -s -X POST http://localhost:3001/api/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 3f1c2a9e-demo' \
  -d '{"to":"kiosco","amount_cents":1500,"note":"Compra de demo"}'

# Historial y verificación del circuito
curl -s "http://localhost:3001/api/transactions?limit=10" -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3001/api/stats -H "Authorization: Bearer $TOKEN"

# Reset de demo
curl -s -X POST http://localhost:3001/api/demo/reset \
  -H 'Content-Type: application/json' -d '{"confirm":"reset"}'
```

## Reglas implementadas

- `amount_cents` entero > 0; receptor existente; no autopago; emisor y receptor `active`.
- `available_cents = balance_cents + credit_limit_cents` ≥ monto.
- `receive_capacity_cents = max_positive_cents - balance_cents` ≥ monto.
- Cada pago mueve los dos saldos y escribe dos asientos en `ledger_entries` dentro de
  `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`. Idempotencia única por `(from_id, idempotency_key)`.
- `SUM(balance_cents)` se mantiene en `0`; `GET /api/stats` lo verifica con `zero_sum_ok`.

### Notas de contrato

- `GET /api/me` devuelve el participante plano (sin envoltorio `participant`).
- El replay idempotente también responde `201`, igual que el pago original.
