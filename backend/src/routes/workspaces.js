import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace, bloquearSiAnalisisActivo } from '../middleware/workspace.js';
import { asyncHandler, enviarError } from '../lib/respuestas.js';
import { validarContextoWorkspace } from '../lib/validar.js';
import {
  getPlanDeUsuario,
  puedeCrearWorkspace,
  contarWorkspacesActivos,
} from '../plans/limites.js';
import { metricsRouter } from './metrics.js';
import { filesRouter } from './files.js';
import { dashboardRouter } from './dashboard.js';
import { actionsRouter } from './actions.js';
import { analyzeRouter } from './analyze.js';
import { analysesRouter } from './analyses.js';
import { instagramRouter } from './instagram.js';

export const workspacesRouter = Router();

// Todo bajo /workspaces requiere sesión.
workspacesRouter.use(requireAuth);

// Forma pública de un workspace (API en camelCase).
function serializar(w) {
  return {
    id: w.id,
    nombre: w.name,
    pais: w.country,
    ciudad: w.city,
    categoria: w.category,
    etapa: w.stage,
    oferta: w.offer,
    clienteObjetivo: w.target_audience,
    objetivo90d: w.objective_90d,
    objetivo90dNota: w.objective_90d_note,
    sitioWeb: w.website_url,
    instagramHandle: w.instagram_handle,
    instagramEstado: w.instagram_connection_status,
    ventasActuales:
      w.current_sales_value != null
        ? { valor: Number(w.current_sales_value), periodo: w.current_sales_period, moneda: w.currency }
        : null,
    creadoEn: w.created_at,
    actualizadoEn: w.updated_at,
  };
}

// GET /workspaces — lista los emprendimientos activos del usuario.
workspacesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const { data, error } = await db
      .from('workspaces')
      .select('*')
      .eq('owner_user_id', req.usuario.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ workspaces: data.map(serializar) });
  })
);

// POST /workspaces — crea uno nuevo (valida contexto mínimo + límite del plan).
workspacesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const val = validarContextoWorkspace(req.body ?? {}, { modo: 'crear' });
    if (!val.ok) return res.status(400).json({ error: 'Datos incompletos.', codigo: 'datos_invalidos', detalles: val.errores });

    const plan = await getPlanDeUsuario(req.usuario.id);
    const usados = await contarWorkspacesActivos(req.usuario.id);
    const cupo = puedeCrearWorkspace(plan, usados);
    if (!cupo.permitido) {
      return res.status(403).json({
        error: `Llegaste al límite de ${cupo.limite} emprendimiento(s) de tu plan.`,
        codigo: 'limite_plan',
        limite: cupo.limite,
        sugerencia: plan.plan_id === 'pro' ? null : 'activar_pro',
      });
    }

    const db = getSupabase();
    const { data, error } = await db
      .from('workspaces')
      .insert({ ...val.datos, owner_user_id: req.usuario.id })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json({ workspace: serializar(data) });
  })
);

// GET /workspaces/:workspaceId — detalle (solo el dueño).
workspacesRouter.get(
  '/:workspaceId',
  requireWorkspace,
  (req, res) => res.json({ workspace: serializar(req.workspace) })
);

// PATCH /workspaces/:workspaceId — edita el contexto (bloqueado si hay análisis activo).
workspacesRouter.patch(
  '/:workspaceId',
  requireWorkspace,
  bloquearSiAnalisisActivo,
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    // Para la regla "otro exige nota" cuando solo se manda el objetivo:
    if (body.objetivo90d === 'otro' && body.objetivo90dNota === undefined && !req.workspace.objective_90d_note) {
      return enviarError(res, 400, 'datos_invalidos', 'Si el objetivo es "otro", hay que describirlo (objetivo90dNota).');
    }
    const val = validarContextoWorkspace(body, { modo: 'editar' });
    if (!val.ok) return res.status(400).json({ error: 'Datos inválidos.', codigo: 'datos_invalidos', detalles: val.errores });
    if (Object.keys(val.datos).length === 0) {
      return enviarError(res, 400, 'sin_cambios', 'No enviaste ningún campo para actualizar.');
    }

    const db = getSupabase();
    const { data, error } = await db
      .from('workspaces')
      .update(val.datos)
      .eq('id', req.workspace.id)
      .eq('owner_user_id', req.usuario.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ workspace: serializar(data) });
  })
);

// DELETE /workspaces/:workspaceId — eliminación lógica (libera cupo y storage).
workspacesRouter.delete(
  '/:workspaceId',
  requireWorkspace,
  bloquearSiAnalisisActivo,
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const { error } = await db
      .from('workspaces')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.workspace.id)
      .eq('owner_user_id', req.usuario.id);
    if (error) throw error;
    res.json({ ok: true });
  })
);

// Sub-recursos (todos validan pertenencia vía requireWorkspace).
workspacesRouter.use('/:workspaceId/metrics', requireWorkspace, metricsRouter);
workspacesRouter.use('/:workspaceId/files', requireWorkspace, filesRouter);
workspacesRouter.use('/:workspaceId/dashboard', requireWorkspace, dashboardRouter);
workspacesRouter.use('/:workspaceId/actions', requireWorkspace, actionsRouter);
workspacesRouter.use('/:workspaceId/analyze', requireWorkspace, analyzeRouter);
workspacesRouter.use('/:workspaceId/analyses', requireWorkspace, analysesRouter);
workspacesRouter.use('/:workspaceId/instagram', requireWorkspace, instagramRouter);
