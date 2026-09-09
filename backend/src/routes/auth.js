import { Router } from 'express';
import { crearClienteAuth, getSupabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, enviarError } from '../lib/respuestas.js';
import { validarEmail, validarPassword, validarNombre } from '../lib/validar.js';

export const authRouter = Router();

// Forma de la sesión que devolvemos al frontend.
function serializarSesion(session) {
  if (!session) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at, // epoch en segundos
  };
}

// POST /auth/register  { nombre, email, password }
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const nombre = validarNombre(req.body?.nombre);
    if (!nombre.ok) return enviarError(res, 400, 'nombre_invalido', nombre.mensaje);
    const email = validarEmail(req.body?.email);
    if (!email.ok) return enviarError(res, 400, 'email_invalido', email.mensaje);
    const password = validarPassword(req.body?.password);
    if (!password.ok) return enviarError(res, 400, 'password_invalida', password.mensaje);

    const auth = crearClienteAuth();

    // Creamos el usuario ya confirmado (el MVP no usa verificación por email).
    // El trigger handle_new_user crea el perfil en public.users + suscripción free.
    const alta = await auth.auth.admin.createUser({
      email: email.valor,
      password: password.valor,
      email_confirm: true,
      user_metadata: { full_name: nombre.valor },
    });

    if (alta.error) {
      const msg = alta.error.message || '';
      if (/already|registered|exists/i.test(msg)) {
        return enviarError(res, 409, 'email_en_uso', 'Ese email ya está registrado.');
      }
      return enviarError(res, 400, 'alta_falló', 'No se pudo crear la cuenta.');
    }

    // Iniciamos sesión para devolver tokens.
    const login = await auth.auth.signInWithPassword({
      email: email.valor,
      password: password.valor,
    });
    if (login.error) {
      return res.status(201).json({
        usuario: { id: alta.data.user.id, email: email.valor, nombre: nombre.valor },
        sesion: null,
        aviso: 'Cuenta creada, pero no se pudo iniciar sesión automáticamente. Probá login.',
      });
    }

    return res.status(201).json({
      usuario: { id: alta.data.user.id, email: email.valor, nombre: nombre.valor },
      sesion: serializarSesion(login.data.session),
    });
  })
);

// POST /auth/login  { email, password }
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = validarEmail(req.body?.email);
    const password = validarPassword(req.body?.password);
    // Error genérico: no revelar si el email existe (FR-01).
    if (!email.ok || !password.ok) {
      return enviarError(res, 401, 'credenciales_invalidas', 'Email o contraseña incorrectos.');
    }

    const auth = crearClienteAuth();
    const login = await auth.auth.signInWithPassword({
      email: email.valor,
      password: password.valor,
    });

    if (login.error || !login.data?.session) {
      return enviarError(res, 401, 'credenciales_invalidas', 'Email o contraseña incorrectos.');
    }

    return res.json({
      usuario: { id: login.data.user.id, email: login.data.user.email },
      sesion: serializarSesion(login.data.session),
    });
  })
);

// POST /auth/logout   (con Authorization: Bearer <accessToken>)
authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      await getSupabase().auth.admin.signOut(req.accessToken, 'global');
    } catch {
      // best-effort: si falla, el cliente igual descarta el token.
    }
    return res.json({ ok: true });
  })
);
