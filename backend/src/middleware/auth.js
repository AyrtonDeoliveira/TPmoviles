import { getSupabase } from '../db/supabase.js';
import { enviarError } from '../lib/respuestas.js';

// Middleware: exige un token válido en el header Authorization: Bearer <access_token>.
// Verifica el token contra Supabase Auth y deja el usuario en req.usuario.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return enviarError(res, 401, 'sin_token', 'Falta el token de autenticación.');
  }

  let db;
  try {
    db = getSupabase();
  } catch (e) {
    return enviarError(res, 503, 'sin_supabase', e.message);
  }

  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) {
    return enviarError(res, 401, 'token_invalido', 'Sesión inválida o expirada.');
  }

  req.usuario = { id: data.user.id, email: data.user.email };
  req.accessToken = token;
  next();
}
