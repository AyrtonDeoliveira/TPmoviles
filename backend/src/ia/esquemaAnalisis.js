// Esquema de la salida estructurada del análisis (Matu §4.3, ajustado por
// Semana 2: exactamente 3 acciones, escenario cualitativo).
// Formato: Gemini responseSchema (subconjunto de OpenAPI 3.0).
//
// Nota: "metricas" NO se le pide al modelo — los valores reales ya están en
// la base (tabla metrics) y los sirve el backend directo. Pedirle al modelo
// que "recite" números es un riesgo de invención; el resto de los 9 campos
// sí los genera la IA a partir del contexto.
export const ESQUEMA_RESULTADO = {
  type: 'OBJECT',
  properties: {
    resumen: { type: 'STRING', description: '80 a 120 palabras: qué negocio es, etapa y situación principal.' },
    calidad_contexto: { type: 'STRING', enum: ['completo', 'parcial', 'insuficiente'] },
    fortalezas: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: { texto: { type: 'STRING' }, evidencia: { type: 'STRING' } },
        required: ['texto', 'evidencia'],
      },
    },
    riesgos: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: {
          texto: { type: 'STRING' },
          probabilidad: { type: 'STRING', enum: ['alta', 'media', 'baja'] },
          impacto: { type: 'STRING', enum: ['alto', 'medio', 'bajo'] },
          mitigacion: { type: 'STRING' },
        },
        required: ['texto', 'probabilidad', 'impacto', 'mitigacion'],
      },
    },
    oportunidades: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: { texto: { type: 'STRING' }, relevancia: { type: 'STRING' }, fuente: { type: 'STRING' } },
        required: ['texto', 'relevancia', 'fuente'],
      },
    },
    acciones_30_dias: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 3,
      description: 'Exactamente 3 acciones para los próximos 30 días.',
      items: {
        type: 'OBJECT',
        properties: {
          accion: { type: 'STRING' },
          motivo: { type: 'STRING' },
          impacto: { type: 'STRING', enum: ['alto', 'medio', 'bajo'] },
          esfuerzo: { type: 'STRING', enum: ['alto', 'medio', 'bajo'] },
          metrica: { type: 'STRING', description: 'Qué métrica observar para saber si funcionó.' },
        },
        required: ['accion', 'motivo', 'impacto', 'esfuerzo', 'metrica'],
      },
    },
    escenario_90_dias: {
      type: 'OBJECT',
      description: 'CUALITATIVO. Nunca porcentajes ni montos futuros.',
      properties: {
        nivel: { type: 'STRING', enum: ['bajo', 'base', 'alto'] },
        supuestos: { type: 'ARRAY', items: { type: 'STRING' } },
        limitaciones: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['nivel', 'supuestos', 'limitaciones'],
    },
    fuentes: {
      type: 'ARRAY',
      description: 'Vacío si no se usó evidencia externa (todavía no hay búsqueda web integrada).',
      items: {
        type: 'OBJECT',
        properties: {
          titulo: { type: 'STRING' },
          url: { type: 'STRING' },
          fecha: { type: 'STRING' },
          afirmacion: { type: 'STRING' },
        },
        required: ['titulo', 'afirmacion'],
      },
    },
    advertencias: {
      type: 'ARRAY',
      description: 'Límites, datos ausentes y que el resultado no es una garantía.',
      items: { type: 'STRING' },
    },
  },
  required: [
    'resumen',
    'calidad_contexto',
    'fortalezas',
    'riesgos',
    'oportunidades',
    'acciones_30_dias',
    'escenario_90_dias',
    'fuentes',
    'advertencias',
  ],
};

// Validación defensiva: aunque Gemini respete el schema, confirmamos las
// reglas de negocio no expresables en JSON Schema puro (largo del resumen,
// palabras prohibidas en la estimación).
export function validarResultado(json) {
  const errores = [];
  if (!json || typeof json !== 'object') return { ok: false, errores: ['la salida no es un objeto'] };

  const palabras = String(json.resumen ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (palabras < 40 || palabras > 160) {
    errores.push(`resumen fuera de rango (${palabras} palabras; se esperaban ~80-120)`);
  }
  for (const campo of ['fortalezas', 'riesgos', 'oportunidades']) {
    if (!Array.isArray(json[campo]) || json[campo].length !== 3) {
      errores.push(`${campo} debe tener exactamente 3 elementos`);
    }
  }
  if (!Array.isArray(json.acciones_30_dias) || json.acciones_30_dias.length !== 3) {
    errores.push('acciones_30_dias debe tener exactamente 3 elementos');
  }
  const prohibidas = /\b\d+%|garantizad|asegurad|vas a lograr|seguro que/i;
  const textoEscenario = JSON.stringify(json.escenario_90_dias ?? {});
  if (prohibidas.test(textoEscenario)) {
    errores.push('el escenario_90_dias contiene porcentajes o lenguaje de garantía (debe ser cualitativo)');
  }

  return { ok: errores.length === 0, errores };
}
