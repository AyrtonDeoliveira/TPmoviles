// Prueba rápida de la idea del grupo: Brave busca en la web y Gemini arma
// la respuesta con esos resultados como evidencia (cita las fuentes).
//
// Uso:
//   node scripts/prueba.mjs "pregunta que tengamos"
//   npm run prueba -- "pregunta que tengamos"   (con npm hace falta el --)
import { responderConBusqueda } from '../src/ia/responder.js';

const pregunta = process.argv.slice(2).join(' ');
if (!pregunta) {
  console.log('Uso: node scripts/prueba.mjs "tu pregunta acá"');
  process.exit(1);
}

console.log(`\nPregunta: ${pregunta}\n`);
console.log('Buscando y generando la respuesta (unos segundos)...\n');

try {
  const r = await responderConBusqueda(pregunta);
  console.log(`Respuesta (${r.modelo}):\n`);
  console.log(r.respuesta);
  console.log();

  if (r.busquedaOk) {
    console.log(`Fuentes usadas (${r.fuentes.length}):`);
    r.fuentes.forEach((f, i) => console.log(`  ${i + 1}. ${f.titulo} — ${f.url}`));
  } else {
    console.log(`(Se respondió sin búsqueda web: ${r.motivoSinBusqueda})`);
  }
  console.log();
} catch (e) {
  console.error('Error:', e.message);
  process.exitCode = 1;
}
