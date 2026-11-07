# Localito — Contrato API v0 (flujo mínimo)

Estado: **congelado para el flujo mínimo demostrable**. Cualquier cambio se avisa a Oky antes de romperlo.

Base local: `http://localhost:3001/api`
Formato: JSON, UTF-8. Montos: enteros en centavos (`amount_cents`).
Moneda: unidad Localito, 1 unidad = 1 ARS nominal (provisional, O1 pendiente).
Autenticación: `Authorization: Bearer <token>` salvo en `POST /auth/demo` y `GET /health`.

## Flujo que cubre

1. La persona entra con un alias de demo.
2. Ve su saldo, límite y disponible.
3. Busca un comercio o contacto.
4. Paga indicando monto y nota.
5. Ve el recibo y el historial.
6. El comercio ve el cobro y su saldo actualizado.

## Participantes de demo

| alias | nombre | rol | límite de crédito | tope positivo |
|---|---|---|---:|---:|
| `ana` | Ana | member | 50.000 | 100.000 |
| `bruno` | Bruno | member | 50.000 | 100.000 |
| `kiosco` | Kiosco La Esquina | merchant | 50.000 | 100.000 |
| `cafe` | Café Central | merchant | 50.000 | 100.000 |
| `foto` | Fotocopias Norte | merchant | 50.000 | 100.000 |

Todos arrancan con saldo `0`. Los montos de la tabla están en centavos.

## Modelo de saldo

- `balance_cents`: saldo actual. Puede ser negativo.
- `credit_limit_cents`: cuánto puede bajar el saldo (crédito disponible).
- `available_cents = balance_cents + credit_limit_cents`: margen para pagar.
- `receive_capacity_cents = max_positive_cents - balance_cents`: margen para recibir.
- Invariante del circuito: `SUM(balance_cents) = 0` en todo momento.
- Un pago mueve el saldo del emisor y del receptor en la misma transacción; nunca se crea ni se destruye saldo.

## Endpoints

### `GET /health`

Sin auth.

```json
{ "status": "ok", "service": "localito-api", "version": "0.1.0", "time": "2026-11-07T12:00:00.000Z" }
```

### `POST /auth/demo`

Body:

```json
{ "alias": "ana" }
```

Respuesta `200`:

```json
{
  "token": "0f4c2f7e-...",
  "participant": { "id": "p_ana", "alias": "ana", "display_name": "Ana", "role": "member", "status": "active", "balance_cents": 0, "credit_limit_cents": 50000, "available_cents": 50000, "max_positive_cents": 100000, "receive_capacity_cents": 100000 }
}
```

Errores: `404 NOT_FOUND` si el alias no existe.

### `GET /me`

Auth. Devuelve el participante autenticado con los mismos campos que arriba.

### `GET /participants?q=<texto>`

Auth. Busca por alias o nombre. Sin `q`, devuelve hasta 20 participantes. Incluye al propio usuario; el front puede filtrarlo.

```json
{
  "participants": [
    { "id": "p_kiosco", "alias": "kiosco", "display_name": "Kiosco La Esquina", "role": "merchant", "status": "active", "balance_cents": 0, "credit_limit_cents": 50000, "available_cents": 50000, "max_positive_cents": 100000, "receive_capacity_cents": 100000 }
  ]
}
```

### `POST /payments`

Auth. Header recomendado: `Idempotency-Key: <uuid>`. Si se repite la misma clave para el mismo emisor, devuelve la misma transacción con `idempotent_replay: true` y no vuelve a mover saldos.

Body:

```json
{ "to": "kiosco", "amount_cents": 1500, "note": "Compra de demo" }
```

Respuesta `201`:

```json
{
  "transaction": {
    "id": "tx_...",
    "status": "confirmed",
    "amount_cents": 1500,
    "currency": "localito",
    "from": { "id": "p_ana", "alias": "ana", "display_name": "Ana" },
    "to": { "id": "p_kiosco", "alias": "kiosco", "display_name": "Kiosco La Esquina" },
    "note": "Compra de demo",
    "created_at": "2026-11-07T12:00:00.000Z",
    "balance_after_cents": -1500,
    "counterparty_balance_after_cents": 1500
  },
  "idempotent_replay": false
}
```

Errores de negocio (`422` salvo indicación):

| code | cuándo | details |
|---|---|---|
| `VALIDATION_ERROR` | body inválido, monto <= 0, alias faltante | `issues` |
| `UNAUTHORIZED` (401) | token ausente o inválido | — |
| `NOT_FOUND` (404) | destinatario inexistente | — |
| `SELF_PAYMENT` | `to` es el mismo usuario | — |
| `PARTICIPANT_INACTIVE` (409) | emisor o receptor no está `active` | `participant` |
| `INSUFFICIENT_CREDIT` | el emisor no tiene margen | `available_cents`, `requested_cents`, `shortfall_cents` |
| `RECEIVER_LIMIT` | el receptor llegaría a su tope positivo | `receive_capacity_cents`, `requested_cents` |
| `IDEMPOTENCY_CONFLICT` (409) | misma clave con body distinto | — |

Forma única de error:

```json
{ "error": { "code": "INSUFFICIENT_CREDIT", "message": "No tenés margen suficiente.", "details": { "available_cents": 200, "requested_cents": 1500, "shortfall_cents": 1300 } } }
```

Los mensajes de `message` son para mostrar; `code` es para lógica del front y tests.

### `GET /transactions?limit=50`

Auth. Devuelve solo los movimientos del usuario autenticado, más recientes primero. `limit` máximo 100.

```json
{
  "transactions": [
    {
      "id": "tx_...",
      "direction": "out",
      "counterparty": { "alias": "kiosco", "display_name": "Kiosco La Esquina" },
      "amount_cents": 1500,
      "note": "Compra de demo",
      "created_at": "2026-11-07T12:00:00.000Z",
      "balance_after_cents": -1500
    }
  ]
}
```

`direction`: `out` si el usuario pagó, `in` si recibió. `balance_after_cents` es el saldo del usuario después de ese movimiento.

### `GET /transactions/:id`

Auth. Devuelve el detalle completo si el usuario participó; `404` si no existe o no participó.

### `GET /stats`

Auth. Para el indicador de circularidad y la verificación de la demo.

```json
{
  "participant_count": 5,
  "transaction_count": 3,
  "total_volume_cents": 4500,
  "sum_balances_cents": 0,
  "zero_sum_ok": true,
  "currency": "localito"
}
```

### `POST /demo/reset`

Solo si `DEMO_MODE=true` (default en desarrollo). Body `{ "confirm": "reset" }`. Borra movimientos, sesiones y deja los participantes en saldo `0`. Respuesta `200` con `{ "reset": true }`. No se expone en producción.

## CORS

En desarrollo se permite el origen del front (`http://localhost:3000`, `http://localhost:5173`) y cualquier origen local con `DEMO_MODE=true`. En producción, lista explícita en `CORS_ORIGINS`.

## Persistencia

SQLite local en `services/api/data/localito.db` (ignorado por git). El esquema se crea al arrancar. En tests se usa `:memory:`.

## Contrato de integración con el front

- El front no calcula saldos ni límites: los muestra desde `GET /me` y `GET /participants`.
- El front genera `Idempotency-Key` con `crypto.randomUUID()` por intento de pago y la reutiliza al reintentar.
- El front refresca `GET /me` y `GET /transactions` después de un pago confirmado.
- Errores: mostrar `error.message`; usar `error.code` para estados especiales (`INSUFFICIENT_CREDIT`, `RECEIVER_LIMIT`).
- No hay websockets ni push en v0: el comercio refresca o consulta al recibir un cobro.
