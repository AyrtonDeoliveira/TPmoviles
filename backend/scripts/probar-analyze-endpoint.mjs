// Paso 5 de Semana 3: prueba end-to-end del endpoint real POST /workspaces/:id/analyze
// (persistencia, gate por plan, cuota mensual, acciones creadas).
// Requiere el backend corriendo. Uso: node scripts/probar-analyze-endpoint.mjs
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

async function main() {
  console.log(`\nProbando POST /workspaces/:id/analyze → ${BASE}\n`);

  const email = `smoke-analyze-${Date.now()}@example.com`;
  const reg = await api('POST', '/auth/register', { body: { nombre: 'QA Analyze', email, password: 'contrasena8' } });
  if (reg.status !== 201) throw new Error(`registro falló: ${JSON.stringify(reg.json)}`);
  creados.usuarios.push(reg.json.usuario.id);
  const token = reg.json.sesion.accessToken;

  const ws = await api('POST', '/workspaces', {
    token,
    body: {
      nombre: 'Estudio Norte', pais: 'Argentina', ciudad: 'Buenos Aires',
      categoria: 'Servicios profesionales', etapa: 'lanzamiento',
      oferta: 'Consultoría contable y de gestión para pequeños comercios y monotributistas.',
      clienteObjetivo: 'Monotributistas y pequeños comercios que recién arrancan y necesitan orden contable.',
      objetivo90d: 'clientes',
    },
  });
  if (ws.status !== 201) throw new Error(`crear workspace falló: ${JSON.stringify(ws.json)}`);
  const wsId = ws.json.workspace.id;

  await api('POST', `/workspaces/${wsId}/metrics`, {
    token,
    body: { metricas: [{ tipo: 'clientes', valor: 5, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } }] },
  });

  console.log('· POST /analyze (1º del mes, plan Gratuito) — puede tardar unos segundos...\n');
  const r1 = await api('POST', `/workspaces/${wsId}/analyze`, { token });
  console.log(`  status: ${r1.status}`);
  check('primer análisis → 201', r1.status === 201, JSON.stringify(r1.json).slice(0, 300));
  const a = r1.json?.analisis;
  check('estado completada', a?.estado === 'completada');
  check('objetivo90d = clientes', a?.objetivo === 'clientes');
  check('Gratuito → bloqueado: true', a?.bloqueado === true);
  check('trae vistaPrevia con fortaleza/riesgo/oportunidad', !!a?.vistaPrevia?.fortaleza && !!a?.vistaPrevia?.riesgo && !!a?.vistaPrevia?.oportunidad);
  check('NO expone fortalezas[] completas (gate)', a?.fortalezas === undefined);
  check('NO expone acciones[] (gate)', a?.acciones === undefined);

  console.log('\n· GET /dashboard debe reflejar lo mismo (mismo serializador)...');
  const dash = await api('GET', `/workspaces/${wsId}/dashboard`, { token });
  check('dashboard.analisis.bloqueado === true', dash.json?.analisis?.bloqueado === true);
  check('dashboard.analisis.id === el mismo análisis', dash.json?.analisis?.id === a?.id);

  console.log('\n· GET /actions — las 3 acciones existen en la base aunque el plan no las muestre...');
  const acts = await api('GET', `/workspaces/${wsId}/actions`, { token });
  check('se crearon exactamente 3 acciones', acts.json?.acciones?.length === 3, JSON.stringify(acts.json));
  check('las 3 arrancan en "pendiente"', (acts.json?.acciones ?? []).every((x) => x.estado === 'pendiente'));

  console.log('\n· 2º análisis del mes (Gratuito = 1/mes) → debe rechazarse por cuota...');
  const r2 = await api('POST', `/workspaces/${wsId}/analyze`, { token });
  check('segundo análisis → 403 limite_plan', r2.status === 403 && r2.json?.codigo === 'limite_plan', JSON.stringify(r2.json));

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
