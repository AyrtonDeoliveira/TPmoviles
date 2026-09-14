import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { asyncHandler, enviarError } from '../lib/respuestas.js';

export const actionsRouter = Router({ mergeParams: true });

const ESTADOS = ['pendiente', 'en_curso', 'hecha'];

function serializar(a) {
  return {
    id: a.id,
    titulo: a.title,
    motivo: a.reason,
    impacto: a.impact,
    esfuerzo: a.effort,
    metrica: a.target_metric,
    estado: a.status,
    orden: a.position,
    analisisId: a.analysis_id,
  };
}

// GET /workspaces/:id/actions — acciones del último análisis (o todas).
actionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const { data, error } = await db
      .from('actions')
      .select('*')
      .eq('workspace_id', req.workspace.id)
      .order('position', { ascending: true });
    if (error) throw error;
    res.json({ acciones: data.map(serializar) });
  })
);

// PATCH /workspaces/:id/actions/:actionId — cambia el estado (pendiente/en_curso/hecha).
actionsRouter.patch(
  '/:actionId',
  asyncHandler(async (req, res) => {
    const estado = String(req.body?.estado ?? '').trim();
    if (!ESTADOS.includes(estado)) {
      return enviarError(res, 400, 'estado_invalido', `estado debe ser: ${ESTADOS.join(', ')}.`);
    }
    const db = getSupabase();
    const { data, error } = await db
      .from('actions')
      .update({ status: estado })
      .eq('id', req.params.actionId)
      .eq('workspace_id', req.workspace.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return enviarError(res, 404, 'no_encontrado', 'Acción no encontrada.');
    res.json({ accion: serializar(data) });
  })
);
