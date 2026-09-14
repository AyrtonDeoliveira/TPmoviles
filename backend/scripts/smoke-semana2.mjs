// Smoke test de Semana 2: auth + CRUD de workspaces + aislamiento + límites +
// métricas + archivos + dashboard. Crea usuarios de prueba y los borra al final.
//
// Uso:  node scripts/smoke-semana2.mjs           (usa http://localhost:4000)
//       BASE=http://localhost:4000 node scripts/smoke-semana2.mjs
//
// Requiere el backend corriendo y schema.sql aplicado (Semana 2).
import { getSupabase } from '../src/db/supabase.js';

const BASE = process.env.BASE || 'http://localhost:4000';
let ok = 0;
let fail = 0;
const creados = [];

function check(nombre, cond, extra = '') {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`); }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`); }
}

async function api(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  let json = null;
  try { json = await res.json(); } catch { /* vacío */ }
  return { status: res.status, json };
}

async function registrar(nombre) {
  const email = `smoke-s2-${nombre}-${Date.now()}@example.com`;
  const r = await api('POST', '/auth/register', { body: { nombre, email, password: 'contrasena8' } });
  if (r.status !== 201) throw new Error(`registro ${nombre} falló: ${JSON.stringify(r.json)}`);
  creados.push(r.json.usuario.id);
  return { id: r.json.usuario.id, token: r.json.sesion.accessToken, email };
}

const contextoValido = {
  nombre: 'Café La Ventana',
  pais: 'Argentina',
  ciudad: 'Córdoba',
  categoria: 'Gastronomía',
  etapa: 'ventas',
  oferta: 'Cafetería de especialidad con venta de grano y pastelería propia.',
  clienteObjetivo: 'Vecinos y oficinistas de 25 a 45 que valoran el café de calidad.',
  objetivo90d: 'consultas',
};

async function main() {
  console.log(`\nSmoke Semana 2 → ${BASE}\n`);

  console.log('· auth');
  const A = await registrar('a');
  const B = await registrar('b');
  check('registro de dos usuarios', A.id && B.id);

  console.log('· workspaces CRUD (usuario A)');
  let r = await api('POST', '/workspaces', { token: A.token, body: contextoValido });
  check('crear workspace', r.status === 201, JSON.stringify(r.json));
  const w1 = r.json?.workspace?.id;

  r = await api('POST', '/workspaces', { token: A.token, body: { nombre: 'x' } });
  check('crear sin contexto → 400', r.status === 400, `status=${r.status}`);

  r = await api('GET', '/workspaces', { token: A.token });
  check('listar muestra 1', r.json?.workspaces?.length === 1);

  r = await api('GET', `/workspaces/${w1}`, { token: A.token });
  check('GET propio → 200', r.status === 200);

  r = await api('PATCH', `/workspaces/${w1}`, { token: A.token, body: { oferta: 'Cafetería de especialidad, ahora también con desayunos y meriendas.' } });
  check('PATCH propio → 200', r.status === 200 && r.json?.workspace?.oferta?.includes('desayunos'));

  console.log('· aislamiento (usuario B no puede tocar el workspace de A)');
  r = await api('GET', `/workspaces/${w1}`, { token: B.token });
  check('B GET → 404', r.status === 404, `status=${r.status}`);
  r = await api('PATCH', `/workspaces/${w1}`, { token: B.token, body: { oferta: 'hackeado por B, tiene mas de diez chars' } });
  check('B PATCH → 404', r.status === 404, `status=${r.status}`);
  r = await api('DELETE', `/workspaces/${w1}`, { token: B.token });
  check('B DELETE → 404', r.status === 404, `status=${r.status}`);
  r = await api('POST', `/workspaces/${w1}/metrics`, { token: B.token, body: { metricas: [{ tipo: 'consultas', valor: 1, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } }] } });
  check('B POST metrics → 404', r.status === 404, `status=${r.status}`);

  console.log('· límite de plan (Gratuito = 1 workspace)');
  r = await api('POST', '/workspaces', { token: A.token, body: { ...contextoValido, nombre: 'Segundo intento' } });
  check('crear 2º → 403 limite_plan', r.status === 403 && r.json?.codigo === 'limite_plan', JSON.stringify(r.json));

  console.log('· métricas manuales');
  r = await api('POST', `/workspaces/${w1}/metrics`, {
    token: A.token,
    body: {
      metricas: [
        { tipo: 'consultas', valor: 40, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
        { tipo: 'pedidos', valor: 10, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
        { tipo: 'ventas_importe', valor: 560000, moneda: 'ARS', periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
      ],
    },
  });
  check('cargar 3 métricas → 201', r.status === 201, JSON.stringify(r.json));
  r = await api('POST', `/workspaces/${w1}/metrics`, { token: A.token, body: { metricas: [{ tipo: 'consultas', valor: -5, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } }] } });
  check('valor negativo → 400', r.status === 400, `status=${r.status}`);
  r = await api('POST', `/workspaces/${w1}/metrics`, { token: A.token, body: { metricas: [{ tipo: 'ventas_importe', valor: 100, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } }] } });
  check('importe sin moneda → 400', r.status === 400, `status=${r.status}`);
  r = await api('GET', `/workspaces/${w1}/metrics`, { token: A.token });
  check('conversión = 25%', r.json?.conversion?.valor === 25, JSON.stringify(r.json?.conversion));

  console.log('· archivos');
  const fd = new FormData();
  fd.append('archivo', new Blob(['col1,col2\n1,2\n'], { type: 'text/csv' }), 'datos.csv');
  r = await api('POST', `/workspaces/${w1}/files`, { token: A.token, form: fd });
  check('subir csv → 201', r.status === 201, JSON.stringify(r.json));
  const fileId = r.json?.archivo?.id;

  const fdBad = new FormData();
  fdBad.append('archivo', new Blob(['x'], { type: 'image/png' }), 'foto.png');
  r = await api('POST', `/workspaces/${w1}/files`, { token: A.token, form: fdBad });
  check('formato no admitido → 415', r.status === 415, `status=${r.status}`);

  r = await api('GET', `/workspaces/${w1}/files`, { token: A.token });
  check('listar archivos = 1', r.json?.archivos?.length === 1);

  if (fileId) {
    r = await api('DELETE', `/workspaces/${w1}/files/${fileId}`, { token: A.token });
    check('borrar archivo → ok', r.status === 200 && r.json?.ok === true);
  }

  console.log('· dashboard');
  r = await api('GET', `/workspaces/${w1}/dashboard`, { token: A.token });
  check('dashboard sin análisis → sinAnalisis', r.json?.sinAnalisis === true, JSON.stringify(r.json).slice(0, 120));

  console.log('· eliminación lógica');
  r = await api('DELETE', `/workspaces/${w1}`, { token: A.token });
  check('DELETE propio → ok', r.status === 200);
  r = await api('GET', `/workspaces/${w1}`, { token: A.token });
  check('GET tras borrar → 404', r.status === 404);
  r = await api('GET', '/workspaces', { token: A.token });
  check('listado vacío tras borrar', r.json?.workspaces?.length === 0);

  // Después de borrar, se libera el cupo:
  r = await api('POST', '/workspaces', { token: A.token, body: { ...contextoValido, nombre: 'Nuevo tras liberar' } });
  check('crear de nuevo tras liberar cupo → 201', r.status === 201, `status=${r.status}`);
}

main()
  .catch((e) => { console.error('\nERROR:', e.message); fail++; })
  .finally(async () => {
    // Limpieza
    try {
      const db = getSupabase();
      for (const id of creados) await db.auth.admin.deleteUser(id);
      const { data } = await db.auth.admin.listUsers();
      console.log(`\nlimpieza: ${creados.length} usuarios borrados, quedan ${data.users.length}`);
    } catch (e) { console.warn('limpieza falló:', e.message); }
    console.log(`\nRESULTADO: ${ok} ok, ${fail} fallan\n`);
    process.exitCode = fail ? 1 : 0;
  });
