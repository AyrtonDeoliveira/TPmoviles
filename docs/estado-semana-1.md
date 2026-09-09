# Estado de cierre — Semana 1 (backend / Ayrton)

Período del plan: 27/08 → 02/09. Documento de cierre del trabajo de Tech Lead /
Backend + IA.

## Checklist de cierre (guía, Semana 1)

| Ítem | Estado |
|---|---|
| Repo compartido y ejecutable | ✅ `AyrtonDeoliveira/TPmoviles` — `mobile/`, `backend/`, `docs/` |
| App Expo abre correctamente | ✅ Expo SDK 54, corre en Expo Go / web |
| Backend responde `/health` | ✅ |
| App se comunica con el backend | ✅ la pantalla inicial hace `GET /health` |
| Base de datos conectada | ✅ Supabase (Postgres); `npm run db:check` → `ok:true`, `planes:3` |
| Modelo de datos inicial definido | ✅ `backend/db/schema.sql` + `docs/modelo-de-datos.md` |
| Registro / login funcionando | ✅ `POST /auth/register`, `POST /auth/login`, `GET /me`, `POST /auth/logout` |
| Separación de variables de entorno | ✅ `src/config.js` + `.env` (gitignored) |
| Contrato inicial de API acordado con Lu | ✅ `docs/contrato-api.md` (para revisar con Lu) |

## Qué quedó hecho

**Paso 1-2 — Repo + Expo.** Monorepo con `mobile/` (Expo + RN + TS, SDK 54) y
`backend/` (Node + Express, ESM). READMEs con instrucciones de clonado y ejecución.

**Paso 3-4 — Backend + entorno.** `GET /health` y `GET /health/db`. Toda lectura de
env pasa por `src/config.js`; nada de `process.env` suelto. `.env.example` con
`PORT`, `NODE_ENV`, Supabase e IA.

**Paso 5 — Modelo de datos.** `db/schema.sql` (idempotente): `plans`, `users`
(1:1 con `auth.users`), `subscriptions`, `workspaces`, `files`, `metrics`,
`analyses`, `actions`, `diagnostics`. Índices, RLS (segunda barrera; el backend
usa service role), triggers `updated_at` y `handle_new_user`, vista
`user_current_plan`. Alineado con la especificación funcional de Matu y con la
actualización de planes (3 tiers Gratuito/Business/Pro).

**Paso 6 — Conexión a la base.** `@supabase/supabase-js` con la service role key.
`src/db/supabase.js` (cliente + validación de que la URL sea la de la API).
`npm run db:check` hace lectura real (`plans`) + escritura/relectura/borrado
(`diagnostics`). Verificado end-to-end.

**Paso 7 — Autenticación.** Supabase Auth. `POST /auth/register` (crea usuario
confirmado + el trigger arma perfil y suscripción `free`), `POST /auth/login`,
`POST /auth/logout`, `GET /me` (perfil + plan efectivo). Middleware `requireAuth`
valida el `Bearer` token. Validaciones: email con formato, password ≥ 8, nombre
obligatorio. Errores de login genéricos (no revelan si el email existe).
Probado: alta, login, `/me` con y sin token, token inválido, email duplicado
(409), password incorrecta (401), password corta (400), logout. El usuario de
prueba se eliminó después.

**Paso 8 — Límites de planes desde código.** `src/plans/limites.js`: los números
de cada plan como espejo del `INSERT` de `schema.sql`, `getPlanDeUsuario()` (lee
`user_current_plan`) y helpers `puedeCrearWorkspace` / `puedeSubirArchivo` /
`puedeAnalisisCompleto`. El enforcement real se conecta con el CRUD de Semana 2.

**Paso 9 — Contrato de API.** `docs/contrato-api.md`: endpoints implementados con
formas de request/response y formato de error, más las formas propuestas de los
endpoints de Semana 2-3 para que Lu avance con mocks.

## Cómo probar desde cero

```bash
git clone https://github.com/AyrtonDeoliveira/TPmoviles.git
cd TPmoviles

# Backend
cd backend
npm install
cp .env.example .env
# completar en .env:
#   SUPABASE_URL=https://<ref>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<service_role / sb_secret_...>
# en Supabase: SQL Editor -> pegar y correr db/schema.sql
npm run db:check          # espera { "ok": true, "lectura": { "planes": 3 } }
npm run dev               # http://localhost:4000

# Alta + login + perfil
curl -X POST http://localhost:4000/auth/register -H 'Content-Type: application/json' \
  -d '{"nombre":"Ana","email":"ana@ejemplo.com","password":"contrasena8"}'
# copiar sesion.accessToken y:
curl http://localhost:4000/me -H "Authorization: Bearer <accessToken>"

# App móvil (otra terminal)
cd ../mobile
npm install
npm start                 # QR con Expo Go, o 'w' para web
```

## Pendiente / decisiones abiertas

- **Proveedor de IA + búsqueda web.** Sin definir. Opciones (doc de Matu): OpenAI
  Responses API con `web_search`, o Brave Search API + un LLM aparte. Pesa recién
  en Semana 3.
- **Colaboradores / multiusuario.** El modelo tiene el knob
  (`max_collaborators_per_workspace`) pero no se implementa; a confirmar con el
  equipo si entra al MVP (recomendación: no).
- **Nombres de plan** — quedaron `Gratuito` / `Business` / `Pro`. Confirmar con
  Lu y Matu para que la UI y QA usen los mismos.
- **Refresh token automático** — hoy el frontend re-loguea cuando expira el
  `accessToken`; el refresh con `refreshToken` queda para Semana 2.
- **Contrato de API** — revisar `docs/contrato-api.md` con Lu en la reunión de
  inicio de semana.

## Para Semana 2

CRUD de workspaces con aislamiento (`user_id` + `workspace_id` en cada consulta,
probado explícitamente A↔B), storage de archivos con validación de límites,
endpoints del dashboard con datos de prueba, y dejar lista la capa de contexto
para conectar IA en Semana 3.
