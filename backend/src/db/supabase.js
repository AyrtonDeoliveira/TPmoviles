import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Cliente de Supabase para el backend.
// Usa la SERVICE ROLE KEY: saltea RLS. Nunca exponer esta key al frontend.
// La autorización (user_id + workspace_id) la hace el backend en cada endpoint.

let cliente = null;

export function supabaseConfigurado() {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}

// La URL de la API de Supabase es https://<ref>.supabase.co
// (NO la del panel: https://supabase.com/dashboard/project/<ref>).
export function urlPareceApi() {
  const u = (config.supabase.url || '').trim();
  return /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)(\/|$)/i.test(u);
}

export function getSupabase() {
  if (!supabaseConfigurado()) {
    throw new Error(
      'Supabase no está configurado. Completá SUPABASE_URL y ' +
        'SUPABASE_SERVICE_ROLE_KEY en backend/.env (ver backend/README.md).'
    );
  }
  if (!urlPareceApi()) {
    throw new Error(
      `SUPABASE_URL no parece la URL de la API ("${config.supabase.url}"). ` +
        'Tiene que ser https://<ref>.supabase.co, no la del panel ' +
        '(https://supabase.com/dashboard/project/<ref>).'
    );
  }
  if (!cliente) {
    cliente = createClient(config.supabase.url.trim(), config.supabase.serviceRoleKey.trim(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}

// Cliente nuevo y sin estado, para operaciones de Auth (signUp / signInWithPassword).
// Se usa uno por request para no compartir sesión entre usuarios.
export function crearClienteAuth() {
  if (!supabaseConfigurado() || !urlPareceApi()) {
    throw new Error('Supabase no está configurado correctamente (ver backend/README.md).');
  }
  return createClient(config.supabase.url.trim(), config.supabase.serviceRoleKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
