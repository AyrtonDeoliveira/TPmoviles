import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, enviarError } from '../lib/respuestas.js';

export const subscriptionRouter = Router();

// El plan pertenece a la CUENTA (no a un workspace puntual) — sección 6/CU-S2-12.
subscriptionRouter.use(requireAuth);

const PLANES_ACTIVABLES = ['pro'];

function serializar(s) {
  return {
    planId: s.plan_id,
    estado: s.status,
    simulada: s.is_simulated,
    desde: s.started_at,
  };
}

// POST /subscription/activate-demo  { planId: "pro" }
// Pago simulado, sin datos bancarios. Idempotente: repetirlo no crea
// duplicados ni reinicia la fecha si ya estaba en ese plan (CU-S2-12).
// No hay pantalla de baja en esta entrega (Semana 2, congelado).
subscriptionRouter.post(
  '/activate-demo',
  asyncHandler(async (req, res) => {
    const planId = String(req.body?.planId ?? '').trim();
    if (!PLANES_ACTIVABLES.includes(planId)) {
      return enviarError(res, 400, 'plan_invalido', `planId debe ser: ${PLANES_ACTIVABLES.join(', ')}.`);
    }

    const db = getSupabase();
    const actual = await db
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.usuario.id)
      .eq('status', 'active')
      .maybeSingle();
    if (actual.error) throw actual.error;

    // Ya está en ese plan: no-op idempotente, no se toca la fecha de alta.
    if (actual.data?.plan_id === planId) {
      return res.json({ suscripcion: serializar(actual.data) });
    }

    let fila;
    if (actual.data) {
      const upd = await db
        .from('subscriptions')
        .update({ plan_id: planId, is_simulated: true, started_at: new Date().toISOString(), current_period_end: null })
        .eq('id', actual.data.id)
        .select('*')
        .single();
      if (upd.error) throw upd.error;
      fila = upd.data;
    } else {
      // Defensivo: debería existir siempre (la crea handle_new_user al registrarse).
      const ins = await db
        .from('subscriptions')
        .insert({ user_id: req.usuario.id, plan_id: planId, status: 'active', is_simulated: true })
        .select('*')
        .single();
      if (ins.error) throw ins.error;
      fila = ins.data;
    }

    res.json({ suscripcion: serializar(fila) });
  })
);
