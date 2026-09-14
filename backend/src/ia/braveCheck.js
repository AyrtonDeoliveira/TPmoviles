import { fileURLToPath } from 'node:url';
import { buscarWeb, braveConfigurado } from './brave.js';

// Chequeo real de Brave Search: npm run brave:check / GET /health/brave.
export async function checkBrave() {
  if (!braveConfigurado()) {
    return { ok: false, motivo: 'sin_configurar' };
  }
  try {
    const resultados = await buscarWeb('café de especialidad Córdoba Argentina', { count: 2 });
    return { ok: true, resultados: resultados.length, ejemplo: resultados[0]?.titulo ?? null };
  } catch (e) {
    return { ok: false, motivo: e.codigo ?? 'error', error: e.message };
  }
}

const ejecutadoDirecto = process.argv[1] === fileURLToPath(import.meta.url);
if (ejecutadoDirecto) {
  checkBrave().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exitCode = r.ok ? 0 : 1;
  });
}
