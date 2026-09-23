import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { asyncHandler, enviarError } from '../lib/respuestas.js';
import { validarEnteroNoNegativo, validarMonto } from '../lib/validar.js';

// mergeParams: para ver :workspaceId del router padre.
export const metricsRouter = Router({ mergeParams: true });

// Tipos de métrica manual (Semana 2, sección 5 + datos manuales).
const CONTADORES = ['consultas', 'clientes', 'pedidos', 'seguidores', 'alcance', 'interacciones', 'visitas_perfil', 'vistas'];
const IMPORTES = ['ventas_importe'];
const TIPOS_MANUALES = [...CONTADORES, ...IMPORTES];

function serializar(m) {
  return {
    id: m.id,
    tipo: m.metric_type,
    valor: m.value != null ? Number(m.value) : null,
    moneda: m.currency,
    periodo: { inicio: m.period_start, fin: m.period_end },
    origen: m.source,
    estado: m.status,
    registradoEn: m.recorded_at,
  };
}

// GET /workspaces/:id/metrics — últimas métricas del emprendimiento (una por tipo).
metricsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const { data, error } = await db
      .from('metrics')
      .select('*')
      .eq('workspace_id', req.workspace.id)
      .order('recorded_at', { ascending: false });
    if (error) throw error;

    const ultimaPorTipo = new Map();
    for (const m of data) if (!ultimaPorTipo.has(m.metric_type)) ultimaPorTipo.set(m.metric_type, m);
    const metricas = [...ultimaPorTipo.values()].map(serializar);

    // ?historial=1 -> además todos los registros (para graficar la evolución).
    const historial = req.query.historial === '1' ? data.slice(0, 500).map(serializar) : undefined;

    // Conversión calculada: pedidos / consultas × 100 (solo si consultas > 0).
    const consultas = metricas.find((x) => x.tipo === 'consultas' && x.estado === 'ok');
    const pedidos = metricas.find((x) => x.tipo === 'pedidos' && x.estado === 'ok');
    let conversion = null;
    if (consultas && pedidos) {
      conversion =
        consultas.valor > 0
          ? { valor: Math.round((pedidos.valor / consultas.valor) * 1000) / 10, calculable: true }
          : { valor: null, calculable: false, motivo: 'consultas_en_cero' };
    }

    res.json({ metricas, conversion, ...(historial ? { historial } : {}) });
  })
);

// POST /workspaces/:id/metrics — carga/corrige métricas manuales.
// body: { metricas: [{ tipo, valor, periodo: { inicio, fin }, moneda? }] }
metricsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const entrada = Array.isArray(req.body?.metricas) ? req.body.metricas : null;
    if (!entrada || entrada.length === 0) {
      return enviarError(res, 400, 'datos_invalidos', 'Enviá un arreglo "metricas".');
    }

    const filas = [];
    for (const [i, m] of entrada.entries()) {
      const tipo = String(m?.tipo ?? '').trim();
      if (!TIPOS_MANUALES.includes(tipo)) {
        return enviarError(res, 400, 'tipo_invalido', `metricas[${i}].tipo inválido: "${tipo}".`);
      }
      const esImporte = IMPORTES.includes(tipo);
      const v = esImporte
        ? validarMonto(m?.valor, `metricas[${i}].valor`)
        : validarEnteroNoNegativo(m?.valor, `metricas[${i}].valor`);
      if (!v.ok) return enviarError(res, 400, 'valor_invalido', v.mensaje);

      const inicio = m?.periodo?.inicio ? new Date(m.periodo.inicio) : null;
      const fin = m?.periodo?.fin ? new Date(m.periodo.fin) : null;
      if (!inicio || !fin || Number.isNaN(+inicio) || Number.isNaN(+fin) || inicio > fin) {
        return enviarError(res, 400, 'periodo_invalido', `metricas[${i}]: período inválido (inicio/fin).`);
      }
      if (esImporte && !m?.moneda) {
        return enviarError(res, 400, 'falta_moneda', `metricas[${i}]: los importes necesitan moneda.`);
      }

      filas.push({
        workspace_id: req.workspace.id,
        metric_type: tipo,
        value: v.valor,
        currency: esImporte ? String(m.moneda).trim().toUpperCase() : null,
        period_start: inicio.toISOString(),
        period_end: fin.toISOString(),
        source: 'manual',
        status: v.valor == null ? 'sin_datos' : 'ok',
      });
    }

    const db = getSupabase();
    const { data, error } = await db.from('metrics').insert(filas).select('*');
    if (error) throw error;
    res.status(201).json({ metricas: data.map(serializar) });
  })
);

// DELETE /workspaces/:id/metrics/:metricId
metricsRouter.delete(
  '/:metricId',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const { data, error } = await db
      .from('metrics')
      .delete()
      .eq('id', req.params.metricId)
      .eq('workspace_id', req.workspace.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) return enviarError(res, 404, 'no_encontrado', 'Métrica no encontrada.');
    res.json({ ok: true });
  })
);
