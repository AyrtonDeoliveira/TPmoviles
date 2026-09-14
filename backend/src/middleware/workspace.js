import { getSupabase } from '../db/supabase.js';
import { enviarError } from '../lib/respuestas.js';

// Carga el workspace de la URL y valida que sea del usuario autenticado.
// Aislamiento: si no es suyo (o está eliminado, o no existe) → 404 sin revelar
// si existe. Deja el workspace en req.workspace.
export async function requireWorkspace(req, res, next) {
  const id = req.params.workspaceId;
  if (!id) return enviarError(res, 400, 'falta_workspace', 'Falta el id del emprendimiento.');

  const db = getSupabase();
  const { data, error } = await db
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .eq('owner_user_id', req.usuario.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return enviarError(res, 500, 'error_interno', 'No se pudo cargar el emprendimiento.');
  if (!data) return enviarError(res, 404, 'no_encontrado', 'Emprendimiento no encontrado.');

  req.workspace = data;
  next();
}

// Bloquea la operación si la cuenta tiene un análisis activo (Semana 2:
// 1 análisis activo por cuenta; además bloquea editar el contexto del que se analiza).
export async function bloquearSiAnalisisActivo(req, res, next) {
  const db = getSupabase();
  const { data, error } = await db
    .from('analyses')
    .select('id, workspace_id, status, workspaces!inner(owner_user_id)')
    .in('status', ['pendiente', 'procesando'])
    .eq('workspaces.owner_user_id', req.usuario.id)
    .limit(1);

  if (error) return next(); // ante la duda, no bloquear
  const activo = data?.[0];
  if (activo) {
    const mismo = req.workspace && activo.workspace_id === req.workspace.id;
    return enviarError(
      res,
      409,
      'analisis_activo',
      mismo
        ? 'Hay un análisis en curso de este emprendimiento. Vas a poder editar al terminar.'
        : 'Ya hay un análisis en curso en tu cuenta. Esperá a que termine.'
    );
  }
  next();
}
