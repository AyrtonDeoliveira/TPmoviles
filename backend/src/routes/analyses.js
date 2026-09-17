import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { asyncHandler, enviarError } from '../lib/respuestas.js';
import { getPlanDeUsuario } from '../plans/limites.js';
import { construirEntregaAnalisis } from '../lib/entregaAnalisis.js';

export const analysesRouter = Router({ mergeParams: true });

function esPlanPro(plan) {
  return (plan.features?.analisis_completo ?? plan.plan_id === 'pro') === true;
}

// Trae las acciones de varios análisis de una sola consulta, agrupadas por analysis_id.
async function accionesPorAnalisis(db, analysisIds) {
  if (!analysisIds.length) return new Map();
  const { data } = await db.from('actions').select('*').in('analysis_id', analysisIds).order('position', { ascending: true });
  const mapa = new Map();
  for (const a of data ?? []) {
    if (!mapa.has(a.analysis_id)) mapa.set(a.analysis_id, []);
    mapa.get(a.analysis_id).push(a);
  }
  return mapa;
}

// GET /workspaces/:id/analyses — historial (CU-S2-14).
// Pro: últimos `plan.history_months` meses, todos. Gratuito: solo permite
// volver a la última vista previa (1 resultado), como fija la spec de Semana 2.
analysesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const ws = req.workspace;
    const plan = await getPlanDeUsuario(req.usuario.id);
    const esPro = esPlanPro(plan);

    let query = db
      .from('analyses')
      .select('*')
      .eq('workspace_id', ws.id)
      .eq('status', 'completada')
      .order('created_at', { ascending: false });

    if (esPro) {
      if (plan.history_months) {
        const desde = new Date();
        desde.setMonth(desde.getMonth() - plan.history_months);
        query = query.gte('created_at', desde.toISOString());
      }
    } else {
      query = query.limit(1);
    }

    const { data: analyses, error } = await query;
    if (error) throw error;

    const acciones = esPro ? await accionesPorAnalisis(db, analyses.map((a) => a.id)) : new Map();
    const items = analyses.map((a) => construirEntregaAnalisis(a, { esPro, acciones: acciones.get(a.id) ?? [] }));

    res.json({ analyses: items, limiteMeses: esPro ? plan.history_months : null });
  })
);

// GET /workspaces/:id/analyses/:analysisId — detalle histórico. No ejecuta IA
// ni consume cupo. Si es de otro workspace (o de uno eliminado), no hay acceso.
analysesRouter.get(
  '/:analysisId',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const ws = req.workspace;
    const plan = await getPlanDeUsuario(req.usuario.id);
    const esPro = esPlanPro(plan);

    const { data: analysis, error } = await db
      .from('analyses')
      .select('*')
      .eq('id', req.params.analysisId)
      .eq('workspace_id', ws.id)
      .eq('status', 'completada')
      .maybeSingle();
    if (error) throw error;
    if (!analysis) return enviarError(res, 404, 'no_encontrado', 'Análisis no encontrado.');

    let acciones = [];
    if (esPro) {
      const { data } = await db.from('actions').select('*').eq('analysis_id', analysis.id).order('position', { ascending: true });
      acciones = data ?? [];
    }
    res.json({ analisis: construirEntregaAnalisis(analysis, { esPro, acciones }) });
  })
);
