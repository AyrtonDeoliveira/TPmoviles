import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { asyncHandler, enviarError } from '../lib/respuestas.js';
import { validarTexto, validarEnum } from '../lib/validar.js';
import { generarMetricasSimuladas } from '../lib/datasetInstagram.js';

export const instagramRouter = Router({ mergeParams: true });

const TIPOS_CUENTA = ['personal', 'profesional'];

function serializarEstado(ws) {
  return {
    conectado: ws.instagram_connection_status === 'conectada',
    handle: ws.instagram_handle,
    tipoCuenta: ws.instagram_account_type,
    estado: ws.instagram_connection_status,
  };
}

// GET /workspaces/:id/instagram — estado actual de la conexión.
instagramRouter.get('/', (req, res) => {
  res.json(serializarEstado(req.workspace));
});

// POST /workspaces/:id/instagram/connect  { handle, tipoCuenta }
// CU-S2-09: cuenta profesional -> "conectada" + dataset simulado de métricas.
// Cuenta personal / sin especificar -> se explica la limitación y se ofrece
// carga manual (no se generan métricas).
instagramRouter.post(
  '/connect',
  asyncHandler(async (req, res) => {
    const handle = validarTexto(req.body?.handle, { campo: 'El usuario de Instagram', min: 1, max: 100 });
    if (!handle.ok) return enviarError(res, 400, 'handle_invalido', handle.mensaje);

    const tipo = validarEnum(req.body?.tipoCuenta, TIPOS_CUENTA, 'El tipo de cuenta');
    if (!tipo.ok) return enviarError(res, 400, 'tipo_invalido', tipo.mensaje);

    const db = getSupabase();

    if (tipo.valor === 'personal') {
      const { data, error } = await db
        .from('workspaces')
        .update({
          instagram_handle: handle.valor,
          instagram_account_type: 'personal',
          instagram_connection_status: 'permiso_faltante',
        })
        .eq('id', req.workspace.id)
        .select('*')
        .single();
      if (error) throw error;
      return res.status(200).json({
        ...serializarEstado(data),
        mensaje:
          'Instagram Insights solo funciona con cuentas profesionales (Business o Creator). ' +
          'Convertí la cuenta a profesional, o seguí cargando las métricas a mano.',
      });
    }

    // Cuenta profesional: se "conecta" y se cargan métricas simuladas para
    // la demo (sin integración real con la API de Meta, fuera de alcance del MVP).
    const upd = await db
      .from('workspaces')
      .update({ instagram_handle: handle.valor, instagram_account_type: 'profesional', instagram_connection_status: 'conectada' })
      .eq('id', req.workspace.id)
      .select('*')
      .single();
    if (upd.error) throw upd.error;

    const filas = generarMetricasSimuladas(req.workspace.id);
    const ins = await db.from('metrics').insert(filas).select('*');
    if (ins.error) throw ins.error;

    res.status(200).json({
      ...serializarEstado(upd.data),
      mensaje: 'Cuenta conectada. Se cargaron métricas de ejemplo (simuladas) para la demo.',
      metricas: ins.data.map((m) => ({
        tipo: m.metric_type,
        valor: Number(m.value),
        periodo: { inicio: m.period_start, fin: m.period_end },
        origen: m.source,
      })),
    });
  })
);

// POST /workspaces/:id/instagram/disconnect
instagramRouter.post(
  '/disconnect',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const { data, error } = await db
      .from('workspaces')
      .update({ instagram_handle: null, instagram_account_type: 'desconocido', instagram_connection_status: 'no_conectada' })
      .eq('id', req.workspace.id)
      .select('*')
      .single();
    if (error) throw error;
    // Las métricas ya cargadas quedan como historial; no se borran (igual que
    // al eliminar un archivo no se tocan los análisis anteriores).
    res.json(serializarEstado(data));
  })
);
