import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { asyncHandler } from '../lib/respuestas.js';
import { getPlanDeUsuario } from '../plans/limites.js';
import { construirEntregaAnalisis } from '../lib/entregaAnalisis.js';

export const dashboardRouter = Router({ mergeParams: true });

// GET /workspaces/:id/dashboard
// Pro: dashboard completo (resumen + 3 acciones + métricas + riesgos/oportunidades).
// Gratuito: solo la vista previa del último análisis, con `bloqueado: true`.
dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const ws = req.workspace;
    const plan = await getPlanDeUsuario(req.usuario.id);
    const esPro = (plan.features?.analisis_completo ?? plan.plan_id === 'pro') === true;

    // Último análisis completado.
    const { data: analisis } = await db
      .from('analyses')
      .select('*')
      .eq('workspace_id', ws.id)
      .eq('status', 'completada')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Métricas (última por tipo) + conversión.
    const { data: metRaw } = await db
      .from('metrics')
      .select('*')
      .eq('workspace_id', ws.id)
      .order('recorded_at', { ascending: false });
    const ultimaPorTipo = new Map();
    for (const m of metRaw ?? []) if (!ultimaPorTipo.has(m.metric_type)) ultimaPorTipo.set(m.metric_type, m);
    const metricas = [...ultimaPorTipo.values()].map((m) => ({
      tipo: m.metric_type,
      valor: m.value != null ? Number(m.value) : null,
      moneda: m.currency,
      periodo: { inicio: m.period_start, fin: m.period_end },
      origen: m.source,
      estado: m.status,
    }));

    if (!analisis) {
      return res.json({
        emprendimiento: { id: ws.id, nombre: ws.name },
        sinAnalisis: true,
        mensaje: 'Todavía no ejecutaste un análisis. Completá el contexto y analizá.',
        metricas,
      });
    }

    let acciones = [];
    if (esPro) {
      const { data } = await db
        .from('actions')
        .select('*')
        .eq('workspace_id', ws.id)
        .eq('analysis_id', analisis.id)
        .order('position', { ascending: true });
      acciones = data ?? [];
    }

    res.json({
      emprendimiento: { id: ws.id, nombre: ws.name },
      metricas,
      analisis: construirEntregaAnalisis(analisis, { esPro, acciones }),
    });
  })
);
