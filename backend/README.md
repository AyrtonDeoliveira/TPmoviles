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
| `IA_API_KEY`                 | Sí (para la IA) | Key de Gemini (Google AI Studio). **Solo backend.** |
| `GEMINI_MODEL`               | No (`gemini-3.6-flash`) | Modelo de Gemini a usar.            |
| `IA_TIMEOUT_MS`              | No (60000)  | Tiempo máximo de una llamada a la IA.               |
| `BRAVE_API_KEY`              | No (opcional) | Key de Brave Search. Sin ella, el análisis sigue sin evidencia externa. |
| `BRAVE_TIMEOUT_MS`           | No (8000)   | Tiempo máximo de una búsqueda.                      |

Las claves privadas (Supabase service role, IA, Brave) van **solo acá**, nunca en `mobile/`.

## Endpoints

| Método | Ruta            | Auth | Descripción                                        |
|--------|-----------------|------|----------------------------------------------------|
| GET    | `/health` · `/health/db` · `/health/ia` · `/health/brave` | — | Estado del backend / base / Gemini / Brave (chequeos reales). |
| POST   | `/auth/register` · `/auth/login` | — | Alta y login. Devuelven sesión. |
| POST   | `/auth/logout`  | Bearer | Cierra la sesión. |
| GET    | `/me`           | Bearer | Perfil + plan efectivo y límites. |
| GET/POST | `/workspaces` | Bearer | Listar / crear emprendimiento (valida contexto + límite de plan). |
| GET/PATCH/DELETE | `/workspaces/:id` | Bearer | Ver / editar / eliminar (lógico). Aislado por dueño. |
| GET/POST | `/workspaces/:id/metrics` | Bearer | Métricas manuales (con período y moneda). |
| DELETE | `/workspaces/:id/metrics/:mid` | Bearer | Borrar una métrica. |
| GET/POST | `/workspaces/:id/files` | Bearer | Subir (multipart, campo `archivo`) / listar. |
| DELETE | `/workspaces/:id/files/:fid` | Bearer | Borrar archivo (libera cuota). |
| GET    | `/workspaces/:id/dashboard` | Bearer | Resumen + métricas + último análisis (gateado por plan). |
| GET/PATCH | `/workspaces/:id/actions/:aid` | Bearer | Cambiar estado de una acción. |
| POST   | `/workspaces/:id/analyze` | Bearer | Genera el análisis con IA (sincrónico, ~15-25 s). Gate por plan, cuota mensual, 1 activo por cuenta. |
| GET    | `/workspaces/:id/analyses` \| `.../analyses/:aid` | Bearer | Historial (recortado por plan) y detalle. Sin costo de IA. |
| GET    | `/workspaces/:id/instagram` | Bearer | Estado de la conexión (simulada). |
| POST   | `/workspaces/:id/instagram/connect` \| `.../disconnect` | Bearer | Simula conectar Instagram; profesional carga 4 métricas de ejemplo. |
| POST   | `/subscription/activate-demo` | Bearer | Paywall: pago simulado, idempotente. Amplía los límites de la cuenta al instante. |

Contrato completo (request/response, errores, endpoints de Semana 3):
[`../docs/contrato-api.md`](../docs/contrato-api.md).

```bash
curl http://localhost:4000/health
node scripts/smoke-semana3.mjs            # recorrido de oro completo (1 sola llamada a Gemini/Brave)
```

Ese es el que conviene correr para verificar todo de una. Los demás son para debug
puntual de una parte sin esperar ni gastar cuota de IA en todo el resto:

```bash
npm run ia:check                          # llamada real a Gemini (sin tocar workspaces)
npm run brave:check                       # llamada real a Brave Search
node scripts/smoke-semana2.mjs            # auth + workspaces + aislamiento + límites + archivos
node scripts/probar-contexto-ia.mjs       # contexto por workspace + aislamiento del prompt
node scripts/probar-analisis-ia.mjs       # salida estructurada (10 campos, exactamente 3 c/u)
node scripts/probar-analyze-endpoint.mjs  # POST /analyze end-to-end (gate + cuota + acciones)
node scripts/probar-instagram.mjs         # conectar/desconectar Instagram simulado
node scripts/probar-historial.mjs         # historial gateado por plan (Gratuito y Pro)
node scripts/probar-paywall.mjs           # paywall: límite, activar Pro, idempotencia
node scripts/preguntar-ia.mjs "..."        # pregunta libre a Gemini, para probar a mano
```

Estructura de `src/`:

```
config.js               variables de entorno (único punto)
server.js               arma la app y monta los routers
db/supabase.js          clientes de Supabase (service role)
db/check.js             chequeo de conexión (npm run db:check)
db/storage.js           bucket privado 'workspace-files' + helpers
ia/gemini.js            cliente REST mínimo de Gemini (generarTexto, generarJSON)
ia/check.js             chequeo de conexión real (npm run ia:check)
ia/brave.js             cliente de Brave Search API
ia/braveCheck.js        chequeo de conexión real (npm run brave:check)
ia/busqueda.js          arma la consulta (país+ciudad+categoría) y busca evidencia externa
ia/contexto.js          arma el contexto del workspace + preguntarSobreWorkspace
ia/prompt.js            arma los prompts (contextual y de análisis)
ia/esquemaAnalisis.js   responseSchema de Gemini + validación de negocio
ia/analisis.js          genera y valida el análisis estructurado (con 1 reintento)
middleware/auth.js      requireAuth (valida el Bearer token)
middleware/workspace.js requireWorkspace (carga + aislamiento) · bloquearSiAnalisisActivo
routes/                 health · auth · me · workspaces · metrics · files · dashboard · actions · analyze · analyses · instagram · subscription
plans/limites.js        límites de cada plan + uso actual (workspaces, bytes, análisis/mes)
lib/                    validar.js · respuestas.js · entregaAnalisis.js (gate por plan) · datasetInstagram.js (simulado)
```

El bucket de Storage `workspace-files` (privado) se crea solo al arrancar si no existe.

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
