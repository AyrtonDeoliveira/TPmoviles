import { config } from '../config.js';

// Cliente mínimo de Gemini (Google Generative Language API) por REST directo,
// sin SDK. La key nunca sale del backend.
//
// Nota (2026-09): al llamar a generateContent con modelos viejos, Google
// devuelve un error recomendando pasar a su "Interactions API". Por ahora
// generateContent con gemini-3.6-flash sigue andando (probado); si en algún
// momento deja de funcionar, revisar la doc vigente de la Interactions API.
//
// Nota sobre búsqueda web (Paso 6, Semana 3): se probó `tools: [{ google_search: {} }]`
// y devuelve siempre 429 RESOURCE_EXHAUSTED en el free tier, mientras que una
// llamada normal (sin esa tool) anda perfecto. Conclusión: el grounding con
// búsqueda no está disponible en este plan gratuito. Por eso el análisis NO
// usa búsqueda externa: `fuentes` queda vacío y se declara la limitación en
// `advertencias` (permitido explícitamente por la spec de Matu, Semana 2).
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Error con un `codigo` estable para que las rutas decidan qué responder
// (p. ej. un 429 de cuota no es lo mismo que un error de validación).
export class IaError extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.name = 'IaError';
    this.codigo = codigo;
  }
}

export function iaConfigurada() {
  return Boolean(config.ia.apiKey);
}

async function llamarGenerateContent(prompt, { modelo, timeoutMs, generationConfig } = {}) {
  if (!iaConfigurada()) {
    throw new IaError('IA_API_KEY no está configurada (ver backend/.env.example).', 'sin_configurar');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${BASE}/models/${modelo}:generateContent?key=${encodeURIComponent(config.ia.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(generationConfig ? { generationConfig } : {}),
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new IaError(`Tiempo de espera agotado (${timeoutMs} ms) llamando a Gemini.`, 'timeout');
    }
    throw new IaError(`No se pudo conectar con Gemini: ${e.message}`, 'red');
  } finally {
    clearTimeout(timer);
  }

  const cuerpo = await res.text();
  let json;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    throw new IaError(`Gemini devolvió una respuesta no-JSON (status ${res.status}): ${cuerpo.slice(0, 200)}`, 'respuesta_invalida');
  }

  if (!res.ok) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    if (res.status === 429) {
      throw new IaError(`Gemini está sin cupo por ahora: ${msg}`, 'limite_ia');
    }
    throw new IaError(`Gemini respondió con error: ${msg}`, 'error_ia');
  }

  const candidato = json?.candidates?.[0];
  const texto = candidato?.content?.parts?.map((p) => p.text).join('') ?? '';
  if (!texto) {
    const motivo = candidato?.finishReason ? ` (finishReason: ${candidato.finishReason})` : '';
    throw new IaError(`Gemini no devolvió texto${motivo}.`, 'sin_texto');
  }
  return { texto, bruto: json };
}

// Genera texto libre a partir de un prompt.
export async function generarTexto(prompt, { modelo = config.ia.modelo, timeoutMs = config.ia.timeoutMs } = {}) {
  const { texto, bruto } = await llamarGenerateContent(prompt, { modelo, timeoutMs });
  return { texto, modelo, bruto };
}

// Genera una salida que cumple un JSON Schema (subconjunto de OpenAPI que
// entiende Gemini): responseMimeType 'application/json' + responseSchema.
// Devuelve el objeto ya parseado.
export async function generarJSON(prompt, schema, { modelo = config.ia.modelo, timeoutMs = config.ia.timeoutMs } = {}) {
  const { texto, bruto } = await llamarGenerateContent(prompt, {
    modelo,
    timeoutMs,
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
  });
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new IaError(`Gemini no devolvió JSON válido pese a responseSchema: ${texto.slice(0, 300)}`, 'json_invalido');
  }
  return { datos, modelo, bruto };
}
