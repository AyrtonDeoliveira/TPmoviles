# Backend — MVP

Backend propio en Node.js + Express. Acá va la lógica de negocio, la integración con IA
y las APIs externas. Supabase (PostgreSQL / Storage / Auth) se usa aparte como BaaS.

Por ahora solo tiene el endpoint de salud (`GET /health`) para verificar conectividad
desde la app.

## Requisitos

- Node.js 20 o superior
- npm

## Cómo correr

```bash
cd backend
npm install
cp .env.example .env   # en Windows: copy .env.example .env
npm run dev            # recarga al guardar (node --watch)
```

El server queda en `http://localhost:4000`.

## Variables de entorno

Se definen en `backend/.env` (no se sube al repo). Plantilla en `.env.example`.
Toda la lectura de env pasa por `src/config.js`; el resto del código importa
`config` desde ahí y nunca usa `process.env` directo.

| Variable                     | Obligatoria | Descripción                                         |
|------------------------------|-------------|-----------------------------------------------------|
| `PORT`                       | No (4000)   | Puerto del backend.                                 |
| `NODE_ENV`                   | No (development) | Entorno de ejecución.                          |
| `SUPABASE_URL`               | Todavía no  | URL del proyecto Supabase (Semana 1-2).             |
| `SUPABASE_SERVICE_ROLE_KEY`  | Todavía no  | Key privada de Supabase. **Solo backend.**          |
| `IA_API_KEY`                 | Todavía no  | Key del proveedor de IA (a definir).                |

Las claves privadas (Supabase service role, IA) van **solo acá**, nunca en `mobile/`.

## Endpoints

| Método | Ruta       | Descripción                          |
|--------|------------|--------------------------------------|
| GET    | `/`        | Mensaje de bienvenida.               |
| GET    | `/health`  | Estado del backend (status, hora, uptime). |

Ejemplo:

```bash
curl http://localhost:4000/health
```

```json
{
  "status": "ok",
  "servicio": "backend-mvp",
  "hora": "2026-08-29T21:00:00.000Z",
  "arrancadoEn": "2026-08-29T20:59:00.000Z",
  "uptimeSegundos": 60
}
```

## Probar desde la app móvil

Con el backend corriendo, abrí la app (`cd mobile && npm start`). La pantalla inicial
hace un `GET /health` y muestra si el backend responde.

- **Navegador / emulador:** usa `http://localhost:4000`.
- **Celular con Expo Go:** usa la IP de la PC en la red local. La app la deduce sola a
  partir del host de Expo (Metro), así que la PC y el celular tienen que estar en la
  misma red Wi-Fi.
