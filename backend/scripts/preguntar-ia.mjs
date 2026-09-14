// Herramienta de prueba manual: le hace una pregunta libre a Gemini y muestra
// la respuesta. Solo para probar la conexión a mano; no es parte de la API.
//
// Uso:
//   node scripts/preguntar-ia.mjs "¿Qué se te ocurre para vender más café?"
//   node scripts/preguntar-ia.mjs                 (usa una pregunta de ejemplo)
import { generarTexto } from '../src/ia/gemini.js';

const pregunta = process.argv.slice(2).join(' ') || '¿Qué es un MVP en una frase?';

console.log(`\nPregunta: ${pregunta}\n`);

try {
  const { texto, modelo } = await generarTexto(pregunta);
  console.log(`Respuesta (${modelo}):\n`);
  console.log(texto);
  console.log();
} catch (e) {
  console.error('Error:', e.message);
  process.exitCode = 1;
}
