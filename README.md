# localito

Proyecto de moneda circular local para una red de comercios y oficios. El MVP debe demostrar pagos internos simples y evitar suponer rampas bancarias, permisos regulatorios o integraciones que aún no fueron confirmadas.

## Estructura inicial

- `apps/web/`: frontend Next.js/PWA (a cargo de Oky).
- `services/api/`: backend del flujo mínimo en Node 24 + TypeScript + Fastify + SQLite (`node:sqlite`). Contrato en `docs/api-contract.md`.
- `docs/`: spec funcional, spec técnica, plan de tareas, contrato API y backlogs.

## Arranque rápido

```bash
cd services/api
npm install
npm run dev
```

La API queda en `http://localhost:3001/api`. Para acceder desde otro dispositivo de la LAN:

```powershell
$env:HOST = "0.0.0.0"
npm run dev
```

## Trabajo del equipo

El board está en [Issue #1](https://github.com/JMReader/localito/issues/1). Asociar cada trabajo a ese issue o a un issue hijo, y abrir PRs contra este repositorio.
