# PREStAR

Red de **crédito mutuo** para comercios y prestadores locales, con libro mayor
on-chain en **Arbitrum One** y unidad de cuenta **PRt**.

> Nombre anterior: TwinLocal / Localito. La spec histórica
> [`docs/twinlocal-producto-v0.1.md`](docs/twinlocal-producto-v0.1.md) se
> conserva como referencia. La propuesta vigente es
> [`docs/prestar-producto-v0.2.md`](docs/prestar-producto-v0.2.md).
>
> **Estado:** propuesta pendiente de revisión del co-owner Oky y de revisión
> legal. No auditado, no production-ready. No se desplegó ni se movió dinero
> real.

## Modelo en una línea

Cada miembro tiene un saldo firmado en **PRt** (centavos, 2 decimales) que puede
ser negativo hasta su límite de crédito. Pagar resta al pagador y suma al
receptor; la suma de todos los saldos, incluida la reserva del sistema, es
siempre **cero**. PRt **no es un ERC-20**.

La rampa **PRt ↔ ARGt** es 1:1 nominal contra una reserva limitada de ARGt
(`0x59863989d080B22476DB95656d0C3CC18be92214`) custodiada por el contrato en
Arbitrum One (chain `42161`). El retiro es por orden de llegada: si la reserva no
alcanza, la transacción revierte. No hay garantía de convertibilidad.

## Estructura

- `contracts/`: Foundry + Solidity 0.8.24 + OpenZeppelin v5.
  - `src/PrestarCore.sol`: ledger signed + rampa 1:1 con `SafeERC20`.
  - `test/`: unit tests, fuzz y fork test opcional (sólo lectura).
  - Ver [`contracts/README.md`](contracts/README.md).
- `apps/web/`: Next.js 15 + React 19 + viem. `PrestarCard` es la interfaz
  on-chain; el sandbox anterior vive en `/legacy`.
- `services/api/`: API legacy del sandbox SQLite (`docs/api-contract.md`). **No es
  fuente de verdad de saldos PRt.**
- `docs/`: producto v0.2, guía de integración, contrato API legacy, backlogs.

## Arranque rápido

### Frontend

```powershell
cd apps/web
Copy-Item .env.example .env.local
npm install
npm run dev
```

Configurá `NEXT_PUBLIC_PRESTAR_CORE_ADDRESS` sólo cuando exista un deploy
verificado. Sin ese valor la UI muestra "contrato aún no desplegado" y
deshabilita todas las llamadas. No hay fallback a transfer directo de ARGt.

Ver [`apps/web/README.md`](apps/web/README.md).

### Contratos

Foundry no está instalado en este entorno; la entrega incluye fuentes y tests
pero no se pudieron compilar/ejecutar localmente. En una máquina con Foundry:

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit
forge install foundry-rs/forge-std@v1.9.4 --no-commit
forge build
forge test -vv
```

### API legacy

```bash
cd services/api
npm install
npm run dev
```

Queda en `http://localhost:3001/api`. La usa únicamente `/legacy`; sus balances
no son PRt ni on-chain.

## Seguridad y límites

- No hay mint de tokens ni de PRt.
- `pay` respeta límite de crédito, tope de saldo positivo, miembros activos,
  self-pay y direcciones cero.
- `onramp`/`offramp` verifican deltas exactos de ARGt para rechazar
  fee-on-transfer.
- `pause` (GUARDIAN) y `unpause` (ADMIN); `ReentrancyGuard` en las tres
  operaciones.
- Roles mínimos: ADMIN, BROKER, GUARDIAN. Caps explícitos por parámetro.
- No auditado. Antes de fondos reales: auditoría, revisión legal y aprobación
  de Oky.

## Documentos

- [`docs/prestar-producto-v0.2.md`](docs/prestar-producto-v0.2.md) — spec
  vigente (propuesta).
- [`docs/twinlocal-producto-v0.1.md`](docs/twinlocal-producto-v0.1.md) — histórica.
- [`docs/frontend-integration.md`](docs/frontend-integration.md) — integración
  web; incluye la aclaración legacy vs PREStAR.
- [`docs/api-contract.md`](docs/api-contract.md) — API legacy v0.

## Trabajo del equipo

El board está en [Issue #1](https://github.com/JMReader/localito/issues/1).
Asociar cada trabajo a ese issue o a un issue hijo, y abrir PRs contra este
repositorio.
