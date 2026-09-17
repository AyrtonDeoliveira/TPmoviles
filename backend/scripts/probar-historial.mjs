// Paso 8 de Semana 3: historial de análisis (CU-S2-14), gateado por plan.
// Corre un análisis real como Gratuito, verifica el gate, y después cambia
// la suscripción del usuario de prueba a Pro DIRECTO EN LA BASE (sin pasar
// por el paywall, que es el Paso 9) para poder probar también esa rama.
// Requiere el backend corriendo. Uso: node scripts/probar-historial.mjs
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
  console.log(`\nProbando historial de análisis → ${BASE}\n`);

  const emailA = `smoke-hist-a-${Date.now()}@example.com`;
  const regA = await api('POST', '/auth/register', { body: { nombre: 'QA Hist A', email: emailA, password: 'contrasena8' } });
  creados.usuarios.push(regA.json.usuario.id);
  const tokenA = regA.json.sesion.accessToken;
  const uidA = regA.json.usuario.id;

  const regB = await api('POST', '/auth/register', { body: { nombre: 'QA Hist B', email: `smoke-hist-b-${Date.now()}@example.com`, password: 'contrasena8' } });
  creados.usuarios.push(regB.json.usuario.id);
  const tokenB = regB.json.sesion.accessToken;

  const ws = await api('POST', '/workspaces', {
    token: tokenA,
    body: {
      nombre: 'Herrería El Yunque', pais: 'Argentina', ciudad: 'Rosario',
      categoria: 'Herrería y metalurgia', etapa: 'crecimiento',
      oferta: 'Fabricación a medida de rejas, portones y estructuras metálicas para casas y comercios.',
      clienteObjetivo: 'Dueños de casas y comercios que necesitan seguridad o estructuras a medida.',
      objetivo90d: 'ventas',
    },
  });
  const wsId = ws.json.workspace.id;

  console.log('· generando un análisis real (puede tardar)...\n');
  const az = await api('POST', `/workspaces/${wsId}/analyze`, { token: tokenA });
  check('el análisis se generó', az.status === 201, JSON.stringify(az.json).slice(0, 200));
  const analysisId = az.json?.analisis?.id;

  console.log('\n· historial en plan Gratuito');
  let r = await api('GET', `/workspaces/${wsId}/analyses`, { token: tokenA });
  check('devuelve 1 item', r.json?.analyses?.length === 1);
  check('limiteMeses es null (Gratuito: solo la última)', r.json?.limiteMeses === null);
  check('viene bloqueado (vista previa)', r.json?.analyses?.[0]?.bloqueado === true);

  r = await api('GET', `/workspaces/${wsId}/analyses/${analysisId}`, { token: tokenA });
  check('detalle también bloqueado', r.json?.analisis?.bloqueado === true);

  r = await api('GET', `/workspaces/${wsId}/analyses/00000000-0000-0000-0000-000000000000`, { token: tokenA });
  check('id inexistente → 404', r.status === 404);

  console.log('\n· aislamiento: B no ve el historial de A');
  r = await api('GET', `/workspaces/${wsId}/analyses`, { token: tokenB });
  check('B → 404', r.status === 404);

  console.log('\n· subiendo al usuario A a Pro (directo en la base, sin pasar por el paywall)...');
  const db = getSupabase();
  const upd = await db.from('subscriptions').update({ plan_id: 'pro' }).eq('user_id', uidA).eq('status', 'active');
  check('suscripción actualizada a pro', !upd.error, upd.error?.message);

  console.log('\n· historial en plan Pro');
  r = await api('GET', `/workspaces/${wsId}/analyses`, { token: tokenA });
  check('limiteMeses = 12', r.json?.limiteMeses === 12);
  check('viene sin bloquear', r.json?.analyses?.[0]?.bloqueado === false);
  check('trae las 3 acciones', r.json?.analyses?.[0]?.acciones?.length === 3);
  check('trae fortalezas/riesgos/oportunidades completos', r.json?.analyses?.[0]?.fortalezas?.length === 3);

  r = await api('GET', `/workspaces/${wsId}/analyses/${analysisId}`, { token: tokenA });
  check('detalle Pro también completo', r.json?.analisis?.bloqueado === false && r.json?.analisis?.acciones?.length === 3);

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
