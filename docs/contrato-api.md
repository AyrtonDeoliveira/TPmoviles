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
      "workspaces": 1, "almacenamientoMb": 500, "archivoMaxMb": 10,
      "analisisCompletosMes": 0, "busquedasMes": 0, "historialMeses": 1
    }
  }
}
```
Error: `401 sin_token | token_invalido`.

---

## Endpoints planificados (Semana 2-3) — formas propuestas

Todos requieren `Authorization: Bearer <accessToken>` y validan que el
`workspace` sea del usuario (si no → `404 no_encontrado`, sin revelar existencia).

### `GET /workspaces`
Lista los emprendimientos activos (no eliminados) del usuario.
```json
{ "workspaces": [ { "id": "uuid", "nombre": "…", "categoria": "…", "etapa": "ventas",
  "creadoEn": "…" } ] }
```

### `POST /workspaces`
Request (campos según `docs/modelo-de-datos.md` / FR-03):
```json
{
  "nombre": "Alma Cerámica",
  "pais": "Argentina", "ciudad": "Córdoba",
  "categoria": "Productos físicos", "etapa": "ventas",
  "oferta": "10-500 chars", "clienteObjetivo": "10-500 chars",
  "objetivo90d": "consultas", "objetivo90dNota": "texto libre",
  "sitioWeb": "https://…", "instagramHandle": "almaceramica",
  "ventasActuales": { "valor": 12, "periodo": "30 dias", "moneda": "ARS" }
}
```
Response `201`: `{ "workspace": { …, "id": "uuid" } }`.
Error: `403 limite_plan` si supera `plan.limites.workspaces`.

### `GET /workspaces/:id` · `PATCH /workspaces/:id` · `DELETE /workspaces/:id`
`GET` devuelve el workspace completo. `PATCH` acepta los mismos campos que `POST`
(parciales). `DELETE` es lógico (marca `deleted_at`) y responde `{ "ok": true }`.

### `POST /workspaces/:id/files`
`multipart/form-data` con el archivo. Valida tipo (PDF, DOCX, XLSX, CSV, JPG, PNG),
tamaño (`plan.limites.archivoMaxMb`) y espacio total (`almacenamientoMb`).
Response `201`: `{ "file": { "id": "uuid", "nombre": "…", "tamanioBytes": 1234,
"estado": "pendiente" } }`. Error: `413 archivo_grande` | `403 storage_lleno`.

### `GET /workspaces/:id/dashboard`
```json
{
  "resumen": { "situacion": "…", "ultimoAnalisis": "…", "calidadContexto": "parcial" },
  "acciones": [ { "id": "uuid", "titulo": "…", "impacto": "alto", "esfuerzo": "medio",
    "metrica": "consultas", "estado": "pendiente" } ],
  "metricas": [ { "tipo": "alcance", "valor": 9000, "periodo": ["…","…"],
    "fuente": "instagram", "estado": "ok" } ]
}
```
En plan Gratuito el dashboard viene con `bloqueado: true` y solo el resumen.

### `POST /workspaces/:id/analyze`
Request: `{ "tipo": "vista_previa" | "completo" }`. Ejecuta el análisis con IA
(async): responde `202 { "analisis": { "id": "uuid", "estado": "procesando" } }`.
El frontend hace polling a `GET /workspaces/:id/analyses/:analysisId`.
Error: `403 limite_plan` si supera `analisisCompletosMes`; `403 requiere_pro`
si `tipo:"completo"` y el plan es Gratuito.

### `GET /workspaces/:id/analyses`
Historial, recortado a `plan.limites.historialMeses`.
```json
{ "analyses": [ { "id": "uuid", "tipo": "completo", "estado": "completada",
  "creadoEn": "…", "resultado": { … }, "proyeccion": { … } } ] }
```

### `PATCH /workspaces/:id/actions/:actionId`
Request: `{ "estado": "pendiente" | "en_curso" | "hecha" }`. Response: la acción actualizada.

### `POST /subscription/activate-demo`
Request: `{ "planId": "business" | "pro" }`. Activa la suscripción simulada
(idempotente: repetir no crea duplicados). Response `200`:
```json
{ "suscripcion": { "planId": "pro", "estado": "active", "simulada": true, "desde": "…" } }
```
