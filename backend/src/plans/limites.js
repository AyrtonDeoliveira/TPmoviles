import { getSupabase } from '../db/supabase.js';

// Límites de cada plan definidos desde código (Paso 8).
// La fuente de verdad en runtime es la tabla `plans` de la DB; esto es el
// espejo/fallback y sirve para tener los números a la vista sin abrir la DB.
// Si cambian, actualizar también db/schema.sql (el INSERT de plans).
export const PLANES = {
  free: {
    id: 'free',
    name: 'Gratuito',
    price_cents: 0,
    price_annual_cents: null,
    max_workspaces: 1,
    max_collaborators_per_workspace: 0,
    max_storage_mb: 500,
    max_file_mb: 10,
    max_analyses_preview_monthly: 1,
    max_analyses_full_monthly: 0,
    max_searches_monthly: 0,
    history_months: 1,
    max_instagram_accounts: 1,
  },
  business: {
    id: 'business',
    name: 'Business',
    price_cents: 999,
    price_annual_cents: 9900,
    max_workspaces: 3,
    max_collaborators_per_workspace: 2,
    max_storage_mb: 5120,
    max_file_mb: 25,
    max_analyses_preview_monthly: null, // sin tope
    max_analyses_full_monthly: 15,
    max_searches_monthly: 15,
    history_months: 6,
    max_instagram_accounts: 3,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price_cents: 1999,
    price_annual_cents: 19900,
    max_workspaces: 10,
    max_collaborators_per_workspace: 5,
    max_storage_mb: 25600,
    max_file_mb: 50,
    max_analyses_preview_monthly: null,
    max_analyses_full_monthly: 50,
    max_searches_monthly: 50,
    history_months: 24,
    max_instagram_accounts: 10,
  },
};

export const PLAN_POR_DEFECTO = 'free';

// Plan efectivo del usuario: lee la vista user_current_plan (suscripción activa,
// o 'free' si no tiene). Devuelve el objeto de plan (mezcla DB + espejo).
export async function getPlanDeUsuario(userId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('user_current_plan')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { ...PLANES[PLAN_POR_DEFECTO], _fuente: 'fallback' };
  }
  return { ...PLANES[data.plan_id ?? PLAN_POR_DEFECTO], ...data, _fuente: 'db' };
}

// Chequeo genérico de límite. `limite` NULL/undefined = sin tope.
// Devuelve { permitido, limite, usoActual, restante }.
export function evaluarLimite(limite, usoActual) {
  if (limite === null || limite === undefined) {
    return { permitido: true, limite: null, usoActual, restante: null };
  }
  const restante = limite - usoActual;
  return { permitido: usoActual < limite, limite, usoActual, restante };
}

// Helpers concretos (se completan cuando exista el CRUD de workspaces en Semana 2).
export function puedeCrearWorkspace(plan, workspacesActuales) {
  return evaluarLimite(plan.max_workspaces, workspacesActuales);
}

export function puedeSubirArchivo(plan, { tamanioMb, storageUsadoMb }) {
  if (tamanioMb > plan.max_file_mb) {
    return { permitido: false, motivo: 'archivo_grande', max_file_mb: plan.max_file_mb };
  }
  const espacio = evaluarLimite(plan.max_storage_mb, storageUsadoMb + tamanioMb);
  return espacio.permitido
    ? { permitido: true }
    : { permitido: false, motivo: 'storage_lleno', max_storage_mb: plan.max_storage_mb };
}

export function puedeAnalisisCompleto(plan, analisisEsteMes) {
  return evaluarLimite(plan.max_analyses_full_monthly, analisisEsteMes);
}
