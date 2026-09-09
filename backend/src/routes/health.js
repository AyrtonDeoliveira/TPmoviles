import { Router } from 'express';
import { config } from '../config.js';
import { checkDb } from '../db/check.js';
import { supabaseConfigurado } from '../db/supabase.js';

export const healthRouter = Router();

const arrancadoEn = new Date();

// GET /health — estado del backend
healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'backend-mvp',
    entorno: config.entorno,
    supabaseConfigurado: supabaseConfigurado(),
    hora: new Date().toISOString(),
    arrancadoEn: arrancadoEn.toISOString(),
    uptimeSegundos: Math.round(process.uptime()),
  });
});

// GET /health/db — chequeo real de la base (lectura + escritura/relectura/borrado)
healthRouter.get('/db', async (req, res) => {
  try {
    const resultado = await checkDb();
    res.status(resultado.ok ? 200 : 503).json(resultado);
  } catch (err) {
    res.status(500).json({ ok: false, motivo: 'error_inesperado', error: err.message });
  }
});
