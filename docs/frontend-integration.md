# Localito — Guía de integración del front con la API v0

Para el front de Oky (`LemonLocalitoWallet.tsx` / `apps/web`). El contrato completo está en
[`docs/api-contract.md`](api-contract.md). Esta guía es el mapa entre las pantallas y los
endpoints reales.

## Base URL

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Si el front corre en otra máquina o en un celular de la LAN, levantá el backend con:

```powershell
cd services/api
$env:HOST = "0.0.0.0"
npm run dev
```

Y usá `http://<IP-de-la-máquina>:3001/api`. CORS ya permite `localhost:3000`, `localhost:5173`
y orígenes privados de LAN en modo demo.

## Autenticación de demo

No hay passwords. El usuario elige un alias de la tabla de demo y el front guarda el token:

```ts
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function login(alias: string) {
  const res = await fetch(`${API}/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias }),
  });
  if (!res.ok) throw new Error('No se pudo entrar');
  return (await res.json()) as { token: string; participant: Participant };
}
```

Guardar `token` en memoria o `localStorage` para la demo. Todas las llamadas siguientes llevan
`Authorization: Bearer <token>`.

Alias disponibles: `ana`, `bruno`, `kiosco`, `cafe`, `foto`.

## Mapa pantalla → endpoint

| Pantalla / componente | Endpoint | Campos |
|---|---|---|
| Login / selector de perfil | `POST /auth/demo` | `{ alias }` → `{ token, participant }` |
| Saldo, límite y disponible | `GET /me` | `balance_cents`, `credit_limit_cents`, `available_cents`, `receive_capacity_cents` |
| Historial / movimientos | `GET /transactions?limit=50` | `direction`, `counterparty`, `amount_cents`, `note`, `created_at`, `balance_after_cents` |
| Enviar pago | `POST /payments` | `{ to, amount_cents, note? }` + header `Idempotency-Key` |
| Recibo / detalle | `GET /transactions/:id` | `transaction` completa |
| Cobrar con QR | Sin endpoint nuevo | El QR codifica `localito://pay?to=<alias>&amount_cents=<n>`; el pagador llama `POST /payments` |
| Vista de comercio | `GET /me` + `GET /transactions` | El comercio refresca y ve los cobros recibidos |
| Indicador de circularidad | `GET /stats` | `zero_sum_ok`, `sum_balances_cents`, `total_volume_cents` |
| Reset para presentación | `POST /demo/reset` | `{ confirm: "reset" }` (solo `DEMO_MODE=true`) |

## Formato de montos

La API trabaja **siempre en centavos enteros**. El front formatea:

```ts
const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
}).format(cents / 100);
```

Ejemplo: `amount_cents: 1500` = `$ 15,00`. La unidad de cuenta del demo es 1 unidad = 1 ARS
nominal (default provisional de O1, pre-aprobado por el usuario y pendiente de confirmación de Oky).

## Pago con idempotencia

```ts
export async function pay(token: string, to: string, amountCents: number, note?: string) {
  const res = await fetch(`${API}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({ to, amount_cents: amountCents, note }),
  });
  const data = await res.json();
  if (!res.ok) throw data.error;
  return data;
}
```

Generar una clave nueva por intento y reutilizarla al reintentar. Después de un pago confirmado,
refrescar `GET /me` y `GET /transactions`.

## Qué mostrar y qué ocultar en el demo

El prototipo Lemon UI tiene multi-activo (`ARGt`, `TL`, `USDT`, `USDC`, `DAI`), swap, depósito y
crédito onchain. El backend v0 solo implementa **la moneda local (`TL` / `localito`)**.

Para el demo:

- Mostrar `TL` como la moneda principal y mapear `balance_cents` a su saldo.
- Ocultar o deshabilitar `ARGt`, `USDT`, `USDC`, `DAI`, Swap y Depósito con un aviso "no disponible
  en esta demo".
- La línea de crédito se muestra con `credit_limit_cents` y `available_cents` reales; no usar los
  valores mock de $850.000.
- No prometer rendimientos TNA ni respaldo onchain: el demo es un ledger local en SQLite.

## Errores

Forma:

```json
{ "error": { "code": "INSUFFICIENT_CREDIT", "message": "No tenés margen suficiente.", "details": { "available_cents": 200, "requested_cents": 1500, "shortfall_cents": 1300 } } }
```

| code | Qué mostrar |
|---|---|
| `INSUFFICIENT_CREDIT` | "Te faltan $X de margen" usando `shortfall_cents`. |
| `RECEIVER_LIMIT` | "El comercio no puede recibir más saldo en este momento". |
| `SELF_PAYMENT` | "No podés pagarte a vos mismo". |
| `PARTICIPANT_INACTIVE` | "La cuenta no está activa". |
| `NOT_FOUND` | "No encontramos ese alias". |

Usar `message` para el texto y `code` para la lógica. No mostrar `details` crudos al usuario.

## Checklist de integración

- [ ] `POST /auth/demo` con `ana` y guardar token.
- [ ] `GET /me` muestra saldo 0, límite 50.000 centavos y disponible 50.000.
- [ ] Enviar 1.500 centavos a `kiosco` con `Idempotency-Key`.
- [ ] `GET /me` de `ana` muestra `-1500`; `GET /me` de `kiosco` muestra `1500`.
- [ ] `GET /transactions` de ambos muestra el movimiento con `direction` correcta.
- [ ] Reintentar el mismo pago no duplica el movimiento.
- [ ] `GET /stats` devuelve `zero_sum_ok: true` y `sum_balances_cents: 0`.
- [ ] `POST /demo/reset` deja todo en cero para la próxima presentación.
