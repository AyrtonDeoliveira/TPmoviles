import { Router } from 'express';
import { config } from '../config.js';
import { checkDb } from '../db/check.js';
import { supabaseConfigurado } from '../db/supabase.js';
import { checkIa } from '../ia/check.js';
import { iaConfigurada } from '../ia/gemini.js';
import { checkBrave } from '../ia/braveCheck.js';
import { braveConfigurado } from '../ia/brave.js';

export const healthRouter = Router();

const arrancadoEn = new Date();

// GET /health — estado del backend
healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'backend-mvp',
    entorno: config.entorno,
    supabaseConfigurado: supabaseConfigurado(),
    iaConfigurada: iaConfigurada(),
    braveConfigurado: braveConfigurado(),
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

// GET /health/ia — chequeo real del proveedor de IA (una llamada simple)
healthRouter.get('/ia', async (req, res) => {
  const resultado = await checkIa();
  res.status(resultado.ok ? 200 : 503).json(resultado);
});

// GET /health/brave — chequeo real de la búsqueda web
healthRouter.get('/brave', async (req, res) => {
  const resultado = await checkBrave();
  res.status(resultado.ok ? 200 : 503).json(resultado);
});
