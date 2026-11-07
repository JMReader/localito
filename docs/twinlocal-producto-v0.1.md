# TwinLocal — Documento de producto (v0.1)

> Nombre de trabajo. Red de crédito mutuo para comercios y prestadores locales, con libro mayor en smart contracts sobre Avalanche, backend propio y app (web/móvil).
> Estado: borrador para arrancar. Las secciones marcadas **[ABIERTO]** no están decididas: los agentes deben proponer opciones, no asumir.

---

## 0. Cómo usar este documento (instrucciones para agentes)

1. Este documento es la fuente de verdad. Si algo no está acá, **no lo inventes**: anotalo en `DECISIONS.md` como pregunta y seguí con lo que sí está definido.
2. Distinguí tres etiquetas: **[DECIDIDO]**, **[SUPUESTO]** (valor inicial para calibrar, cambiable) y **[ABIERTO]** (requiere decisión humana).
3. Cada componente tiene una interfaz clara (ABI de contratos, API REST). Trabajá contra esa interfaz, no contra la implementación interna de otro componente.
4. Todo código lleva tests. Los contratos, además, los invariantes de la sección 13.
5. Nunca commitear secretos (`.env`, claves privadas, mnemonics). Usar `.env.example`.
6. Versiones de librerías, direcciones de contratos externos (USDC, forwarder) y parámetros de red de Avalanche: **verificarlos contra la documentación oficial** antes de usarlos. No usar valores de memoria.
7. Ante dudas regulatorias, marcar con `LEGAL-REVIEW` en el código/doc. Este documento no es asesoramiento legal.

Propuesta de reparto (ajustable):

| Agente | Responsabilidad | Entrega principal |
|---|---|---|
| A — Contratos | Solidity, tests, deploy en Fuji | `contracts/` + ABIs + guía de deploy |
| B — Backend | API, relayer, indexer, jobs | `backend/` + OpenAPI |
| C — App | Web/PWA (luego móvil) | `app/` |
| D — Producto/Datos | Parámetros, scoring, datos de prueba, simulación, pitch | `docs/` + `seed/` |

---

## 1. Resumen del producto

**Problema.** Comercios y prestadores locales (kioscos, buffets, fotocopiadoras, oficios, tutores) tienen capacidad ociosa y poca liquidez en pesos. Hoy se financian con "fiado" en cuaderno, que no circula, o con crédito bancario/tarjetas, caro o inaccesible para muchos.

**Solución.** Un circuito cerrado de **crédito mutuo** (modelo Sardex/WIR): cada miembro tiene una cuenta con saldo que puede ser negativo hasta un límite. Comprar dentro de la red resta saldo al comprador y suma al vendedor. La suma de todos los saldos es siempre cero. Se le da crédito a **0% de interés** al comercio porque su respaldo real es su compromiso de vender bienes y servicios dentro de la red.

**Capa de fondeo.** Un **Fondo de Garantía** (USDC) aportado por inversores de impacto cubre la morosidad y da credibilidad al sistema. El retorno de los inversores sale de las cuotas de membresía, penalidades y recuperos, **no** de intereses cobrados a los comercios.

**Qué es y qué no es.**
- Es un sistema de pagos y crédito comercial cerrado, con libro mayor auditable on-chain.
- No es una stablecoin, no es una moneda canjeable por pesos, no es un exchange, no es un banco.

---

## 2. Decisiones tomadas

| # | Decisión | Estado |
|---|---|---|
| D1 | Modelo base: crédito mutuo estilo Sardex (saldos negativos con límite, suma total = 0) | DECIDIDO |
| D2 | Interés al miembro: 0%. El negocio vive de cuota de membresía y penalidades | DECIDIDO |
| D3 | Libro mayor del circuito en smart contract sobre **Avalanche C-Chain** (EVM, Solidity) | DECIDIDO |
| D4 | Testnet de desarrollo: **Fuji** | DECIDIDO |
| D5 | Sin WhatsApp. Canal: **app web (PWA) primero**, móvil después (misma API) | DECIDIDO |
| D6 | Los saldos del circuito **no** se pueden canjear por pesos ni USDC. No hay off-ramp para miembros | DECIDIDO |
| D7 | Usuarios sin conocimiento cripto: wallets custodiales gestionadas por el backend en el MVP; gas pagado por la plataforma (meta-transacciones) | DECIDIDO |
| D8 | El Fondo de Garantía usa USDC y es un contrato separado del libro mayor | DECIDIDO |
| D9 | Línea de crédito de cada miembro = función de facturación verificada y/o stock con descuento, con tope duro y crecimiento por historial | DECIDIDO |
| D10 | Tasa fija por préstamo en la capa de fondo (si existe). No se sube la tasa a deudores existentes por retiros de inversores | DECIDIDO |
| D11 | Contratos del MVP no upgradeables, con `pause()` de emergencia | SUPUESTO |

---

## 3. Decisiones abiertas **[ABIERTO]**

| # | Pregunta | Opciones iniciales | Recomendación provisoria |
|---|---|---|---|
| O1 | **Unidad de cuenta** | (a) 1 unidad = 1 ARS nominal; (b) 1 unidad = 1 USD de referencia con precios mostrados en ARS | (a) con plazos cortos (60–90 días) para limitar el daño de la inflación a los acreedores. Revisar con datos |
| O2 | **Plazo de saldado de deuda** | 60, 90, 180 o 365 días | 90 días. Sardex usa plazos largos, pero opera con baja inflación |
| O3 | **Moneda de las cuotas de membresía** | Pesos vía pasarela → conversión a USDC por el operador | Pesos, con conversión manual y `depositRevenue()` on-chain para transparencia |
| O4 | **Mecanismo de compensación ante default** | (a) Fondo paga USDC al acreedor y se quema crédito equivalente; (b) solo se registra la pérdida contra el NAV; (c) mix con tope por período | (a) con tope y factor de recupero (ver 7.2) |
| O5 | **Privacidad on-chain** | (a) C-Chain pública con direcciones pseudónimas; (b) L1 permisionada de Avalanche | (a) en MVP; documentar el riesgo (sección 10) |
| O6 | **Envejecimiento de deuda** | Fecha de primera deuda (simple, aproximado) vs. FIFO por movimiento (exacto, caro en gas) | Simple en MVP |
| O7 | **Autenticación** | OTP por email, OTP por SMS, passkeys | Email OTP + PIN en MVP. Passkeys en hito posterior |
| O8 | **Encuadre regulatorio** del Fondo (captación de inversores) y de la custodia | Requiere abogado | `LEGAL-REVIEW` antes de ingresar plata real |
| O9 | **Custodia** | Custodial en MVP vs. wallet propia del usuario / account abstraction | Custodial en MVP; evaluar account abstraction después (verificar soporte en Avalanche) |

---

## 4. Actores y roles

| Actor | Descripción | Rol on-chain | Acceso |
|---|---|---|---|
| **Comercio / Prestador** | Vende y compra dentro de la red. Tiene línea de crédito | `MEMBER` (kind=Merchant) | App |
| **Consumidor** | Usa saldo para comprar. Línea baja o cero | `MEMBER` (kind=Consumer) | App |
| **Broker** | Persona de confianza que da de alta miembros, verifica facturación/stock y propone límites | `BROKER` | Consola admin |
| **Operador** | Administra parámetros, cuotas, suspensiones, write-offs | `ADMIN` / `OPERATOR` | Consola admin |
| **Inversor** | Aporta USDC al Fondo y cobra rendimiento | Dirección en `GuaranteeFund` | App (vista inversor) |
| **Guardián** | Puede pausar contratos en emergencia | `GUARDIAN` | Multisig |
| **Keeper** | Proceso automático que marca morosos y procesa cola de retiros | `KEEPER` | Backend |

---

## 5. Reglas de negocio y parámetros

Todos los valores son **[SUPUESTO]** salvo que se indique. Viven en configuración (backend) y en storage (contrato) con eventos de cambio.

| Parámetro | Valor inicial | Notas |
|---|---|---|
| `decimals` de la unidad | 2 | Centavos |
| `clearingTermDays` | 90 | Ver O2 |
| `graceDays` | 15 | Entre vencimiento y write-off |
| Límite de crédito por miembro | Definido por broker/scoring, ≤ `maxCreditLimit` global | Ver sección 8.4 |
| `maxPositiveBalance` por miembro | ~10% de facturación mensual verificada, configurable | Evita acumulación; Sardex usa un tope similar |
| Comisión por transacción | 0% | Decidido en D2 |
| Cuota de membresía | Escalonada por tamaño del miembro | Cobrada fuera de cadena (O3) |
| Penalidad por mora | % sobre el monto vencido, fijo | Se destina al Fondo |
| `minLiquidityBps` del Fondo | 1500 (15%) | Porción no comprometida para retiros |
| Plazos de inversor | 30 / 90 / 180 días | Retiro solo al vencer o por cola |
| Haircut de stock | 50% sobre valor declarado verificado | Perecederos: más alto o excluidos |
| Tope de depósito por inversor (MVP) | Configurable | Limita riesgo en fase piloto |

**Ciclo de vida de un miembro:**

```
Pending → Active → Suspended ⇄ Active
                 → Delinquent (vencido) → Defaulted (write-off)
                 → Exited (saldo en cero)
```

**Reglas de pago (`pay`):**
1. Emisor y receptor `Active`; emisor no `Delinquent`.
2. `amount > 0`.
3. `saldoEmisor − amount ≥ −creditLimit(emisor)`.
4. `saldoReceptor + amount ≤ maxPositive(receptor)`.
5. Si el saldo del emisor pasa de ≥ 0 a < 0, se registra `debtSince = ahora`. Si vuelve a ≥ 0, `debtSince = 0`.

---

## 6. Arquitectura

```
┌───────────────┐        ┌────────────────────────────────────────┐
│  App (PWA /   │  HTTPS │              Backend (API)             │
│  móvil)       │◄──────►│  Auth · Miembros · Scoring · Pagos ·   │
└───────────────┘        │  Fondo · Admin · Jobs · Notificaciones │
                         └───────┬───────────────┬────────────────┘
                                 │               │
                      relayer    │               │ lecturas rápidas
                  (firma + gas)  ▼               ▼
                         ┌─────────────┐   ┌────────────┐
                         │  Avalanche  │──►│  Indexer   │──► Postgres
                         │  C-Chain    │   │ (eventos)  │
                         └──────┬──────┘   └────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                  ▼
        CreditLedger     GuaranteeFund       Forwarder (meta-tx)
```

**Principios de diseño**
- **La verdad financiera vive on-chain** (saldos, límites, pagos). Postgres guarda lo que no debe ir en cadena (datos personales, KYC-lite, scoring, notificaciones) y un espejo indexado para consultas rápidas.
- **Sin datos personales on-chain.** Solo direcciones y referencias opacas (`ref` = hash/ID).
- El backend nunca reescribe saldos en su base: los lee del indexer, que se reconstruye desde eventos.
- El relayer paga el gas en AVAX con una wallet dedicada y presupuestada (ver 10).

---

## 7. Smart contracts (Avalanche C-Chain, Solidity)

Stack sugerido: Foundry o Hardhat, OpenZeppelin Contracts (AccessControl, Pausable, ReentrancyGuard, ERC2771). Verificar versiones vigentes.

### 7.1 `CreditLedger.sol`

**Responsabilidad:** registro de miembros, saldos con signo, límites, pagos y estado de morosidad.

**No es ERC-20**, porque admite saldos negativos y no es transferible libremente. No exponer `balanceOf` con la firma ERC-20.

**Storage (referencial):**

```solidity
enum Status { None, Pending, Active, Suspended, Delinquent, Defaulted, Exited }
enum Kind { Merchant, Consumer, Provider }

struct Member {
    Status status;
    Kind kind;
    int256 balance;          // en unidades con 2 decimales
    uint128 creditLimit;     // máximo negativo permitido
    uint128 maxPositive;     // máximo positivo permitido
    uint64 debtSince;        // 0 si balance >= 0
}

mapping(address => Member) public members;
address public constant BAD_DEBT = address(0xdead); // cuenta de sistema
uint64 public clearingTerm;  // segundos
uint64 public graceTerm;
```

**Funciones principales:**

| Función | Quién | Descripción |
|---|---|---|
| `registerMember(addr, kind)` | BROKER | Estado `Pending` |
| `activate(addr, creditLimit, maxPositive)` | BROKER (dentro de topes globales) | Pasa a `Active` |
| `setLimits(addr, creditLimit, maxPositive)` | BROKER/ADMIN | Con evento y tope global |
| `pay(to, amount, ref)` | MEMBER (vía forwarder) | Aplica reglas de la sección 5 |
| `flagDelinquent(addr)` | cualquiera (keeper) | Si `balance < 0` y venció `debtSince + clearingTerm` |
| `writeOff(addr)` | ADMIN | Solo si pasó la gracia. Mueve la deuda a `BAD_DEBT`, estado `Defaulted` |
| `settleBadDebt(creditor, units)` | COMPENSATOR | Reduce el positivo del acreedor y el negativo de `BAD_DEBT` en igual monto (ver 7.2) |
| `suspend / unsuspend(addr)` | BROKER/ADMIN | |
| `pause / unpause` | GUARDIAN | |
| `balanceOfMember(addr) → int256` | view | |
| `isDelinquent(addr) → bool` | view | |

**Eventos:** `MemberRegistered`, `MemberActivated`, `LimitsUpdated`, `Payment(from, to, amount, ref)`, `StatusChanged`, `WrittenOff`, `BadDebtSettled`, `ParamsUpdated`.

**Meta-transacciones:** el contrato hereda `ERC2771Context` y usa `_msgSender()`. El backend retransmite pagos firmados por el usuario mediante un forwarder (nonce + deadline + dominio EIP-712). Esto protege contra replay.

**Límite conocido (O6):** `debtSince` es aproximado. Un miembro que paga parcialmente pero sigue en negativo conserva la fecha original. Es conservador (más estricto) y simple.

### 7.2 `GuaranteeFund.sol`

**Responsabilidad:** recibir USDC de inversores, respaldar el circuito y cubrir pérdidas hasta un tope.

**Mecánica:**
- **Activo:** USDC nativo de Avalanche (verificar dirección oficial; en Fuji usar el token de prueba correspondiente).
- **Contabilidad:** pool único con shares pro-rata (patrón similar a ERC-4626, pero con bloqueo por plazo).
- **Depósito:** `deposit(amount, termDays)` con `termDays ∈ {30, 90, 180}`. Crea una posición con `unlockAt`.
- **Retiro:** solo después de `unlockAt`. Si la liquidez libre (`totalAssets − comprometido`) no alcanza, `requestWithdraw` entra en **cola FIFO** que el keeper procesa a medida que hay liquidez.
- **Reserva:** nunca se compromete más de `1 − minLiquidityBps` a coberturas pendientes.
- **Ingresos:** `depositRevenue(amount, source)` (OPERATOR) aumenta `totalAssets`; `source` ∈ {Membership, LateFee, Recovery}. Es la única fuente de rendimiento (D2).
- **Pérdidas (propuesta para O4):** ante un write-off, el operador llama `compensate(creditor, usdcAmount, units)`:
  1. El fondo transfiere `usdcAmount` al acreedor (o a un pool de compensación).
  2. Llama a `CreditLedger.settleBadDebt(creditor, units)`.
  3. `totalAssets` baja; el NAV por share baja para todos los inversores.
  4. Tope por período (`maxPayoutBps`) y factor de recupero `< 1`.

**Funciones principales:** `deposit`, `requestWithdraw`, `processWithdrawals(n)` (KEEPER), `depositRevenue`, `compensate`, `navPerShare()`, `freeLiquidity()`, `pause/unpause`.

**Eventos:** `Deposited`, `WithdrawRequested`, `Withdrawn`, `RevenueDeposited`, `Compensated`, `ParamsUpdated`.

**Riesgos de diseño a revisar:** inflación de shares en depósitos mínimos (ataque de donación), redondeos, orden de la cola, reentrancia en transferencias de USDC, y la conversión unidades ↔ USDC (depende de O1; el factor lo fija el operador con evento y límites).

### 7.3 Forwarder

Usar `ERC2771Forwarder` de OpenZeppelin (verificar versión). El relayer es el único caller autorizado de la cuenta que paga gas; el forwarder valida firma, nonce y deadline.

### 7.4 Entregables del Agente A

- Contratos + tests (unitarios, fuzz, invariantes).
- Script de deploy a Fuji y archivo `deployments/fuji.json` (direcciones + ABIs).
- Documento `docs/contracts.md` con roles, parámetros y flujos.
- Slither (o equivalente) sin hallazgos altos sin justificar.

---

## 8. Backend

**Stack sugerido:** Python con FastAPI, Postgres, `web3.py` (o ethers vía servicio Node si el equipo lo prefiere), Alembic para migraciones, un scheduler para jobs. **[SUPUESTO]**: cualquier stack equivalente es válido si respeta las interfaces.

### 8.1 Módulos

| Módulo | Función |
|---|---|
| `auth` | Registro, OTP, PIN, sesiones (JWT corto + refresh), rate limiting, dispositivos |
| `members` | Alta, perfil, estados, vínculo usuario ↔ dirección on-chain |
| `kyc_lite` | Datos del comercio (CUIT, rubro, dirección), verificación manual por broker |
| `scoring` | Cálculo de límites propuestos y tiers (8.4) |
| `payments` | Prepara pagos, valida PIN, firma/retransmite meta-tx, estado y recibos |
| `fund` | Vista de inversor, depósitos, cola de retiros, NAV, reportes |
| `indexer` | Escucha eventos y mantiene el espejo en Postgres |
| `jobs` | Morosidad, vencimientos, cuotas, cola de retiros, recordatorios |
| `notifications` | Email/push (sin WhatsApp) |
| `admin` | Consola de brokers/operadores, parámetros, write-offs, auditoría |
| `custody` | Gestión de claves cifradas (8.3) |

### 8.2 API REST (borrador)

```
POST   /auth/otp/request            { email | phone }
POST   /auth/otp/verify             { code } → tokens
POST   /auth/pin                    { pin }             # alta/cambio

GET    /me                          # perfil + estado + dirección
GET    /me/balance                  # saldo, límite, disponible, vence en N días
GET    /me/transactions?cursor=     # desde el indexer
GET    /members?query=&rubro=       # directorio de la red

POST   /payments/quote              { to, amount, ref? } → resumen
POST   /payments                    { to, amount, ref?, pin } → { txHash, status }
GET    /payments/{id}

GET    /fund/summary                # NAV, liquidez, ocupación
POST   /fund/deposits               { amount, termDays }
GET    /fund/positions
POST   /fund/withdrawals            { positionId }

# Admin / broker
POST   /admin/members               # alta
PUT    /admin/members/{id}/limits
POST   /admin/members/{id}/suspend
POST   /admin/members/{id}/writeoff
POST   /admin/fund/revenue          { amount, source }
PUT    /admin/params
GET    /admin/audit
```

Contrato de errores uniforme: `{ "code": "...", "message": "...", "details": {} }`. Documentar con OpenAPI.

### 8.3 Custodia y seguridad (MVP)

- Claves privadas generadas en el backend, **cifradas en reposo con cifrado autenticado** (AES-GCM o equivalente) usando una clave maestra fuera del código. Roadmap: KMS del proveedor cloud o MPC.
- PIN de 6 dígitos con **Argon2id**; máximo 5 intentos y bloqueo temporal por cuenta y por IP/dispositivo.
- El PIN se verifica en el servidor **antes** de firmar cualquier pago.
- Auditoría de toda acción administrativa (quién, qué, cuándo, antes/después).
- Relayer con límites diarios de gas y alertas.

### 8.4 Scoring y límites (MVP)

Reglas simples, auditables y calibrables (el Agente D define y simula valores):

```
base       = min( pctFacturacion × facturacionMensualVerificada ,
                  haircut × stockVerificado )
tier       = f(antigüedad en red, cumplimiento, volumen)   # T0, T1, T2
limite     = base × multiplicador(tier)  ,  ≤ maxCreditLimit global
```

- Miembros nuevos arrancan en T0 con límites bajos; suben por historial de saldado a tiempo.
- La "confianza" es un score observable (puntualidad, volumen, antigüedad, referencias del broker), no una opinión.
- Todo cambio de límite requiere razón y genera evento.

### 8.5 Jobs

| Job | Frecuencia | Acción |
|---|---|---|
| `flag_delinquent` | Diario | Llama `flagDelinquent` para vencidos |
| `reminders` | Diario | Avisos antes del vencimiento |
| `process_withdrawals` | Horario | Procesa cola del Fondo |
| `membership_billing` | Mensual | Emite cuotas y registra ingresos |
| `reconcile` | Horario | Compara espejo vs. cadena y alerta diferencias |

### 8.6 Entregables del Agente B

- API con OpenAPI y tests.
- Indexer reconstruible desde el bloque de deploy.
- `docker-compose` para desarrollo local (Postgres + backend + nodo/RPC configurable).
- Documento de variables de entorno y runbook de operación.

---

## 9. App (web/PWA primero)

**Stack sugerido:** React (Next.js o Vite) + Tailwind, PWA instalable. Móvil nativo (Expo/React Native) como segunda etapa sobre la misma API. **[SUPUESTO]**

### 9.1 Pantallas MVP

| Rol | Pantallas |
|---|---|
| Todos | Login (OTP + PIN), Inicio (saldo, límite, vencimiento), Historial, Perfil |
| Pagar | Escanear QR / buscar miembro → monto → confirmar con PIN → recibo |
| Cobrar | QR del comercio (estático o con monto), aviso de cobro |
| Directorio | Búsqueda por rubro/nombre, "qué se vende en la red" |
| Comercio | Panel: ventas, saldo vs. tope positivo, estado de deuda y días restantes |
| Inversor | Depositar, posiciones, plazos, NAV, solicitudes de retiro, ingresos del Fondo |
| Broker/Operador | Consola: altas, límites, estados, parámetros, write-offs, auditoría |

### 9.2 Principios de UX

- **Cero vocabulario cripto** para miembros: nada de gas, hash, wallet ni semillas. El recibo muestra un enlace de verificación opcional.
- El estado de la deuda siempre visible: cuánto debo, cuándo vence, cuánto puedo gastar.
- Mensajes de error accionables ("Superaste tu límite por $X").
- Accesible, rápido en celulares básicos, funciona con conexión inestable (reintentos idempotentes).
- Vista de inversor claramente separada y con advertencias de riesgo.

### 9.3 Entregables del Agente C

- App funcional contra API simulada (mock) desde el día 1, luego contra el backend real.
- Flujos completos: alta → pago → cobro → vencimiento.
- Pruebas end-to-end de los flujos críticos.

---

## 10. Seguridad, privacidad y riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Privacidad on-chain**: saldos y pagos públicos revelan información comercial | Alto | Direcciones pseudónimas, sin datos personales on-chain; evaluar L1 permisionada (O5); informar al usuario |
| **Default en cascada** | Alto | Límites bajos al inicio, crecimiento por historial, tope de saldos positivos, Fondo con tope de pago |
| **Corrida en el Fondo** (descalce de plazos) | Alto | Retiros solo al vencimiento, cola FIFO, reserva de liquidez |
| **Inflación** erosiona a acreedores | Medio-Alto | Plazos cortos (O1/O2), monitoreo, revisar unidad de cuenta |
| **Arranque en frío** (nadie acepta la moneda) | Alto | Circuito chico y denso, un sumidero institucional (ej. becas/consumos en la red), brokers activos |
| **Compromiso de claves custodiales** | Crítico | Cifrado, separación de roles, límites por transacción, roadmap a KMS/MPC |
| **Replay / firma** en meta-tx | Alto | EIP-712, nonces, deadlines |
| **Errores en contratos** | Crítico | Tests de invariantes, análisis estático, auditoría externa antes de plata real |
| **Costo de gas del relayer** | Bajo-Medio | Wallet dedicada, límites diarios, presupuesto y alertas |
| **Regulatorio** (captación, custodia, pagos) | Alto | `LEGAL-REVIEW` antes del piloto con dinero real (O8) |
| **Fraude / identidad falsa** | Medio | Alta asistida por brokers, límites bajos en T0, KYC liviano, bloqueos |

---

## 11. Alcance

### Dentro del MVP
- `CreditLedger` completo (altas, límites, pagos, mora, write-off, pausa).
- `GuaranteeFund` básico (depósito con plazo, retiro al vencer, cola, ingresos, compensación con tope).
- Backend: auth OTP+PIN, miembros, pagos con meta-tx, indexer, jobs de mora, consola mínima.
- App web/PWA: flujos de miembro, comercio, inversor (básico) y consola de broker.
- Datos de prueba y simulación del circuito.

### Fuera del MVP
- Canje a pesos o USDC para miembros.
- Marketplace avanzado, matching automático de ofertas.
- Passkeys / account abstraction / wallets no custodiales.
- App móvil nativa.
- Tasa dinámica por utilización del Fondo (curva tipo protocolos DeFi).
- Interoperabilidad con otras redes de crédito.
- Integración con pasarelas de cobro y con sistemas de gestión de comercios.

---

## 12. Roadmap por hitos y criterios de aceptación

| Hito | Contenido | Criterio de aceptación |
|---|---|---|
| **H0 — Definiciones** | Cerrar O1, O2, O4 con simulación; parámetros iniciales | Planilla/simulación con escenarios (normal, estrés, default) y decisión documentada |
| **H1 — Contratos en Fuji** | `CreditLedger`, forwarder, deploy | Todos los tests e invariantes en verde; `deployments/fuji.json`; análisis estático sin altos |
| **H2 — Backend núcleo** | Auth, miembros, pagos, indexer | Pago extremo a extremo en Fuji; el espejo coincide con la cadena en `reconcile` |
| **H3 — App miembro/comercio** | Login, saldo, pagar/cobrar QR, historial | Flujo alta → pago → cobro completado por un usuario no técnico sin ayuda |
| **H4 — Mora y consola** | Jobs de mora, write-off, consola broker | Un miembro vencido es marcado, bloqueado y puede ser dado de baja con auditoría |
| **H5 — Fondo** | `GuaranteeFund`, vista inversor, cola de retiros | Ciclo depósito → ingreso de cuotas → compensación → retiro, con NAV correcto en tests |
| **H6 — Endurecimiento** | Revisión de seguridad, pruebas de carga, runbooks | Auditoría externa de contratos, plan de respuesta a incidentes, `LEGAL-REVIEW` cerrado |
| **H7 — Piloto** | Circuito chico real (decenas de miembros) | Métricas de la sección 14 medidas por 4–8 semanas |

---

## 13. Pruebas e invariantes

**Invariantes del ledger (deben cumplirse siempre):**
1. `sum(balance de todos los miembros + BAD_DEBT) == 0`.
2. Ningún miembro `Active` tiene `balance < −creditLimit` ni `balance > maxPositive`.
3. `debtSince != 0` si y solo si `balance < 0`.
4. Un miembro `Delinquent`, `Suspended` o `Defaulted` no puede ser emisor de `pay`.
5. `pay` no puede ser ejecutado dos veces con la misma firma (replay).

**Invariantes del Fondo:**
1. `totalAssets ≥ freeLiquidity ≥ 0` y `freeLiquidity ≥ minLiquidityBps × totalAssets` salvo durante procesamiento de cola.
2. Ningún inversor retira antes de `unlockAt`.
3. `navPerShare` solo baja por `compensate`, y solo sube por `depositRevenue`.
4. La suma de retiros procesados nunca excede los activos.

**Casos de prueba mínimos:** pago en el límite exacto, pago que supera límite, receptor en tope positivo, cruce de cero (positivo → negativo → positivo), vencimiento y gracia, write-off y compensación con tope, cola de retiros bajo estrés, pausa de emergencia, reentrancia, firmas inválidas y vencidas.

---

## 14. Métricas del piloto

| Métrica | Qué mide |
|---|---|
| **Velocidad del dinero** | Veces que una unidad cambia de manos por mes |
| Volumen mensual y n.º de transacciones | Uso real de la red |
| **Densidad de red** | Pares comprador–vendedor únicos / posibles |
| % de miembros que gastan y reciben | Evita miembros "solo acreedores" o "solo deudores" |
| Deuda en mora / deuda total | Calidad de cartera |
| Tiempo medio de saldado | Salud del plazo |
| Utilización del Fondo y NAV | Solvencia del respaldo |
| Retención de miembros a 30/90 días | Valor percibido |

Aclaración para el pitch: cualquier cifra obtenida de simulación debe presentarse como **simulada**, no como medida.

---

## 15. Glosario

- **Crédito mutuo:** sistema donde los miembros se acreditan y debitan entre sí; la suma total es cero.
- **Línea de crédito (`creditLimit`):** máximo negativo que un miembro puede tener.
- **Tope positivo (`maxPositive`):** máximo saldo a favor, para evitar acumulación.
- **Compensación (clearing):** saldado de deudas mediante ventas dentro de la red.
- **Meta-transacción:** transacción firmada por el usuario y enviada por un tercero (relayer) que paga el gas.
- **NAV por share:** valor del pool del Fondo dividido por sus shares.
- **Write-off:** castigo contable de una deuda incobrable.
- **Broker:** persona de confianza que conoce a los miembros y verifica su información.
