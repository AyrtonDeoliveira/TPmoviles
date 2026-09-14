import { getSupabase } from '../db/supabase.js';

// Unidades (Semana 2): decimal, NO binario.
export const BYTES_POR_MB = 1_000_000;
export const MB_POR_GB = 1_000;

// Límites de cada plan definidos desde código (Paso 8) — CONGELADO (Semana 2).
// La fuente de verdad en runtime es la tabla `plans`; esto es el espejo/fallback.
// Si cambian, actualizar también db/schema.sql (el INSERT de plans).
export const PLANES = {
  free: {
    id: 'free',
    name: 'Gratuito',
    price_cents: 0,
    max_workspaces: 1,
    max_storage_mb: 50,
    max_file_mb: 10,
    max_analyses_preview_monthly: 1,
    max_analyses_full_monthly: 0,
    history_months: 1,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price_cents: 999,
    max_workspaces: 5,
    max_storage_mb: 1000, // 1 GB = 1.000 MB
    max_file_mb: 10,
    max_analyses_preview_monthly: null, // incluida
    max_analyses_full_monthly: 20,
    history_months: 12,
  },
};

export const PLAN_POR_DEFECTO = 'free';

// Formatos de archivo admitidos (Semana 2).
export const FORMATOS_ARCHIVO = ['pdf', 'docx', 'txt', 'csv'];

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
export function evaluarLimite(limite, usoActual) {
  if (limite === null || limite === undefined) {
    return { permitido: true, limite: null, usoActual, restante: null };
  }
  return { permitido: usoActual < limite, limite, usoActual, restante: limite - usoActual };
}

export function puedeCrearWorkspace(plan, workspacesActuales) {
  return evaluarLimite(plan.max_workspaces, workspacesActuales);
}

// storageUsadoMb y tamanioMb en MB decimales.
export function puedeSubirArchivo(plan, { tamanioMb, storageUsadoMb, extension }) {
  if (extension && !FORMATOS_ARCHIVO.includes(String(extension).toLowerCase())) {
    return { permitido: false, motivo: 'formato_no_admitido', formatos: FORMATOS_ARCHIVO };
  }
  if (tamanioMb > plan.max_file_mb) {
    return { permitido: false, motivo: 'archivo_grande', max_file_mb: plan.max_file_mb };
  }
  const espacio = evaluarLimite(plan.max_storage_mb, storageUsadoMb + tamanioMb);
  return espacio.permitido
    ? { permitido: true }
    : { permitido: false, motivo: 'storage_lleno', max_storage_mb: plan.max_storage_mb };
}

// Solo consumen cuota los análisis completados y guardados (fallidos y re-consultas no).
export function puedeAnalisisCompleto(plan, analisisEsteMes) {
  return evaluarLimite(plan.max_analyses_full_monthly, analisisEsteMes);
}

// Regla Semana 2: 1 análisis activo (pendiente/procesando) por CUENTA.
export async function hayAnalisisActivo(userId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('analyses')
    .select('id, workspaces!inner(owner_user_id)')
    .in('status', ['pendiente', 'procesando'])
    .eq('workspaces.owner_user_id', userId)
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

// ---- Uso actual de la cuenta (para comparar contra los límites) ----

export async function contarWorkspacesActivos(userId) {
  const db = getSupabase();
  const { count } = await db
    .from('workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('owner_user_id', userId)
    .is('deleted_at', null);
  return count ?? 0;
}

// Bytes ocupados por los archivos de todos los workspaces activos del usuario.
export async function bytesUsados(userId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('files')
    .select('size_bytes, workspaces!inner(owner_user_id, deleted_at)')
    .eq('workspaces.owner_user_id', userId)
    .is('workspaces.deleted_at', null);
  if (error || !data) return 0;
  return data.reduce((acc, f) => acc + Number(f.size_bytes || 0), 0);
}

export function mbAmenosBytes(mb) {
  return Math.round(mb * BYTES_POR_MB);
}

// Análisis completos guardados este mes calendario (UTC) — para la cuota.
export async function analisisCompletosEsteMes(userId) {
  const db = getSupabase();
  const ahora = new Date();
  const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1)).toISOString();
  const { count } = await db
    .from('analyses')
    .select('id, workspaces!inner(owner_user_id)', { count: 'exact', head: true })
    .eq('workspaces.owner_user_id', userId)
    .eq('status', 'completada')
    .eq('consume_cupo', true)
    .gte('created_at', inicioMes);
  return count ?? 0;
}
