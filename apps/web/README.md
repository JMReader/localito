# PREStAR web

Frontend de PREStAR: crédito mutuo en **PRt** sobre **Arbitrum One** (chain
`42161`) y rampa 1:1 contra una reserva de **ARGt**. Next.js (App Router) +
TypeScript + viem, mobile-first, sin librerías de UI externas.

> El flujo anterior Localito/TL sobre SQLite quedó en `/legacy`, marcado como
> sandbox. Sus balances no son PRt ni on-chain.

## Correr

```powershell
cd apps/web
Copy-Item .env.example .env.local
npm install
npm run dev
```

Queda en `http://localhost:3000`. La API legacy (`NEXT_PUBLIC_API_URL`) sólo la
usa `/legacy`.

## Variables

| variable | uso |
|---|---|
| `NEXT_PUBLIC_PRESTAR_CORE_ADDRESS` | address verificado de `PrestarCore`. **Vacío = contrato no desplegado**: la UI deshabilita todas las llamadas. No inventar. |
| `NEXT_PUBLIC_PRESTAR_RPC_URL` | RPC HTTP de Arbitrum One (lectura de saldos, allowance y receipts). Vacío = RPC público. |
| `NEXT_PUBLIC_ARGT_TOKEN_ADDRESS` | ARGt ERC-20 (18 decimales). Default `0x59863989d080B22476DB95656d0C3CC18be92214`. |
| `NEXT_PUBLIC_API_URL` | API legacy del sandbox SQLite, usada sólo por `/legacy`. |

No pongas claves privadas, mnemonics ni API keys de wallet en variables
`NEXT_PUBLIC_*`: se exponen al navegador. PREStAR no guarda claves.

## Qué muestra `PrestarCard`

- Conexión MetaMask y red actual. Si no es `42161`, bloquea la firma y ofrece
  cambiar a Arbitrum One.
- `balanceOfMember(address)`: saldo PRt firmado (puede ser negativo por crédito).
- `balanceOf` y `allowance` de ARGt en la wallet.
- Estado `paused` del contrato.
- Pago PRt a una dirección `0x…` visible (sin mapeo alias → wallet).
- On-ramp ARGt → PRt: `approve` exacto + `onramp(cents)`.
- Off-ramp PRt → ARGt: `offramp(cents)` contra la reserva limitada.
- Estados de tx: firmando → enviando → confirmado/revertido, con hash a
  Arbiscan.

Montos: PRt se ingresa con hasta 2 decimales y se convierte a centavos con
`parseUnits`. La conversión a ARGt es exacta:
`argtRaw = prtCents * 10n ** 16n`. No se usan floats.

## Seguridad de la UI

- Sin `NEXT_PUBLIC_PRESTAR_CORE_ADDRESS` válida, muestra **"contrato aún no
  desplegado"** y deshabilita todo. **No hay fallback** a `transfer` directo de
  ARGt.
- No firma si la wallet no está en Arbitrum One.
- No pide ni guarda frase semilla.
- No promete convertibilidad: el off-ramp puede revertir si la reserva no
  alcanza.

## Scripts

| script | qué hace |
|---|---|
| `npm run dev` | Next en el puerto 3000 |
| `npm run build` | build de producción |
| `npm run start` | sirve el build en el puerto 3000 |
| `npm run typecheck` | `tsc --noEmit` |

## Legacy

`/legacy` conserva el login por alias (`ana`, `bruno`, `kiosco`, `cafe`, `foto`),
pago con `Idempotency-Key`, recibo, historial y reset de demo sobre SQLite. Está
etiquetado como **sandbox legacy / TL ≠ PRt**. No es fuente de verdad on-chain y
no se conecta a `PrestarCore`.
