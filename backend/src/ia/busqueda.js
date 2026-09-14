import { buscarWeb, braveConfigurado } from './brave.js';

// Investigación web para el análisis (Paso 6/Semana 3, retomado con Brave).
// Regla (Matu §8.2): buscar con país + ciudad + categoría, para no sacar
// conclusiones globales de un negocio local. Si falla o no hay key, se
// declara la limitación y el análisis sigue sin evidencia externa — nunca
// bloquea el flujo (CU-S2-10).
export async function buscarEvidenciaParaWorkspace(ws) {
  if (!braveConfigurado()) {
    return { ok: false, resultados: [], motivo: 'sin_configurar' };
  }
  const partes = [ws.category, ws.city, ws.country].filter(Boolean);
  if (partes.length === 0) {
    return { ok: false, resultados: [], motivo: 'sin_datos_para_buscar' };
  }
  const consulta = `tendencias y consejos para negocios de ${partes.join(' en ')}`;

  try {
    const resultados = await buscarWeb(consulta, { count: 4 });
    return { ok: true, resultados, consulta };
  } catch (e) {
    // Nunca tira: el análisis sigue sin evidencia externa.
    return { ok: false, resultados: [], motivo: e.codigo ?? 'error', error: e.message };
  }
}
