// Paso 2-3 de Semana 3: arma el contexto de un workspace y le hace una
// pregunta a la IA usando SOLO ese contexto. Crea 2 emprendimientos muy
// distintos (de 2 usuarios distintos) y verifica que las respuestas no se
// mezclen entre uno y otro. Limpia todo al final.
//
// Requiere el backend corriendo (para crear usuarios/workspaces via API).
// Uso: node scripts/probar-contexto-ia.mjs
import { getSupabase } from '../src/db/supabase.js';
import { preguntarSobreWorkspace } from '../src/ia/contexto.js';

const BASE = process.env.BASE || 'http://localhost:4000';
const creados = { usuarios: [] };

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function registrar(nombre) {
  const email = `smoke-ia-${nombre}-${Date.now()}@example.com`;
  const r = await api('POST', '/auth/register', { body: { nombre, email, password: 'contrasena8' } });
  if (r.status !== 201) throw new Error(`registro ${nombre} falló: ${JSON.stringify(r.json)}`);
  creados.usuarios.push(r.json.usuario.id);
  return { id: r.json.usuario.id, token: r.json.sesion.accessToken };
}

async function crearWorkspace(token, datos) {
  const r = await api('POST', '/workspaces', { token, body: datos });
  if (r.status !== 201) throw new Error(`crear workspace falló: ${JSON.stringify(r.json)}`);
  return r.json.workspace.id;
}

async function cargarMetrica(token, wsId, metricas) {
  await api('POST', `/workspaces/${wsId}/metrics`, { token, body: { metricas } });
}

const cafeteria = {
  nombre: 'Café La Ventana',
  pais: 'Argentina', ciudad: 'Córdoba',
  categoria: 'Cafetería de especialidad', etapa: 'ventas',
  oferta: 'Café de especialidad, medialunas caseras y desayunos para vecinos y oficinistas del barrio.',
  clienteObjetivo: 'Vecinos y trabajadores de oficina de 25 a 50 años que buscan un buen café cerca de casa.',
  objetivo90d: 'consultas',
};

const herreria = {
  nombre: 'Herrería El Yunque',
  pais: 'Argentina', ciudad: 'Rosario',
  categoria: 'Herrería y metalurgia', etapa: 'crecimiento',
  oferta: 'Fabricación a medida de rejas, portones y estructuras metálicas para casas y comercios.',
  clienteObjetivo: 'Dueños de casas y comercios que necesitan seguridad o estructuras metálicas a medida.',
  objetivo90d: 'ventas',
};

async function main() {
  console.log(`\nProbando contexto por workspace + IA → ${BASE}\n`);

  const A = await registrar('a');
  const B = await registrar('b');

  const wsCafe = await crearWorkspace(A.token, cafeteria);
  const wsHerreria = await crearWorkspace(B.token, herreria);
  console.log('workspaces creados:', { wsCafe, wsHerreria });

  await cargarMetrica(A.token, wsCafe, [
    { tipo: 'consultas', valor: 40, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
  ]);
  await cargarMetrica(B.token, wsHerreria, [
    { tipo: 'consultas', valor: 15, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
  ]);

  const pregunta = 'En una sola frase corta: ¿a qué rubro pertenece este emprendimiento y cuántas consultas tuvo el último período?';

  console.log('\n· Preguntando por el Café (workspace A)...');
  const rCafe = await preguntarSobreWorkspace(wsCafe, pregunta);
  console.log('Respuesta:', rCafe.texto);

  console.log('\n· Preguntando por la Herrería (workspace B)...');
  const rHerreria = await preguntarSobreWorkspace(wsHerreria, pregunta);
  console.log('Respuesta:', rHerreria.texto);

  console.log('\n· Verificando aislamiento del contexto...\n');
  let ok = 0, fail = 0;
  const check = (nombre, cond) => { if (cond) { ok++; console.log(`  ✓ ${nombre}`); } else { fail++; console.log(`  ✗ ${nombre}`); } };

  const txtCafe = rCafe.texto.toLowerCase();
  const txtHerreria = rHerreria.texto.toLowerCase();

  check('la respuesta del café menciona café/cafetería', /caf[eé]/.test(txtCafe));
  check('la respuesta del café NO menciona herrería/rejas/portones', !/herrer|reja|port[oó]n|met[aá]lic/.test(txtCafe));
  check('la respuesta de la herrería menciona herrería/rejas/metal', /herrer|reja|port[oó]n|met[aá]lic/.test(txtHerreria));
  check('la respuesta de la herrería NO menciona café', !/caf[eé]/.test(txtHerreria));
  check('el contexto de A no incluye el nombre de B', !JSON.stringify(rCafe.contexto).includes('Yunque'));
  check('el contexto de B no incluye el nombre de A', !JSON.stringify(rHerreria.contexto).includes('Ventana'));

  console.log(`\nRESULTADO: ${ok} ok, ${fail} fallan\n`);
  process.exitCode = fail ? 1 : 0;
}

main()
  .catch((e) => { console.error('\nERROR:', e.message); process.exitCode = 1; })
  .finally(async () => {
    try {
      const db = getSupabase();
      for (const id of creados.usuarios) await db.auth.admin.deleteUser(id);
      console.log(`limpieza: ${creados.usuarios.length} usuarios de prueba borrados`);
    } catch (e) { console.warn('limpieza falló:', e.message); }
  });
