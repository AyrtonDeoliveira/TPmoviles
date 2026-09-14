# Estado de Semana 2 — backend / Ayrton

Complemento del doc de Matu (`semana_2_matu_casos_de_uso_y_estado.pdf`). Cubre las
tareas de backend del cronograma (Semana 2: usuarios, workspaces, storage y
dashboard base) y las dependencias que Matu pidió para poder ejecutar QA.

## Hecho

| Tarea (guía) | Estado | Endpoints / módulos |
|---|---|---|
| Cerrar autenticación | ✅ (Semana 1) | `/auth/*`, `/me`, `requireAuth` |
| CRUD de workspaces | ✅ | `GET/POST /workspaces`, `GET/PATCH/DELETE /workspaces/:id` |
| Aislamiento de datos | ✅ | `requireWorkspace` (404 sin revelar existencia); probado A↔B en el smoke |
| Storage de archivos | ✅ | `POST/GET /workspaces/:id/files`, `DELETE .../:fid`; bucket privado `workspace-files` |
| Límites por plan | ✅ | `plans/limites.js`: workspaces, storage por cuenta (MB decimales), tamaño y tipo de archivo |
| Endpoints del dashboard | ✅ | `GET /workspaces/:id/dashboard` (resumen + métricas; acciones/riesgos si Pro) |
| Métricas manuales | ✅ | `GET/POST /workspaces/:id/metrics`, conversión calculada |
| Acciones del dashboard | ✅ | `GET/PATCH /workspaces/:id/actions/:aid` (estado pendiente/en_curso/hecha) |
| Preparar la capa de IA | ✅ | `ia/contexto.js`: `armarContexto(workspaceId)` + `contextoSuficiente(ws)` |

Reglas de Semana 2 implementadas: contexto mínimo obligatorio al crear;
validaciones de largo (nombre 2-80, ciudad 2-100, oferta/cliente 10-500,
nota 2-100, "otro" exige nota); `objetivo90d` incluye `clientes`; eliminación
lógica que libera cupo y storage; **1 análisis activo por cuenta** bloquea editar
y eliminar (`409 analisis_activo`); enteros no negativos en contadores; importes
con moneda; conversión = `pedidos/consultas×100` solo si consultas > 0;
liberar cupo al borrar un workspace permite crear otro.

## Dependencias que pedía Matu (§05)

- **Versión funcional + entorno de pruebas** → backend corriendo (`npm run dev`)
  contra el Supabase del proyecto. Script `backend/scripts/smoke-semana2.mjs`
  crea usuarios de prueba, ejecuta todos los flujos y los borra.
- **Cuenta de prueba con permisos** → el registro es abierto; QA puede crear las
  que necesite (`POST /auth/register`). El smoke deja la base limpia.
- **Tiempo máximo de análisis** → `IA_TIMEOUT_MS` en `.env` (default 60000);
  al agotarse, el análisis queda en estado `fallida` (se cablea en Semana 3).

## Resultado del smoke (`node scripts/smoke-semana2.mjs`)

`22 ok, 2 fallan` — las 2 fallas son la carga de métricas, que necesita la
**migración del schema** (`metrics.currency`). Ver abajo.

## Pendiente / a hacer

1. **Re-correr `backend/db/schema.sql`** en el SQL Editor de Supabase (trae la
   base al esquema congelado de Semana 2: `metrics.currency`,
   `analyses.consume_cupo`, `objective_90d = 'clientes'`, checks nuevos, 2 planes).
   Después: `npm run db:check` (→ `planes: 2`) y el smoke pasa 24/24.
2. **Semana 3:** `POST /workspaces/:id/analyze` + `GET .../analyses` con Gemini
   (`src/ia/`), extracción de texto de archivos, Instagram (dataset simulado),
   `POST /subscription/activate-demo`.
3. Instagram real y refresh-token automático quedan fuera del MVP / para después.
