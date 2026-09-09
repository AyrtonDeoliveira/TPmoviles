# Backend — MVP

Backend propio en Node.js + Express. Acá va la lógica de negocio, la integración con IA
y las APIs externas. Supabase (PostgreSQL / Storage / Auth) se usa aparte como BaaS.

Estado: salud (`/health`, `/health/db`), conexión a Supabase y **autenticación**
(registro / login / sesión / `/me`). Workspaces, archivos, dashboard, IA y paywall
se agregan en las próximas semanas — ver `../docs/contrato-api.md`.

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
| `SUPABASE_URL`               | Sí (para la DB) | *Project URL* del proyecto Supabase.            |
| `SUPABASE_SERVICE_ROLE_KEY`  | Sí (para la DB) | Key *service_role* (secreta). **Solo backend.** |
| `IA_API_KEY`                 | Todavía no  | Key del proveedor de IA (a definir).                |

Las claves privadas (Supabase service role, IA) van **solo acá**, nunca en `mobile/`.

## Endpoints

| Método | Ruta            | Auth | Descripción                                        |
|--------|-----------------|------|----------------------------------------------------|
| GET    | `/`             | —    | Mensaje de bienvenida.                              |
| GET    | `/health`       | —    | Estado del backend (uptime, si Supabase está ok).   |
| GET    | `/health/db`    | —    | Chequeo real de la base (lectura + escritura).      |
| POST   | `/auth/register`| —    | Crea la cuenta y devuelve sesión. `{ nombre, email, password }` |
| POST   | `/auth/login`   | —    | Inicia sesión. `{ email, password }`               |
| POST   | `/auth/logout`  | Bearer | Cierra la sesión.                                 |
| GET    | `/me`           | Bearer | Perfil del usuario + plan efectivo y sus límites.  |

Contrato completo (formas de request/response, errores, endpoints planificados):
[`../docs/contrato-api.md`](../docs/contrato-api.md).

```bash
curl http://localhost:4000/health
curl -X POST http://localhost:4000/auth/register -H 'Content-Type: application/json' \
  -d '{"nombre":"Ana","email":"ana@ejemplo.com","password":"contrasena8"}'
```

Estructura de `src/`:

```
config.js            variables de entorno (único punto)
server.js            arma la app y monta los routers
db/supabase.js       clientes de Supabase (service role)
db/check.js          chequeo de conexión (npm run db:check)
middleware/auth.js   requireAuth (valida el Bearer token)
routes/              health.js · auth.js · me.js
plans/limites.js     límites de cada plan + helpers
lib/                 validar.js · respuestas.js
```

## Base de datos

Stack: **Supabase** (PostgreSQL / Storage / Auth). El backend se conecta con
`@supabase/supabase-js` usando la **service role key** (saltea RLS; la
autorización la hace el backend en cada endpoint).

El modelo de datos está en `db/`:

- `db/schema.sql` — esquema completo (tablas, índices, RLS, triggers, planes).
- `db/seed.sql` — datos de ejemplo para desarrollo.
- `db/README.md` — cómo aplicarlo.

Descripción y diagrama: [`../docs/modelo-de-datos.md`](../docs/modelo-de-datos.md).

### Conectar la base (Paso 6)

1. Crear un proyecto en [supabase.com](https://supabase.com) (**Free**).
2. **SQL Editor** → pegar y ejecutar `db/schema.sql`.
3. **Project Settings → API** → copiar a `backend/.env`:
   - `SUPABASE_URL` = *Project URL*
   - `SUPABASE_SERVICE_ROLE_KEY` = *service_role* (secret, NO la `anon`)
4. Verificar la conexión:

```bash
npm run db:check
```

Salida esperada (`ok: true`) — hace una lectura de `plans` y un ciclo
escritura → relectura → borrado en `diagnostics`:

```json
{
  "ok": true,
  "lectura": { "ok": true, "planes": 3 },
  "escritura": { "ok": true, "id": "..." }
}
```

También disponible como endpoint: `GET /health/db`.

## Probar desde la app móvil

Con el backend corriendo, abrí la app (`cd mobile && npm start`). La pantalla inicial
hace un `GET /health` y muestra si el backend responde.

- **Navegador / emulador:** usa `http://localhost:4000`.
- **Celular con Expo Go:** usa la IP de la PC en la red local. La app la deduce sola a
  partir del host de Expo (Metro), así que la PC y el celular tienen que estar en la
  misma red Wi-Fi.
