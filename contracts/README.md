# PrestarCore — contratos (v0.2, propuesta)

`PrestarCore.sol` es el libro mayor de crédito mutuo **PRt** y la rampa 1:1
contra una reserva de **ARGt** en Arbitrum One. Estado: **no auditado, no
production-ready**. La spec de producto está en
[`../docs/prestar-producto-v0.2.md`](../docs/prestar-producto-v0.2.md).

## Qué hace y qué no hace

- **PRt no es ERC-20.** Es un `int256 balanceCents` (2 decimales) por miembro
  dentro del contrato. No hay `transfer`, `approve` ni `mint` de PRt.
- `pay(to, amountCents)` mueve saldo entre miembros. La suma de todos los
  saldos, incluida la cuenta de sistema `RESERVE_ACCOUNT`, es siempre 0.
- `onramp(amountCents)` recibe ARGt exacto (`amountCents * 1e16` raw) y acredita
  los mismos centavos de PRt. Requiere `approve` previo de ARGt.
- `offramp(amountCents)` quema PRt positivo del miembro y devuelve ARGt exacto
  desde la reserva. Si el contrato no tiene ARGt suficiente, revierte: la
  salida es *first-come, first-served* y puede agotarse.
- 1 PRt = 100 centavos = 1 ARGt nominal (1e18 raw). Por eso
  `argtRaw = prtCents * 10^16`.
- El contrato custodia **un solo token** (ARGt). No minta nada, no es upgradeable.

## Dependencias

OpenZeppelin Contracts **v5** y forge-std. No están vendorizados en este repo
porque Foundry todavía no está instalado en el entorno de esta entrega:

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit
forge install foundry-rs/forge-std@v1.9.4 --no-commit
```

Los remappings ya apuntan a `lib/openzeppelin-contracts/` y `lib/forge-std/src/`.

## Compilar y testear (local)

```bash
cd contracts
forge build
forge test -vv
```

Fork test opcional, **sólo lectura** (no envía transacciones):

```powershell
$env:ARBITRUM_RPC_URL = "https://<tu-rpc-de-arbitrum>"
forge test --match-contract PrestarCoreForkTest -vv
```

Sin `ARBITRUM_RPC_URL` el fork test se salta. Usá un RPC de sólo lectura y no
pongas claves privadas en `.env` ni en el repo.

### Cobertura de tests

- pago miembro a miembro, límite de crédito y tope de saldo positivo;
- suma cero después de pagos, onramp, offramp y flujos mixtos;
- onramp/offramp con ARGt exacto y aprobación requerida;
- rechazo de fee-on-transfer en ambos sentidos (delta exacto de balance);
- pausa (GUARDIAN) y despausa (ADMIN);
- caps globales por parámetro y roles mínimos;
- direcciones cero, self-pay, miembros inactivos y contrato como destino;
- fuzz de pagos y round-trip onramp/offramp.

## Roles

| Rol | Puede |
|---|---|
| `DEFAULT_ADMIN_ROLE` | `setCaps`, `unpause`, gestionar roles |
| `BROKER_ROLE` | `addMember`, `setLimits`, `setMemberStatus` |
| `GUARDIAN_ROLE` | `pause` |

No hay rol de minter ni de retiro de ARGt por administración: el ARGt de la
reserva sólo sale por `offramp` de un miembro con PRt positivo.

## Caps

Todos los topes son parámetros explícitos del constructor y se pueden cambiar
con `setCaps` (ADMIN, emite `CapsUpdated`):

- `maxPaymentCents` por pago;
- `maxOnrampCents` y `maxOfframpCents` por operación;
- `maxCreditLimitCents` y `maxPositiveCents` al crear/editar miembros.

No hay un tope "de producción" hardcodeado: el deploy debe definir valores
calibrados y documentarlos. Los valores del repo son sólo de test.

## Flujo de deploy (preparado, no ejecutado)

`script/Deploy.s.sol` y `.env.example` están en el repo, pero **no hay dirección
desplegada ni `deployments/42161.json`**: nada de esto se ejecutó. El broadcast
lo hace una persona autorizada, a mano, fuera de cualquier agente.

### 1. Preparar las variables

```powershell
cd contracts
Copy-Item .env.example .env
# editar .env y completar las 9 variables
```

- `ARGT_ADDRESS`: el token ARGt **verificado en Arbiscan** (Arbitrum One,
  chainId 42161, 18 decimales). La referencia de este repo es
  `0x59863989d080B22476DB95656d0C3CC18be92214`, pero hay que abrirlo en Arbiscan
  y confirmar código verificado y symbol antes de usarlo. Nunca un token de
  prueba ni una copia.
- `ADMIN_ADDRESS`, `BROKER_ADDRESS`, `GUARDIAN_ADDRESS`: direcciones públicas,
  distintas entre sí y distintas de cero.
- Los cinco caps son **montos en centavos de PRt** (2 decimales), no wei ni
  unidades raw: `100000` = 1.000 PRt = 1.000 ARGt. Todos deben ser `> 0` y
  entrar en `uint128`. No hay valores de producción en el repo: los del repo son
  sólo de test.
- `.env` está ignorado por git y no debe contener claves privadas. La cuenta
  firmante se elige por CLI (`--ledger` o `--account <keystore>`).

### 2. Simular sin broadcast (obligatorio)

```powershell
forge script script/Deploy.s.sol --rpc-url $env:ARBITRUM_RPC_URL -vvv
```

Sin `--broadcast` Foundry sólo simula: no se firma ni se envía nada. El script
imprime `chainId`, las cuatro cuentas, los cinco caps y la dirección resultante.
Revisá que `chainId` sea `42161`, que las cuentas sean las esperadas y que no
haya llamadas inesperadas (`transfer`, `approve`, `addMember`, etc.).

En PowerShell, `$env:ARBITRUM_RPC_URL` tiene que estar exportado en la sesión;
Foundry lee `.env` para las variables del script, pero no expande esa sintaxis
dentro de los flags de CLI.

### 3. Broadcast manual (irreversible)

Sólo con la simulación revisada y aprobación explícita de las personas
autorizadas, se corre el broadcast desde una cuenta autorizada:

```powershell
forge script script/Deploy.s.sol --rpc-url $env:ARBITRUM_RPC_URL `
  --broadcast --verify --etherscan-api-key $env:ETHERSCAN_API_KEY -vvv
```

- Firmar con hardware wallet (`--ledger`) o keystore (`--account <nombre>`).
- `--verify` requiere `ETHERSCAN_API_KEY` de Arbiscan y RPC con acceso al
  verificador; sin eso el deploy ocurre igual, pero el código queda sin
  verificar.
- **No se puede deshacer.** `PrestarCore` no es upgradeable: si los roles o los
  caps quedan mal, hay que desplegar un contrato nuevo y migrar. Confirmá
  cuentas y caps antes de firmar.
- El constructor no transfiere tokens: la reserva de ARGt arranca en 0.

### 4. Registrar el deploy y configurar el frontend

Después del deploy real y de ver el código en Arbiscan:

1. Crear `contracts/deployments/42161.json` con el address desplegado y los
   parámetros usados, por ejemplo:

   ```json
   {
     "chainId": 42161,
     "prestarCore": "<address verificado en Arbiscan>",
     "argt": "<address del token usado>",
     "admin": "<address>",
     "broker": "<address>",
     "guardian": "<address>",
     "capsCents": {
       "maxPayment": "<centavos>",
       "maxOnramp": "<centavos>",
       "maxOfframp": "<centavos>",
       "maxCreditLimit": "<centavos>",
       "maxPositive": "<centavos>"
     }
   }
   ```

2. Configurar `NEXT_PUBLIC_PRESTAR_CORE_ADDRESS` en el frontend con ese mismo
   address.
3. Confirmar en Arbiscan que el código verificado y los argumentos del
   constructor coinciden con `.env`.

Hasta que exista ese address verificado, el frontend muestra "contrato aún no
desplegado" y deshabilita todas las llamadas. El contrato no está auditado: no
usar fondos reales sin auditoría y revisión legal.

## Límites y riesgos conocidos

- **Liquidez:** la reserva de ARGt puede ser menor que el PRt positivo emitido
  por crédito mutuo. `offramp` es first-come y puede revertir por reserva
  insuficiente. No hay garantía de convertibilidad.
- **Fee-on-transfer:** se rechaza cualquier token que no entregue/retire el
  monto exacto. ARGt en Arbitrum se asume estándar; verificar antes del deploy.
- **Redondeo:** sólo se aceptan montos enteros en centavos. No hay fracciones
  de PRt ni de centavo.
- **Admin confiable:** ADMIN puede cambiar caps y despausar; BROKER puede crear
  miembros y asignar límites. No hay gobernanza descentralizada.
- **No auditado:** no usar con fondos reales sin auditoría y revisión legal.
