# PREStAR — Documento de producto (v0.2)

> **Estado: PROPUESTA.** Este documento reemplaza la nomenclatura y las
> decisiones D3/D4/D6 de [`twinlocal-producto-v0.1.md`](twinlocal-producto-v0.1.md)
> (que queda como histórica, sin editar). **Pendiente de revisión formal del
> co-owner Oky y de revisión legal.** No es asesoramiento legal, no está
> auditado y no es production-ready. El `DECISIONS` del cerebro compartido no se
> modificó desde este repo.

## 0. Resumen del cambio

| Tema | v0.1 (TwinLocal) | v0.2 (PREStAR) | Estado |
|---|---|---|---|
| Nombre de producto | TwinLocal / Localito | **PREStAR** | Decidido por el usuario; pendiente de Oky |
| Moneda de crédito | TL / unidad local | **PRt** | Decidido por el usuario; pendiente de Oky |
| Red del libro mayor | Avalanche C-Chain (D3) + Fuji (D4) | **Arbitrum One mainnet (42161)** | Decidido por el usuario |
| Canje | **No canjeable** (D6) | **Swap 1:1 PRt↔ARGt contra reserva limitada** | Decidido por el usuario; pendiente de Oky y legal |
| Token de la rampa | USDC / Fondo de Garantía | **ARGt** (`0x59863989d080B22476DB95656d0C3CC18be92214`) | ARGt real proporcionado |
| Modelo de saldo | Crédito mutuo, saldo firmado, suma cero | **Igual** (D1, D2 se mantienen) | Sin cambios |
| PRt como token | No ERC-20 | **No ERC-20**: mapping `int256` dentro de `PrestarCore` | Sin cambios de modelo |

**D3/D4 quedan reemplazadas** por Arbitrum One. **D6 queda reemplazada** por el
swap 1:1 contra reserva. D1 (Sardex / saldos negativos con límite / suma cero),
D2 (0% interés), D5 (web/PWA), D11 (pausa, no upgradeable) se mantienen como
base. Las decisiones del brain siguen vigentes hasta que Oky las revise: este
documento es una propuesta local.

## 1. Qué es PREStAR

PREStAR es una red de **crédito mutuo** para comercios y prestadores locales.
Cada miembro tiene un saldo en **PRt** que puede ser negativo hasta su límite de
crédito. Pagar dentro de la red resta al pagador y suma al receptor; la suma de
todos los saldos es siempre cero.

PRt es una **unidad de cuenta interna**, no una stablecoin, no una moneda de
curso legal y no un ERC-20. No se mintea, no se transfiere fuera de
`PrestarCore` y no promete rendimiento.

### 1.1 Unidad y decimales

- PRt se maneja en **centavos enteros (2 decimales)** para ser compatible con la
  API y las reglas existentes de la demo.
- ARGt es un ERC-20 de **18 decimales**.
- Conversión nominal fija: **1 PRt = 1 ARGt**.
- Implementación: `argtRaw = prtCents * 10^16`. No hay floats ni redondeo
  fraccionario: sólo se aceptan montos enteros en centavos.
- No existe un token ERC-20 llamado PRt. El saldo vive en
  `mapping(address => int256 balanceCents)` dentro de `PrestarCore`.

## 2. Cadena y activos

| Elemento | Valor |
|---|---|
| Red | Arbitrum One mainnet |
| Chain ID | `42161` |
| ARGt | `0x59863989d080B22476DB95656d0C3CC18be92214` (ERC-20, 18 decimales) |
| Explorador | `https://arbiscan.io` |
| Gas | ETH en Arbitrum One |
| Custodia de ARGt | `PrestarCore.sol` (OZ `SafeERC20`) |

El frontend **sólo** opera si la wallet está en chain `42161` y existe una
dirección `NEXT_PUBLIC_PRESTAR_CORE_ADDRESS` válida. Si falta, muestra
"contrato aún no desplegado" y deshabilita todo. **No hay fallback** a
`transfer` directo de ARGt.

## 3. Mecánica de saldos y suma cero

`PrestarCore` mantiene:

- `mapping(address => Member)`, con `int256 balanceCents`, `creditLimitCents` y
  `maxPositiveCents`.
- Una cuenta de sistema `RESERVE_ACCOUNT` (no es una wallet) que refleja el lado
  opuesto de la rampa.
- Invariante: `suma(saldos de miembros) + saldo(RESERVE_ACCOUNT) = 0`.

### 3.1 Pagos (`pay`)

1. Pagador y receptor deben ser miembros **activos**.
2. `amountCents > 0`, dentro del cap por pago y no self-pay.
3. `nuevoSaldoPagador >= -creditLimitCents`.
4. `nuevoSaldoReceptor <= maxPositiveCents`.
5. La suma no cambia: es una transferencia interna de crédito.

### 3.2 On-ramp (`onramp`): ARGt → PRt

1. El miembro debe estar activo y tener `approve` de ARGt para `PrestarCore`.
2. `argtRaw = amountCents * 10^16`.
3. El contrato ejecuta `safeTransferFrom` y exige que el **delta exacto** de su
   balance sea `argtRaw` (protección fee-on-transfer).
4. Acredita `amountCents` PRt al miembro y resta los mismos centavos a
   `RESERVE_ACCOUNT`.
5. Respeta `maxPositiveCents` del miembro y `maxOnrampCents` global.

### 3.3 Off-ramp (`offramp`): PRt → ARGt

1. El miembro debe estar activo.
2. Sólo puede retirar **saldo PRt positivo suficiente**. El crédito (saldo
   negativo) no se puede retirar.
3. El contrato debe tener ARGt suficiente en reserva.
4. Debita PRt al miembro, suma los mismos centavos a `RESERVE_ACCOUNT` y
   transfiere `argtRaw` exacto.
5. Verifica el delta exacto del contrato **y** del receptor.
6. Es **first-come, first-served**: si la reserva se agota, la transacción
   revierte. No hay garantía de convertibilidad ni cola de espera.

### 3.4 Solvencia

- El ARGt custodiado es exactamente el neto de on-ramps menos off-ramps.
- El PRt positivo creado por pagos con crédito **no** está respaldado por ARGt
  hasta que alguien haga on-ramp. Por eso un miembro con PRt positivo puede
  encontrarse con que la reserva no alcanza para retirar.
- No se mintea ARGt ni PRt. No hay promesa de paridad más allá del swap 1:1
  contra la reserva disponible.

## 4. Roles y caps

| Rol | Permisos |
|---|---|
| `DEFAULT_ADMIN_ROLE` | `setCaps`, `unpause`, administración de roles |
| `BROKER_ROLE` | `addMember`, `setLimits`, `setMemberStatus` |
| `GUARDIAN_ROLE` | `pause` |

Caps explícitos por parámetro, definidos en el constructor y actualizables por
ADMIN con evento `CapsUpdated`:

- `maxPaymentCents`
- `maxOnrampCents`
- `maxOfframpCents`
- `maxCreditLimitCents`
- `maxPositiveCents`

No hay un cap "de producción" hardcodeado: los valores del deploy deben
calibrarse y documentarse. Los valores de tests son sólo de prueba.

## 5. Seguridad implementada

- **Reentrancy:** `ReentrancyGuard` en `pay`, `onramp` y `offramp`.
- **Pausa:** `Pausable`; GUARDIAN pausa, ADMIN despausa.
- **Fee-on-transfer:** se rechaza si el delta exacto de ARGt no coincide.
- **Redondeo:** sólo centavos enteros; no se aceptan fracciones.
- **Overflow:** aritmética checked de Solidity 0.8 y caps `uint128`.
- **Direcciones cero:** se rechazan token, roles, miembros, receptor y
  self-pay. `RESERVE_ACCOUNT` no puede ser destino de un pago.
- **Miembros activos:** pagos y rampas requieren estado `Active`.
- **Sin mint:** PRt no es ERC-20; ARGt sólo entra/sale por la rampa.
- **No upgradeable:** el contrato no tiene proxy.

Pendiente antes de cualquier uso con fondos reales: auditoría externa,
verificación de ARGt (que no sea fee-on-transfer ni tenga hooks), revisión legal
y calibración de caps.

## 6. Integración web

- `PrestarCard` reemplaza al widget standalone que sólo transfería ARGt.
- Lee `balanceOfMember(address)`, `balanceOf(ARGt)`, `allowance` y `paused`.
- Permite conectar MetaMask, pagar PRt a otra dirección, hacer on-ramp con
  `approve` + `onramp` y off-ramp.
- Muestra estados pending/confirmed/reverted y el hash a Arbiscan.
- Convierte con `parseUnits`/`formatUnits` y aritmética `bigint`; nunca floats.
- No guarda claves ni frase semilla. No hay mapeo alias → wallet.
- Si la chain no es `42161` o no hay core configurado, no se puede firmar.

### 6.1 Legacy

El flujo Localito/TL sobre SQLite se movió a `/legacy`. Está marcado como
sandbox legacy, **no** como PRt y **no** como fuente de verdad on-chain. La API
v0 puede seguir existiendo para esa demo, pero no define saldos de PREStAR.

## 7. Riesgos y preguntas abiertas

### 7.1 Riesgo de liquidez / corrida

La reserva de ARGt es limitada. Si muchos miembros intentan retirar PRt positivo
al mismo tiempo, los primeros pueden retirar y los siguientes quedan sin
reserva. Esto es una corrida clásica contra una reserva parcial. No hay seguro
de depósito ni backstop en esta versión.

Mitigaciones posibles (no implementadas, requieren decisión):
- caps de off-ramp por miembro/período;
- cola FIFO o ventana de retiro;
- fondo de liquidez externo;
- límites de emisión de PRt por crédito;
- transparencia pública de reserva y pasivos.

### 7.2 Legal / regulatorio

- PRt podría caracterizarse como crédito, pago o instrumento financiero según
  jurisdicción. **LEGAL-REVIEW obligatorio.**
- La rampa 1:1 contra ARGt puede caer bajo reglas de transmisión de dinero,
  custodia o cambiaria.
- Hay que definir quién es el emisor/operador, quién custodia la reserva, qué
  pasa si ARGt pierde liquidez o el emisor del token falla.
- KYC/AML, términos y privacidad no están definidos.
- No se debe presentar como "auditado", "production-ready" ni "stablecoin".

### 7.3 Pendiente de Oky

- Aprobar nombre PREStAR y moneda PRt.
- Aprobar el cambio de Avalanche/Fuji a Arbitrum One.
- Aprobar el reemplazo de D6 por el swap 1:1 contra reserva.
- Aprobar el modelo de reserva y quién la fondea.
- Definir caps iniciales y política de off-ramp.

## 8. Estado de la entrega

- Contratos: `contracts/src/PrestarCore.sol` + tests Foundry.
- Frontend: `apps/web/src/components/PrestarCard.tsx` + `lib/prestar.ts`.
- Spec: este documento.
- Deploy: **no realizado**. No hay address inventada ni `deployments/42161.json`.
- No se firmaron ni transmitieron transacciones mainnet.
- Foundry no está instalado en el entorno de esta entrega: los tests se
  escribieron pero no se pudieron ejecutar localmente. Ver
  [`contracts/README.md`](../contracts/README.md).

## 9. Criterios de aceptación de esta propuesta

- [ ] Oky revisa y aprueba nombre, moneda, chain y swap.
- [ ] Legal revisa el encuadre de PRt y de la rampa ARGt.
- [ ] Se define y fondea la reserva con un address verificado.
- [ ] Se audita `PrestarCore` antes de fondos reales.
- [ ] Se calibran caps y se documenta el riesgo de corrida.
- [ ] `forge test` y `forge build` pasan en un entorno con Foundry.
