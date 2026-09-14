import { config } from '../config.js';

// Cliente mínimo de Brave Search API. Probado en crudo: funciona bien y
// devuelve título, url, fecha (page_age) y fragmentos por resultado.
const BASE = 'https://api.search.brave.com/res/v1/web/search';

export class BraveError extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.name = 'BraveError';
    this.codigo = codigo;
  }
}

export function braveConfigurado() {
  return Boolean(config.brave.apiKey);
}

// Devuelve resultados ya normalizados: { titulo, url, fecha, fragmento }.
// `count` máximo razonable para no inflar el prompt (Brave admite hasta 20).
export async function buscarWeb(consulta, { count = 4, timeoutMs = config.brave.timeoutMs } = {}) {
  if (!braveConfigurado()) {
    throw new BraveError('BRAVE_API_KEY no está configurada.', 'sin_configurar');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    const url = `${BASE}?q=${encodeURIComponent(consulta)}&count=${count}`;
    res = await fetch(url, {
      headers: { Accept: 'application/json', 'X-Subscription-Token': config.brave.apiKey },
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new BraveError(`Tiempo de espera agotado (${timeoutMs} ms) llamando a Brave.`, 'timeout');
    throw new BraveError(`No se pudo conectar con Brave: ${e.message}`, 'red');
  } finally {
    clearTimeout(timer);
  }

  const cuerpo = await res.text();
  let json;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    throw new BraveError(`Brave devolvió una respuesta no-JSON (status ${res.status}).`, 'respuesta_invalida');
  }
  if (!res.ok) {
    const msg = json?.message || `HTTP ${res.status}`;
    throw new BraveError(`Brave respondió con error: ${msg}`, res.status === 429 ? 'limite_brave' : 'error_brave');
  }

  const resultados = (json?.web?.results ?? []).slice(0, count).map((r) => ({
    titulo: r.title ?? '',
    url: r.url ?? '',
    fecha: r.page_age ?? r.age ?? null,
    fragmento: (r.description ?? '').replace(/<\/?strong>/g, '').slice(0, 300),
  }));
  return resultados;
}
