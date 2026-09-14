import { getSupabase } from '../db/supabase.js';
import { generarTexto } from './gemini.js';
import { armarPromptContextual } from './prompt.js';

// Arma el contexto de un emprendimiento para pasárselo a la IA (Paso 8 / Semana 3).
// SOLO usa datos de ese workspace: perfil declarado, métricas, archivos procesados
// y análisis previos. No mezcla datos de otros emprendimientos ni de otras cuentas.
// (La extracción de texto de archivos y la búsqueda web se agregan en Semana 3.)
export async function armarContexto(workspaceId) {
  const db = getSupabase();

  const { data: ws, error } = await db
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .is('deleted_at', null)
    .single();
  if (error || !ws) throw new Error('workspace inexistente o eliminado');

  const { data: metrics } = await db
    .from('metrics')
    .select('metric_type, value, currency, period_start, period_end, source, status')
    .eq('workspace_id', workspaceId)
    .order('recorded_at', { ascending: false });

  const { data: files } = await db
    .from('files')
    .select('id, name, mime_type, size_bytes, extracted_text, process_status')
    .eq('workspace_id', workspaceId)
    .eq('process_status', 'procesado');

  const { data: analisisPrevios } = await db
    .from('analyses')
    .select('id, created_at, objective, context_quality, result')
    .eq('workspace_id', workspaceId)
    .eq('status', 'completada')
    .order('created_at', { ascending: false })
    .limit(3);

  return {
    idioma: 'es',
    moneda: ws.currency ?? null,
    perfil: {
      nombre: ws.name,
      pais: ws.country,
      ciudad: ws.city,
      categoria: ws.category,
      etapa: ws.stage,
      oferta: ws.offer,
      clienteObjetivo: ws.target_audience,
      objetivo90d: ws.objective_90d,
      objetivo90dNota: ws.objective_90d_note,
      sitioWeb: ws.website_url,
      instagram: {
        handle: ws.instagram_handle,
        tipoCuenta: ws.instagram_account_type,
        conexion: ws.instagram_connection_status,
      },
      ventasActuales:
        ws.current_sales_value != null
          ? { valor: Number(ws.current_sales_value), periodo: ws.current_sales_period, moneda: ws.currency }
          : null,
    },
    metricas: (metrics ?? []).map((m) => ({
      tipo: m.metric_type,
      valor: m.value != null ? Number(m.value) : null,
      moneda: m.currency,
      periodo: { inicio: m.period_start, fin: m.period_end },
      origen: m.source, // manual | instagram | simulada — nunca atribuir manual a Instagram
      estado: m.status, // ok | sin_datos | permiso_faltante | error
    })),
    archivos: (files ?? []).map((f) => ({
      id: f.id,
      nombre: f.name,
      tipo: f.mime_type,
      textoExtraido: f.extracted_text ?? null, // se completa en Semana 3
    })),
    analisisPrevios: (analisisPrevios ?? []).map((a) => ({
      id: a.id,
      fecha: a.created_at,
      objetivo: a.objective,
      calidadContexto: a.context_quality,
      resumen: a.result?.resumen ?? null,
    })),
  };
}

// Paso 3 (Semana 3): primera respuesta contextual. Arma el contexto de ESE
// workspace nada más, arma el prompt delimitado y le pregunta a Gemini.
// Sirve para probar en aislamiento que la IA no mezcla emprendimientos.
export async function preguntarSobreWorkspace(workspaceId, pregunta) {
  const contexto = await armarContexto(workspaceId);
  const prompt = armarPromptContextual(contexto, pregunta);
  const { texto, modelo } = await generarTexto(prompt);
  return { contexto, texto, modelo };
}

// Evalúa si el contexto mínimo alcanza para analizar (CU-S2-10).
export function contextoSuficiente(ws) {
  const faltan = [];
  for (const [campo, val] of [
    ['nombre', ws.name],
    ['pais', ws.country],
    ['ciudad', ws.city],
    ['categoria', ws.category],
    ['etapa', ws.stage],
    ['oferta', ws.offer],
    ['clienteObjetivo', ws.target_audience],
    ['objetivo90d', ws.objective_90d],
  ]) {
    if (!val) faltan.push(campo);
  }
  return { suficiente: faltan.length === 0, faltan };
}
