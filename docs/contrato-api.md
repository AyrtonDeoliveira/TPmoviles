# Contrato de API — MVP

Acuerdo entre backend (Ayrton) y frontend (Lu) sobre qué endpoints existen y qué
datos intercambian. Lu puede desarrollar con mocks siguiendo estas formas; los
nombres pueden ajustarse, pero cambios se avisan.

- **Base URL (dev):** `http://localhost:4000` — la app la deduce del host de Expo.
- **Formato:** JSON en request y response. `Content-Type: application/json`.
- **Idioma:** mensajes de error en español, pensados para mostrarse al usuario.
- **Fechas:** ISO 8601 UTC (`2026-09-09T16:42:51.035Z`).

## Autenticación

Se usa **Supabase Auth**. El backend devuelve una sesión con tokens; el frontend
guarda el `accessToken` y lo manda en cada request protegido:

```
Authorization: Bearer <accessToken>
```

El `accessToken` expira (~1 h, campo `expiresAt` en epoch segundos). Cuando expira,
las rutas protegidas responden `401 { codigo: "token_invalido" }`; el frontend
debe re-loguear (el refresh automático con `refreshToken` queda para Semana 2).

Forma de `sesion` en las respuestas de `register` / `login`:

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "3xxugf7xpvjb",
  "expiresAt": 1788975800
}
```

## Formato de error

Todas las respuestas de error tienen la misma forma:

```json
{ "error": "Mensaje legible para el usuario.", "codigo": "slug_estable" }
```

El frontend muestra `error` y puede ramificar por `codigo`. Códigos usados:
`sin_token`, `token_invalido`, `credenciales_invalidas`, `email_en_uso`,
`email_invalido`, `password_invalida`, `nombre_invalido`, `no_encontrado`,
`sin_supabase`, `error_interno`.

---

## Endpoints implementados (Semana 1)

### `GET /health`
Estado del backend. Sin auth.
```json
{ "status": "ok", "servicio": "backend-mvp", "entorno": "development",
  "supabaseConfigurado": true, "hora": "…", "arrancadoEn": "…", "uptimeSegundos": 12 }
```

### `GET /health/db`
Chequeo real de la base (lectura + escritura/relectura/borrado). Sin auth.
`200` si `ok:true`, `503` si no.
```json
{ "ok": true, "lectura": { "ok": true, "planes": 3 }, "escritura": { "ok": true, "id": "…" } }
```

### `POST /auth/register`
Crea la cuenta y devuelve sesión iniciada. Sin auth.

Request:
```json
{ "nombre": "Ana Pérez", "email": "ana@ejemplo.com", "password": "min 8 chars" }
```
Response `201`:
```json
{
  "usuario": { "id": "uuid", "email": "ana@ejemplo.com", "nombre": "Ana Pérez" },
  "sesion": { "accessToken": "…", "refreshToken": "…", "expiresAt": 1788975800 }
}
```
Errores: `400 nombre_invalido | email_invalido | password_invalida`,
`409 email_en_uso`.

### `POST /auth/login`
Request:
```json
{ "email": "ana@ejemplo.com", "password": "…" }
```
Response `200`:
```json
{ "usuario": { "id": "uuid", "email": "ana@ejemplo.com" },
  "sesion": { "accessToken": "…", "refreshToken": "…", "expiresAt": 1788975800 } }
```
Error: `401 credenciales_invalidas` (genérico: no revela si el email existe).

### `POST /auth/logout`
Header `Authorization: Bearer <accessToken>`. Sin body.
Response `200`: `{ "ok": true }`. El frontend igual debe descartar el token localmente.

### `GET /me`
Header `Authorization: Bearer <accessToken>`. Perfil + plan efectivo del usuario.
```json
{
  "usuario": { "id": "uuid", "email": "ana@ejemplo.com", "nombre": "Ana Pérez", "creadoEn": "…" },
  "plan": {
    "id": "free",
    "nombre": "Gratuito",
    "limites": {
      "workspaces": 1, "almacenamientoMb": 50, "archivoMaxMb": 10,
      "analisisPreviewMes": 1, "analisisCompletosMes": 0, "historialMeses": 1
    }
  }
}
```
Error: `401 sin_token | token_invalido`.

---

## Endpoints implementados (Semana 2)

Todos requieren `Authorization: Bearer <accessToken>`. Los que llevan `:id`
validan que el emprendimiento sea del usuario; si no → **`404 no_encontrado`**
(no se revela si existe). Campos en camelCase; contexto según
`docs/modelo-de-datos.md` / FR-03.

### `GET /workspaces`
```json
{ "workspaces": [ { "id": "uuid", "nombre": "…", "pais": "…", "ciudad": "…",
  "categoria": "…", "etapa": "ventas", "oferta": "…", "clienteObjetivo": "…",
  "objetivo90d": "consultas", "objetivo90dNota": null, "sitioWeb": null,
  "instagramHandle": null, "instagramEstado": "no_conectada",
  "ventasActuales": { "valor": 12, "periodo": "30 dias", "moneda": "ARS" },
  "creadoEn": "…", "actualizadoEn": "…" } ] }
```

### `POST /workspaces`
Request (obligatorios: `nombre` 2-80, `pais` 2-100, `ciudad` 2-100, `categoria`,
`etapa`, `oferta` 10-500, `clienteObjetivo` 10-500, `objetivo90d`):
```json
{
  "nombre": "Alma Cerámica", "pais": "Argentina", "ciudad": "Córdoba",
  "categoria": "Productos físicos", "etapa": "ventas",
  "oferta": "…", "clienteObjetivo": "…",
  "objetivo90d": "consultas", "objetivo90dNota": "sólo si objetivo90d = 'otro'",
  "sitioWeb": "https://…", "instagramHandle": "almaceramica",
  "ventasActuales": { "valor": 12, "periodo": "30 dias", "moneda": "ARS" }
}
```
`objetivo90d` ∈ `ventas | alcance | consultas | clientes | validacion | otro`.
`etapa` ∈ `idea | lanzamiento | ventas | crecimiento`.
Response `201`: `{ "workspace": { … } }`.
Errores: `400 datos_invalidos` (con `detalles: [...]`), `403 limite_plan`
(con `limite` y `sugerencia: "activar_pro"`).

### `GET /workspaces/:id` · `PATCH /workspaces/:id` · `DELETE /workspaces/:id`
- `GET` → `{ "workspace": { … } }`.
- `PATCH` → mismos campos que `POST`, parciales. **`409 analisis_activo`** si hay
  un análisis en curso en la cuenta. `400 sin_cambios` si el body está vacío.
- `DELETE` → eliminación lógica (`deleted_at`); libera cupo y storage.
  `{ "ok": true }`. También `409 analisis_activo`.

### `GET /workspaces/:id/metrics` · `POST` · `DELETE /workspaces/:id/metrics/:metricId`
`GET` → última métrica por tipo + `conversion` calculada:
```json
{ "metricas": [ { "id": "uuid", "tipo": "consultas", "valor": 40, "moneda": null,
  "periodo": { "inicio": "…", "fin": "…" }, "origen": "manual", "estado": "ok",
  "registradoEn": "…" } ],
  "conversion": { "valor": 25, "calculable": true } }
```
`POST` body: `{ "metricas": [ { "tipo": "...", "valor": n, "periodo": { "inicio": "...", "fin": "..." }, "moneda": "ARS" } ] }`.
Tipos: contadores (`consultas`, `clientes`, `pedidos`, `seguidores`, `alcance`,
`interacciones`, `visitas_perfil`, `vistas`) = enteros ≥ 0; `ventas_importe` =
número + `moneda` obligatoria. Todos con `periodo`. `origen` = `manual`.
Errores: `400 tipo_invalido | valor_invalido | periodo_invalido | falta_moneda`.

### `POST /workspaces/:id/files` · `GET` · `DELETE /workspaces/:id/files/:fileId`
`POST` = `multipart/form-data`, campo **`archivo`**. Valida formato
(**PDF, DOCX, TXT, CSV**), tamaño (`plan.limites.archivoMaxMb`, 10 MB) y espacio
de la cuenta (`almacenamientoMb`). Response `201`:
```json
{ "archivo": { "id": "uuid", "nombre": "datos.csv", "tipo": "text/csv",
  "tamanioBytes": 1234, "estado": "procesado", "creadoEn": "…" } }
```
Errores: `415 formato_no_admitido`, `413 archivo_grande`, `403 storage_lleno`,
`400 archivo_vacio | sin_archivo`.
`DELETE` quita el archivo de Storage y libera la cuota → `{ "ok": true }`.
*(La extracción de texto para la IA se agrega en Semana 3.)*

### `GET /workspaces/:id/dashboard`
Sin análisis: `{ "emprendimiento": {…}, "sinAnalisis": true, "metricas": [...] }`.
Con análisis: `{ "emprendimiento": {…}, "metricas": [...], "analisis": { … } }`,
donde `analisis` tiene la **misma forma gateada por plan** que devuelve
`POST /workspaces/:id/analyze` (ver abajo) — es el mismo serializador
(`construirEntregaAnalisis`) para no duplicar la lógica del gate en dos lugares.

### `GET /workspaces/:id/actions` · `PATCH /workspaces/:id/actions/:actionId`
`PATCH` body `{ "estado": "pendiente" | "en_curso" | "hecha" }` → `{ "accion": { … } }`.
`404 no_encontrado` si la acción no es de ese emprendimiento.

### `GET /workspaces/:id/instagram` · `POST .../connect` · `POST .../disconnect`
CU-S2-09. **Sin integración real con Meta** (fuera de alcance del MVP): `connect`
simula la conexión.
```json
{ "conectado": true, "handle": "almaceramica", "tipoCuenta": "profesional", "estado": "conectada" }
```
`POST /connect` body: `{ "handle": "...", "tipoCuenta": "personal" | "profesional" }`.
- `profesional` → queda `conectada` y se cargan **4 métricas simuladas** (`seguidores`,
  `alcance`, `interacciones`, `visitas_perfil`; `origen: "simulada"`, nunca `"instagram"`)
  del último período de 30 días. Response incluye `metricas: [...]`.
- `personal` → queda `permiso_faltante` y no se cargan métricas; el `mensaje`
  explica que Insights necesita una cuenta profesional y que puede seguir
  cargando datos a mano.
`POST /disconnect` → vuelve a `no_conectada`; las métricas ya cargadas quedan
como historial (no se borran).

### `POST /workspaces/:id/analyze`
Sin body. **Sincrónico** (procesa la llamada a Gemini dentro del mismo
request; puede tardar ~15-25 s — el frontend debe mostrar un estado de carga,
no hace falta polling). Response `201`:
```json
{
  "analisis": {
    "id": "uuid", "estado": "completada", "fecha": "…",
    "calidadContexto": "parcial", "objetivo": "consultas",
    "resumen": "…", "escenario90d": { "nivel": "base", "supuestos": [...], "limitaciones": [...] },
    "bloqueado": false,
    "fortalezas": [{ "texto": "…", "evidencia": "…" }],
    "riesgos": [{ "texto": "…", "probabilidad": "media", "impacto": "alto", "mitigacion": "…" }],
    "oportunidades": [{ "texto": "…", "relevancia": "…", "fuente": "…" }],
    "fuentes": [],
    "advertencias": ["…"],
    "acciones": [{ "id": "uuid", "titulo": "…", "motivo": "…", "impacto": "alto", "esfuerzo": "bajo", "metrica": "…", "estado": "pendiente", "orden": 1 }]
  }
}
```
En plan **Gratuito**, en vez de `fortalezas/riesgos/oportunidades/fuentes/advertencias/acciones`
viene `"bloqueado": true, "vistaPrevia": { "fortaleza": {…}, "riesgo": {…}, "oportunidad": {…} }, "desbloquearCon": "pro"`
(sin las 3 acciones ni el análisis completo — el análisis se generó y guardó
igual, solo cambia qué se entrega).

**Búsqueda web:** se investigó con **Brave Search API** (país + ciudad +
categoría del workspace, hasta 4 resultados). Si hay resultados relevantes,
`fuentes` viene poblado con título/url/fecha/afirmación **reales y
verificables** (probado con casos reales). Se descartó el grounding nativo de
Gemini (`google_search`): devuelve `429` sin cupo en el free tier aunque una
llamada normal funcione bien. Si Brave falla o no hay `BRAVE_API_KEY`, el
análisis sigue igual sin evidencia externa y lo declara en `advertencias`
(nunca bloquea, permitido por la spec de Semana 2 de Matu).

Errores:
- `400 contexto_insuficiente` — con `faltan: [...]` (campos del contexto mínimo que faltan).
- `409 analisis_activo` — ya hay un análisis en curso en la cuenta.
- `403 limite_plan` — con `limite` y `sugerencia: "activar_pro"` si corresponde.
- `502 analisis_fallo` — la IA falló o no devolvió un resultado válido (no consume cuota; se puede reintentar). Incluye `analisisId`.
- `503 ia_ocupada` — Gemini está sin cupo/rate-limited (transitorio); reintentar en unos minutos. No consume cuota.

---

## Endpoints planificados (Semana 3)

### `GET /workspaces/:id/analyses`
Historial, recortado a `plan.limites.historialMeses`.
```json
{ "analyses": [ { "id": "uuid", "estado": "completada", "creadoEn": "…", … } ] }
```

### `POST /subscription/activate-demo`
Request: `{ "planId": "pro" }`. Activa la suscripción simulada
(idempotente: repetir no crea duplicados). Response `200`:
```json
{ "suscripcion": { "planId": "pro", "estado": "active", "simulada": true, "desde": "…" } }
```
