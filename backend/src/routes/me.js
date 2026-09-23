import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/respuestas.js';
import { getPlanDeUsuario, bytesUsados, BYTES_POR_MB } from '../plans/limites.js';

export const meRouter = Router();

// GET /me   (con Authorization: Bearer <accessToken>)
// Devuelve el perfil (public.users) + el plan efectivo del usuario.
meRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const { id, email } = req.usuario;

    let { data: perfil } = await db
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('id', id)
      .single();

    // Defensa: si por algún motivo el trigger no creó el perfil, lo creamos ahora.
    if (!perfil) {
      const alta = await db
        .from('users')
        .upsert({ id, email }, { onConflict: 'id' })
        .select('id, email, full_name, created_at')
        .single();
      perfil = alta.data ?? { id, email, full_name: null };
    }

    const plan = await getPlanDeUsuario(id);
    const usadoBytes = await bytesUsados(id);

    return res.json({
      usuario: {
        id: perfil.id,
        email: perfil.email,
        nombre: perfil.full_name,
        creadoEn: perfil.created_at,
      },
      uso: {
        almacenamientoMb: usadoBytes / BYTES_POR_MB,
      },
      plan: {
        id: plan.plan_id ?? plan.id,
        nombre: plan.plan_name ?? plan.name,
        limites: {
          workspaces: plan.max_workspaces,
          almacenamientoMb: plan.max_storage_mb,
          archivoMaxMb: plan.max_file_mb,
          analisisPreviewMes: plan.max_analyses_preview_monthly,
          analisisCompletosMes: plan.max_analyses_full_monthly,
          historialMeses: plan.history_months,
        },
      },
    });
  })
);
