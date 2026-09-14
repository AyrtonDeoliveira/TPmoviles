import { fileURLToPath } from 'node:url';
import { generarTexto, iaConfigurada } from './gemini.js';

// Chequeo real del proveedor de IA (Semana 3, Paso 1): una llamada simple,
// sin tocar workspaces ni cuotas. Se usa como npm run ia:check y GET /health/ia.
export async function checkIa() {
  if (!iaConfigurada()) {
    return { ok: false, motivo: 'sin_configurar' };
  }
  try {
    const { texto, modelo } = await generarTexto('Respondé únicamente con la palabra: OK');
    return { ok: true, modelo, respuesta: texto.trim().slice(0, 200) };
  } catch (e) {
    return { ok: false, motivo: 'llamada_fallo', error: e.message };
  }
}

const ejecutadoDirecto = process.argv[1] === fileURLToPath(import.meta.url);
if (ejecutadoDirecto) {
  checkIa().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exitCode = r.ok ? 0 : 1;
  });
}
