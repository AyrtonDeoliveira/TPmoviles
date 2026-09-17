# Estado de Semana 3 — backend / Ayrton

Complemento de `docs/estado-semana-2-backend.md`. Cubre IA, análisis,
Instagram y paywall (Semana 3 de la guía), hecho paso a paso.

## Hecho — verificado con `node scripts/smoke-semana3.mjs`: **48/48**

| Paso | Qué | Endpoints / módulos |
|---|---|---|
| 1 | Integrar el proveedor de IA | Gemini (`ia/gemini.js`), `npm run ia:check`, `GET /health/ia` |
| 2-3 | Contexto por workspace + primera respuesta contextual | `ia/contexto.js` (`armarContexto`, `preguntarSobreWorkspace`) — probado aislado con 2 negocios distintos |
| 4 | Salida estructurada del análisis | `ia/esquemaAnalisis.js` (responseSchema de Gemini) + `ia/analisis.js` (1 reintento si falla la validación de negocio) |
| 5 | Endpoint real | `POST /workspaces/:id/analyze` — sincrónico, ~15-30 s, gate por plan, cuota mensual, 1 análisis activo por cuenta |
| 6 | Búsqueda web | **Brave Search API** (`ia/brave.js`, `ia/busqueda.js`) — se descartó el grounding nativo de Gemini (`google_search`, 429 en el free tier) |
| 7 | Instagram | Dataset simulado (`routes/instagram.js`, `lib/datasetInstagram.js`) — sin integración real con Meta, fuera de alcance del MVP |
| 8 | Historial | `GET /workspaces/:id/analyses` + `.../:analysisId` — recortado por plan |
| 9 | Paywall | `POST /subscription/activate-demo` — pago simulado, idempotente |
| 10 | Smoke test único | `scripts/smoke-semana3.mjs` |

## Decisiones tomadas en el camino

- **Proveedor de IA: Gemini**, modelo `gemini-3.6-flash` (el que yo tenía en mente,
  `gemini-2.0-flash`, ya estaba descontinuado al momento de integrar — Google lo
  confirma en el error de la API).
- **`fuentes` no se le pide "recitar" a la IA que invente**: el modelo solo cita
  como fuente lo que efectivamente viene en `evidenciaExterna` (resultados reales
  de Brave). Si Brave no está disponible, declara la limitación en vez de inventar.
- **1 análisis activo por cuenta**, con defensa contra condición de carrera
  (se cancela el que pierde si dos pedidos llegan casi juntos).
- **El gate por plan (Gratuito/Pro) vive en un solo lugar**: `lib/entregaAnalisis.js`,
  usado por `/analyze`, `/dashboard` y `/analyses` — no hay tres copias de esa lógica.
- **El paywall es idempotente de verdad**: actualiza la fila existente en
  `subscriptions` (hay un índice único "una activa por usuario"); reactivar el
  mismo plan no crea una fila nueva ni reinicia la fecha de alta.
- **Instagram y búsqueda web nunca bloquean el análisis** si no están disponibles
  (regla explícita de Matu, CU-S2-10).

## Cómo probarlo de cero

```bash
cd backend
npm install
cp .env.example .env
# completar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IA_API_KEY (Gemini)
# BRAVE_API_KEY es opcional (sin ella, el análisis sigue sin evidencia externa)
npm run db:check      # -> ok:true, planes:2
npm run dev            # otra terminal
```
```bash
cd backend
node scripts/smoke-semana3.mjs
```
Tarda ~30-40 s en total (la llamada a Gemini + Brave dentro del análisis).
Al final borra los usuarios de prueba que creó.

## Riesgo conocido: rate limits del free tier de Gemini

Corriendo varios tests seguidos en la misma sesión ya pegamos un `429`. El
smoke consolidado (`smoke-semana3.mjs`) hace **una sola llamada** a Gemini y
a Brave para todo el recorrido, así que es la forma más segura de probar todo
sin gastar cuota. Si Matu va a hacer QA manual con muchos análisis seguidos,
puede toparse con esto — espaciar las pruebas o, si se vuelve un problema real
antes del 23/09, evaluar un tier pago barato.

## Pendiente / fuera de alcance del MVP (a propósito)

Extracción de texto de archivos para el contexto de IA (hoy los archivos se
guardan pero no se leen), baja de plan, pago real, multiusuario, Instagram
real, varias cuentas de Instagram, exportaciones. Ver `docs/modelo-de-datos.md`.
