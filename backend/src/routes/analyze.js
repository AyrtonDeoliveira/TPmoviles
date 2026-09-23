import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { asyncHandler, enviarError } from '../lib/respuestas.js';
import { armarContexto, contextoSuficiente } from '../ia/contexto.js';
import { generarAnalisisEstructurado } from '../ia/analisis.js';
import { buscarEvidenciaParaWorkspace } from '../ia/busqueda.js';
import { getPlanDeUsuario, hayAnalisisActivo, analisisCompletosEsteMes, limiteAnalisisMensual } from '../plans/limites.js';
import { construirEntregaAnalisis } from '../lib/entregaAnalisis.js';

export const analyzeRouter = Router({ mergeParams: true });

function esPlanPro(plan) {
  return (plan.features?.analisis_completo ?? plan.plan_id === 'pro') === true;
}

// POST /workspaces/:id/analyze
// Sincrónico: procesa la llamada a la IA dentro del mismo request (toma unos
// segundos). El registro en 'analyses' se crea en estado 'procesando' ANTES
// de llamar a la IA, para que el lock de "1 análisis activo por cuenta" sea
// visible desde el primer instante a otros pedidos concurrentes.
analyzeRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const ws = req.workspace;

    const { suficiente, faltan } = contextoSuficiente(ws);
    if (!suficiente) {
      return res.status(400).json({
        error: 'Falta completar el contexto del emprendimiento antes de analizar.',
        codigo: 'contexto_insuficiente',
        faltan,
      });
    }

    if (await hayAnalisisActivo(req.usuario.id)) {
      return enviarError(res, 409, 'analisis_activo', 'Ya hay un análisis en curso en tu cuenta. Esperá a que termine.');
    }

    const plan = await getPlanDeUsuario(req.usuario.id);
    const usados = await analisisCompletosEsteMes(req.usuario.id);
    const limite = limiteAnalisisMensual(plan);
    if (limite !== null && usados >= limite) {
      return res.status(403).json({
        error: `Llegaste al límite de ${limite} análisis de este mes. Se renueva el 1º del próximo mes.`,
        codigo: 'limite_plan',
        limite,
        sugerencia: plan.plan_id === 'pro' ? null : 'activar_pro',
      });
    }

    // Crear el registro "en curso" antes de llamar a la IA.
    const alta = await db
      .from('analyses')
      .insert({ workspace_id: ws.id, requested_by: req.usuario.id, status: 'procesando', objective: ws.objective_90d })
      .select('*')
      .single();
    if (alta.error) throw alta.error;
    const analysisId = alta.data.id;

    // Defensa contra condición de carrera: si dos pedidos pasaron el chequeo
    // de "1 activo por cuenta" casi al mismo tiempo, cancelo el que perdió.
    const concurrentes = await db
      .from('analyses')
      .select('id, created_at, workspaces!inner(owner_user_id)')
      .in('status', ['pendiente', 'procesando'])
      .eq('workspaces.owner_user_id', req.usuario.id)
      .order('created_at', { ascending: true });
    if ((concurrentes.data?.length ?? 0) > 1 && concurrentes.data[0].id !== analysisId) {
      await db
        .from('analyses')
        .update({ status: 'fallida', error: 'Cancelado: ya había otro análisis en curso en la cuenta.', consume_cupo: false, completed_at: new Date().toISOString() })
        .eq('id', analysisId);
      return enviarError(res, 409, 'analisis_activo', 'Ya hay un análisis en curso en tu cuenta. Esperá a que termine.');
    }

    let resultado;
    try {
      const contexto = await armarContexto(ws.id);
      // Investigación web (Paso 6): si falla o no hay key, sigue sin ella
      // (limitación declarada, nunca bloquea el análisis).
      const busqueda = await buscarEvidenciaParaWorkspace(ws);
      contexto.evidenciaExterna = busqueda.resultados;
      resultado = await generarAnalisisEstructurado(contexto);
    } catch (e) {
      await db
        .from('analyses')
        .update({ status: 'fallida', error: e.message.slice(0, 500), consume_cupo: false, completed_at: new Date().toISOString() })
        .eq('id', analysisId);
      // Sin cupo/rate limit de Gemini: es transitorio, se le dice al usuario que reintente en un rato.
      if (e.codigo === 'limite_ia') {
        return res.status(503).json({
          error: 'La IA está sin cupo por el momento. Probá de nuevo en unos minutos.',
          codigo: 'ia_ocupada',
          analisisId: analysisId,
        });
      }
      return res.status(502).json({ error: 'No se pudo generar el análisis. Podés reintentar.', codigo: 'analisis_fallo', analisisId: analysisId });
    }

    if (!resultado.ok) {
      await db
        .from('analyses')
        .update({
          status: 'fallida',
          error: `Validación de salida: ${(resultado.errores ?? []).join('; ')}`.slice(0, 500),
          consume_cupo: false,
          completed_at: new Date().toISOString(),
        })
        .eq('id', analysisId);
      return res.status(502).json({ error: 'La IA no devolvió un resultado válido. Podés reintentar.', codigo: 'analisis_fallo', analisisId: analysisId });
    }

    const r = resultado.resultado;
    const actualizado = await db
      .from('analyses')
      .update({
        status: 'completada',
        context_quality: r.calidad_contexto,
        result: r,
        projection: r.escenario_90_dias,
        sources: r.fuentes ?? [],
        model: resultado.modelo,
        consume_cupo: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', analysisId)
      .select('*')
      .single();
    if (actualizado.error) throw actualizado.error;

    // Las 3 acciones quedan ligadas a este análisis.
    let acciones = [];
    const filas = (r.acciones_30_dias ?? []).map((a, i) => ({
      workspace_id: ws.id,
      analysis_id: analysisId,
      title: a.accion,
      reason: a.motivo,
      impact: a.impacto,
      effort: a.esfuerzo,
      target_metric: a.metrica,
      position: i + 1,
    }));
    if (filas.length) {
      const ins = await db.from('actions').insert(filas).select('*');
      if (!ins.error) acciones = ins.data;
    }

    res.status(201).json({ analisis: construirEntregaAnalisis(actualizado.data, { esPro: esPlanPro(plan), acciones }) });
  })
);
