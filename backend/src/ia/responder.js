import { buscarWeb, braveConfigurado } from './brave.js';
import { generarTexto } from './gemini.js';
import { armarPromptConBusqueda } from './prompt.js';

// El "RAG" simple que se le ocurrió al grupo: Brave busca en la web y trae
// links + descripciones; esas descripciones se le pasan a Gemini como
// evidencia para que arme una respuesta formulada, citando de dónde salió
// cada dato. Es el mismo patrón que ya usa el análisis de un emprendimiento
// (ia/busqueda.js + ia/analisis.js), acá suelto para cualquier pregunta.
//
// Si Brave falla o no hay key, no corta: sigue y Gemini responde avisando
// que no pudo buscar en la web (mismo criterio que en el análisis real).
export async function responderConBusqueda(pregunta, { count = 5 } = {}) {
  let resultados = [];
  let busquedaOk = false;
  let motivoSinBusqueda = 'sin_configurar';

  if (braveConfigurado()) {
    try {
      resultados = await buscarWeb(pregunta, { count });
      busquedaOk = true;
    } catch (e) {
      motivoSinBusqueda = e.codigo ?? 'error';
    }
  }

  const prompt = armarPromptConBusqueda(pregunta, resultados);
  const { texto, modelo } = await generarTexto(prompt);

  return {
    respuesta: texto,
    modelo,
    busquedaOk,
    motivoSinBusqueda: busquedaOk ? undefined : motivoSinBusqueda,
    fuentes: resultados,
  };
}
