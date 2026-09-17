// Paso 9 de Semana 3: paywall / suscripción simulada (CU-S2-12).
// Requiere el backend corriendo. Uso: node scripts/probar-paywall.mjs
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

const contexto = (n) => ({
  nombre: `Negocio ${n}`, pais: 'Argentina', ciudad: 'Mendoza',
  categoria: 'Servicios', etapa: 'idea',
  oferta: 'Servicio de prueba para validar el límite de workspaces del plan.',
  clienteObjetivo: 'Clientes de prueba para validar el límite de workspaces del plan.',
  objetivo90d: 'validacion',
});

async function main() {
  console.log(`\nProbando el paywall → ${BASE}\n`);

  const email = `smoke-pay-${Date.now()}@example.com`;
  const reg = await api('POST', '/auth/register', { body: { nombre: 'QA Pay', email, password: 'contrasena8' } });
  creados.usuarios.push(reg.json.usuario.id);
  const token = reg.json.sesion.accessToken;
  const uid = reg.json.usuario.id;

  console.log('· estado inicial (Gratuito)');
  let me = await api('GET', '/me', { token });
  check('arranca en Gratuito', me.json?.plan?.id === 'free');
  check('límite de workspaces = 1', me.json?.plan?.limites?.workspaces === 1);

  let r = await api('POST', '/workspaces', { token, body: contexto(1) });
  check('crea el primer workspace', r.status === 201);
  r = await api('POST', '/workspaces', { token, body: contexto(2) });
  check('un 2º workspace se rechaza por límite (Gratuito)', r.status === 403 && r.json?.codigo === 'limite_plan');

  console.log('\n· activar Pro con un planId inválido');
  r = await api('POST', '/subscription/activate-demo', { token, body: { planId: 'business' } });
  check('planId inválido → 400', r.status === 400, JSON.stringify(r.json));

  console.log('\n· activar Pro (pago simulado)');
  r = await api('POST', '/subscription/activate-demo', { token, body: { planId: 'pro' } });
  check('status 200', r.status === 200, JSON.stringify(r.json));
  check('planId = pro', r.json?.suscripcion?.planId === 'pro');
  check('simulada = true', r.json?.suscripcion?.simulada === true);
  const desde1 = r.json?.suscripcion?.desde;

  console.log('\n· confirmar dos veces no duplica (idempotente)');
  r = await api('POST', '/subscription/activate-demo', { token, body: { planId: 'pro' } });
  check('sigue en pro', r.json?.suscripcion?.planId === 'pro');
  check('no cambia la fecha de alta (no reactiva de nuevo)', r.json?.suscripcion?.desde === desde1);

  const db = getSupabase();
  const { data: subs } = await db.from('subscriptions').select('id, status').eq('user_id', uid);
  check('sigue habiendo una sola fila en subscriptions', subs.length === 1, `hay ${subs?.length}`);
  check('esa fila está activa', subs[0]?.status === 'active');

  console.log('\n· /me refleja el plan nuevo, sin re-loguear');
  me = await api('GET', '/me', { token });
  check('/me ahora dice pro', me.json?.plan?.id === 'pro');
  check('límite de workspaces subió a 5', me.json?.plan?.limites?.workspaces === 5);

  console.log('\n· el límite ampliado desbloquea crear el 2º workspace');
  r = await api('POST', '/workspaces', { token, body: contexto(2) });
  check('ahora sí se puede crear el 2º', r.status === 201, JSON.stringify(r.json));

  console.log('\n· sin token → 401');
  r = await api('POST', '/subscription/activate-demo', { body: { planId: 'pro' } });
  check('sin auth → 401', r.status === 401);

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
