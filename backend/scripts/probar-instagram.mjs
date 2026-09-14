// Paso 7 de Semana 3: Instagram con dataset simulado (CU-S2-09).
// Requiere el backend corriendo. Uso: node scripts/probar-instagram.mjs
import { getSupabase } from '../src/db/supabase.js';

const BASE = process.env.BASE || 'http://localhost:4000';
const creados = { usuarios: [] };
let ok = 0, fail = 0;
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`); }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`); }
};

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function registrar(nombre) {
  const email = `smoke-ig-${nombre}-${Date.now()}@example.com`;
  const r = await api('POST', '/auth/register', { body: { nombre, email, password: 'contrasena8' } });
  if (r.status !== 201) throw new Error(`registro ${nombre} falló: ${JSON.stringify(r.json)}`);
  creados.usuarios.push(r.json.usuario.id);
  return { id: r.json.usuario.id, token: r.json.sesion.accessToken };
}

async function main() {
  console.log(`\nProbando Instagram simulado → ${BASE}\n`);

  const A = await registrar('a');
  const B = await registrar('b');

  const ws = await api('POST', '/workspaces', {
    token: A.token,
    body: {
      nombre: 'Alma Cerámica', pais: 'Argentina', ciudad: 'Córdoba',
      categoria: 'Productos físicos', etapa: 'ventas',
      oferta: 'Cerámica artesanal hecha a mano, venta por encargo.',
      clienteObjetivo: 'Personas de 25-45 que buscan objetos de decoración con valor artesanal.',
      objetivo90d: 'consultas',
    },
  });
  const wsId = ws.json.workspace.id;

  console.log('· estado inicial');
  let r = await api('GET', `/workspaces/${wsId}/instagram`, { token: A.token });
  check('arranca no_conectada', r.json?.estado === 'no_conectada' && r.json?.conectado === false);

  console.log('\n· conectar cuenta personal (incompatible)');
  r = await api('POST', `/workspaces/${wsId}/instagram/connect`, { token: A.token, body: { handle: 'mi_cuenta', tipoCuenta: 'personal' } });
  check('status 200', r.status === 200);
  check('queda en permiso_faltante', r.json?.estado === 'permiso_faltante');
  check('trae mensaje explicando la limitación', typeof r.json?.mensaje === 'string' && r.json.mensaje.length > 0);

  console.log('\n· conectar cuenta profesional (dataset simulado)');
  r = await api('POST', `/workspaces/${wsId}/instagram/connect`, { token: A.token, body: { handle: 'almaceramica', tipoCuenta: 'profesional' } });
  check('status 200', r.status === 200);
  check('queda conectada', r.json?.estado === 'conectada' && r.json?.conectado === true);
  check('devuelve 4 métricas simuladas', r.json?.metricas?.length === 4);
  check('todas con origen "simulada"', (r.json?.metricas ?? []).every((m) => m.origen === 'simulada'));

  console.log('\n· las métricas quedan en /metrics');
  r = await api('GET', `/workspaces/${wsId}/metrics`, { token: A.token });
  const tipos = (r.json?.metricas ?? []).map((m) => m.tipo).sort();
  check('aparecen seguidores/alcance/interacciones/visitas_perfil', JSON.stringify(tipos) === JSON.stringify(['alcance', 'interacciones', 'seguidores', 'visitas_perfil']), JSON.stringify(tipos));

  console.log('\n· aislamiento: B no puede tocar el Instagram de A');
  r = await api('GET', `/workspaces/${wsId}/instagram`, { token: B.token });
  check('B GET → 404', r.status === 404);
  r = await api('POST', `/workspaces/${wsId}/instagram/connect`, { token: B.token, body: { handle: 'x', tipoCuenta: 'profesional' } });
  check('B connect → 404', r.status === 404);

  console.log('\n· desconectar');
  r = await api('POST', `/workspaces/${wsId}/instagram/disconnect`, { token: A.token });
  check('vuelve a no_conectada', r.json?.estado === 'no_conectada' && r.json?.handle === null);
  r = await api('GET', `/workspaces/${wsId}/metrics`, { token: A.token });
  check('las métricas simuladas siguen existiendo (no se borran)', (r.json?.metricas ?? []).length >= 4);

  console.log(`\nRESULTADO: ${ok} ok, ${fail} fallan\n`);
  process.exitCode = fail ? 1 : 0;
}

main()
  .catch((e) => { console.error('\nERROR:', e.message); process.exitCode = 1; })
  .finally(async () => {
    try {
      const db = getSupabase();
      for (const id of creados.usuarios) await db.auth.admin.deleteUser(id);
      console.log(`limpieza: ${creados.usuarios.length} usuario(s) de prueba borrado(s)`);
    } catch (e) { console.warn('limpieza falló:', e.message); }
  });
