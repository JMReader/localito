# Localito web

Frontend de demo para la moneda local de Localito. Next.js (App Router) +
TypeScript, mobile-first, sin dependencias de UI externas.

## Correr

```powershell
cd apps/web
Copy-Item .env.example .env.local
npm install
npm run dev
```

Queda en `http://localhost:3000` y espera la API en
`http://localhost:3001/api` (configurable con `NEXT_PUBLIC_API_URL`).

Si el backend corre en otra máquina o en un celular de la LAN, apuntá
`NEXT_PUBLIC_API_URL` a `http://<IP>:3001/api` y arrancá la API con
`HOST=0.0.0.0`.

## Scripts

| script | qué hace |
|---|---|
| `npm run dev` | Next en el puerto 3000 |
| `npm run build` | build de producción |
| `npm run start` | sirve el build en el puerto 3000 |
| `npm run typecheck` | `tsc --noEmit` |

## Flujo cubierto

Login por alias de demo (`ana`, `bruno`, `kiosco`, `cafe`, `foto`), saldo y
margen leídos de `GET /me`, búsqueda de participantes, pago con
`Idempotency-Key` (una clave por intento, reutilizada al reintentar el mismo
pago), recibo, historial con refresh manual y polling cada 20 s, stats de
circuito y reset de demo.

El token se guarda en `localStorage`. Ante un `401` se limpia la sesión y se
vuelve al login. Los errores muestran `error.message`; los `details` nunca se
imprimen crudos.
