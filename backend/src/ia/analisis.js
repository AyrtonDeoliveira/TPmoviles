import { generarJSON } from './gemini.js';
import { armarPromptAnalisis } from './prompt.js';
import { ESQUEMA_RESULTADO, validarResultado } from './esquemaAnalisis.js';

// Genera el análisis estructurado a partir del contexto de UN workspace
// (armado con ia/contexto.js armarContexto). No toca la base de datos: solo
// genera y valida. Persistirlo es responsabilidad del endpoint /analyze
// (Paso 5).
//
// Reintenta una vez si la primera respuesta no cumple las reglas de negocio
// (aunque el responseSchema ya fuerza la forma, cosas como "exactamente 3"
// pueden fallar igual).
export async function generarAnalisisEstructurado(contexto) {
  let prompt = armarPromptAnalisis(contexto);

  let intento = await generarJSON(prompt, ESQUEMA_RESULTADO);
  let val = validarResultado(intento.datos);
  if (val.ok) {
    return { ok: true, resultado: intento.datos, modelo: intento.modelo, reintentos: 0 };
  }

  // Un reintento con la lista de errores explícita.
  const promptCorregido = [
    prompt,
    '',
    'IMPORTANTE: tu respuesta anterior no cumplió estas reglas, corregilas:',
    ...val.errores.map((e) => `- ${e}`),
  ].join('\n');
  intento = await generarJSON(promptCorregido, ESQUEMA_RESULTADO);
  val = validarResultado(intento.datos);

  return {
    ok: val.ok,
    resultado: intento.datos,
    modelo: intento.modelo,
    reintentos: 1,
    errores: val.ok ? undefined : val.errores,
  };
}
