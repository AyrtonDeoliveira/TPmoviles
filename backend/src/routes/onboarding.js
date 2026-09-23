import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { asyncHandler, enviarError } from '../lib/respuestas.js';
import { validarTexto } from '../lib/validar.js';
import { IaError } from '../ia/gemini.js';
import { sugerirNombres, proyectarTresMeses } from '../ia/onboarding.js';

export const onboardingRouter = Router();

onboardingRouter.use(requireAuth);

// Traduce errores de la IA a respuestas que el front puede mostrar tal cual.
function responderErrorIa(res, e) {
  if (!(e instanceof IaError)) throw e;
  if (e.codigo === 'limite_ia') {
    return enviarError(res, 503, 'ia_ocupada', 'La IA está sin cupo por el momento. Probá de nuevo en unos minutos.');
  }
  console.warn('[onboarding] IA falló:', e.codigo, e.message);
  return enviarError(res, 502, 'ia_fallo', 'La IA no pudo responder ahora. Probá de nuevo en unos segundos.');
}

// POST /onboarding/nombres  { idea, evitar?: string[] }
// Sugiere 5 nombres para una idea (paso "todavía no tengo nombre").
onboardingRouter.post(
  '/nombres',
  asyncHandler(async (req, res) => {
    const idea = validarTexto(req.body?.idea, { campo: 'La idea', min: 10, max: 500 });
    if (!idea.ok) return enviarError(res, 400, 'idea_invalida', idea.mensaje);
    const evitar = Array.isArray(req.body?.evitar) ? req.body.evitar.map(String).slice(0, 30) : [];

    try {
      res.json({ nombres: await sugerirNombres(idea.valor, evitar) });
    } catch (e) {
      responderErrorIa(res, e);
    }
  })
);

// POST /onboarding/proyeccion/:workspaceId
// Estimación orientativa (rangos) de ventas y seguidores a 3 meses, a partir
// del contexto del proyecto y de las ventas acumuladas cargadas (métrica "pedidos").
onboardingRouter.post(
  '/proyeccion/:workspaceId',
  requireWorkspace,
  asyncHandler(async (req, res) => {
    const ws = req.workspace;
    const db = getSupabase();

    let ventasHastaHoy = null;
    if (ws.stage !== 'idea') {
      const { data } = await db
        .from('metrics')
        .select('value')
        .eq('workspace_id', ws.id)
        .eq('metric_type', 'pedidos')
        .eq('status', 'ok')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      ventasHastaHoy = data?.value != null ? Number(data.value) : null;
    }

    const contexto = {
      etapa: ws.stage === 'idea' ? 'idea' : 'empezado',
      pais: ws.country,
      ciudad: ws.city,
      categoria: ws.category,
      descripcion: ws.offer,
      publicoObjetivo: ws.target_audience,
      ventasAcumuladasHastaHoy: ventasHastaHoy,
      tieneInstagram: Boolean(ws.instagram_handle),
      tieneSitioWeb: Boolean(ws.website_url),
    };

    try {
      const proyeccion = await proyectarTresMeses(contexto);
      res.json({
        proyeccion,
        advertencia: 'Estimación orientativa generada con IA a partir de lo que cargaste. No es una garantía de resultados.',
      });
    } catch (e) {
      responderErrorIa(res, e);
    }
  })
);
