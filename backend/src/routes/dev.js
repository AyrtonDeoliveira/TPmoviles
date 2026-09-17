import { Router } from 'express';
import { asyncHandler, enviarError } from '../lib/respuestas.js';
import { responderConBusqueda } from '../ia/responder.js';

// ⚠️ TEMPORAL — para que el front tenga algo real para probar mientras Lu
// arma las pantallas de verdad. Sin auth a propósito (la app todavía no
// tiene login). SACAR antes de la entrega / de tener el flujo real.
export const devRouter = Router();

// POST /dev/preguntar  { pregunta }
devRouter.post(
  '/preguntar',
  asyncHandler(async (req, res) => {
    const pregunta = String(req.body?.pregunta ?? '').trim();
    if (!pregunta) return enviarError(res, 400, 'falta_pregunta', 'Mandá una pregunta en el campo "pregunta".');

    const r = await responderConBusqueda(pregunta);
    res.json({
      respuesta: r.respuesta,
      modelo: r.modelo,
      fuentes: r.fuentes.map((f) => ({ titulo: f.titulo, url: f.url })),
    });
  })
);
