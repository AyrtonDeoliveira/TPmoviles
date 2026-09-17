// Herramienta de prueba manual: le hace una búsqueda libre a Brave Search y
// muestra los resultados. Solo para probar la conexión a mano; no es parte
// de la API (la búsqueda real para el análisis vive en src/ia/busqueda.js).
//
// Uso:
//   node scripts/buscar-brave.mjs "cafeterías de especialidad en Córdoba"
//   node scripts/buscar-brave.mjs                 (usa una búsqueda de ejemplo)
import { buscarWeb } from '../src/ia/brave.js';

const consulta = process.argv.slice(2).join(' ') || 'tendencias de emprendimientos en Argentina 2026';

console.log(`\nBúsqueda: ${consulta}\n`);

try {
  const resultados = await buscarWeb(consulta, { count: 5 });
  if (resultados.length === 0) {
    console.log('Sin resultados.');
  }
  resultados.forEach((r, i) => {
    console.log(`${i + 1}. ${r.titulo}`);
    console.log(`   ${r.url}`);
    if (r.fecha) console.log(`   fecha: ${r.fecha}`);
    console.log(`   ${r.fragmento}`);
    console.log();
  });
} catch (e) {
  console.error('Error:', e.message);
  process.exitCode = 1;
}
