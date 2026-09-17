// Smoke test único de Semana 3: corre el recorrido de oro completo con
// llamadas reales (Supabase, Gemini, Brave) — auth, workspaces, aislamiento,
// límites, métricas, archivos, Instagram simulado, análisis con IA, acciones,
// historial y paywall. Crea usuarios de prueba y los borra al final.
//
// Hace UNA sola llamada a Gemini y UNA a Brave en todo el recorrido (dentro
// del único POST /analyze), para no gastar cuota corriendo scripts sueltos.
// Los scripts individuales (probar-*.mjs) siguen sirviendo para debug puntual.
//
// Requiere el backend corriendo. Uso: node scripts/smoke-semana3.mjs
import { getSupabase } from '../src/db/supabase.js';

const BASE = process.env.BASE || 'http://localhost:4000';
const creados = { usuarios: [] };
let ok = 0, fail = 0;
const fails = [];

function check(nombre, cond, extra = '') {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`); }
  else { fail++; fails.push(nombre); console.log(`  ✗ ${nombre} ${extra}`); }
}
function seccion(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(Math.max(0, 60 - titulo.length))}`);
}

async function api(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function registrar(nombre) {
  const email = `smoke-s3-${nombre}-${Date.now()}@example.com`;
  const r = await api('POST', '/auth/register', { body: { nombre, email, password: 'contrasena8' } });
  if (r.status !== 201) throw new Error(`registro ${nombre} falló: ${JSON.stringify(r.json)}`);
  creados.usuarios.push(r.json.usuario.id);
  return { id: r.json.usuario.id, email, token: r.json.sesion.accessToken };
}

const contextoAlma = {
  nombre: 'Alma Cerámica', pais: 'Argentina', ciudad: 'Córdoba',
  categoria: 'Productos físicos / artesanías', etapa: 'ventas',
  oferta: 'Vajilla y objetos de cerámica artesanal hechos a mano, venta por encargo y stock limitado.',
  clienteObjetivo: 'Personas de 25-45 que decoran su casa o buscan regalos con valor artesanal.',
  objetivo90d: 'consultas',
};

async function main() {
  console.log(`\n${'='.repeat(64)}`);
  console.log('SMOKE SEMANA 3 — recorrido de oro completo');
  console.log(`${'='.repeat(64)}`);
  console.log(`Backend: ${BASE}`);

  seccion('1. Auth');
  const A = await registrar('a');
  const B = await registrar('b');
  check('A y B registrados con sesión', !!A.token && !!B.token);

  let r = await api('POST', '/auth/register', { body: { nombre: 'dup', email: A.email, password: 'contrasena8' } });
  check('email duplicado → 409', r.status === 409);
  r = await api('POST', '/auth/login', { body: { email: A.email, password: 'mal-mal-mal' } });
  check('password incorrecta → 401 genérico', r.status === 401 && r.json?.codigo === 'credenciales_invalidas');
  r = await api('GET', '/me');
  check('/me sin token → 401', r.status === 401);
  r = await api('GET', '/me', { token: A.token });
  check('/me con token → plan free', r.json?.plan?.id === 'free');

  seccion('2. Workspaces: crear, leer, editar, aislar');
  r = await api('POST', '/workspaces', { token: A.token, body: { nombre: 'x' } });
  check('crear sin contexto mínimo → 400', r.status === 400);
  r = await api('POST', '/workspaces', { token: A.token, body: contextoAlma });
  check('crear workspace válido → 201', r.status === 201, JSON.stringify(r.json).slice(0, 200));
  const wsId = r.json.workspace.id;

  r = await api('GET', '/workspaces', { token: A.token });
  check('listar muestra 1', r.json?.workspaces?.length === 1);
  r = await api('PATCH', `/workspaces/${wsId}`, { token: A.token, body: { oferta: 'Vajilla artesanal, ahora también con pedidos para eventos y regalos empresariales.' } });
  check('editar → 200', r.status === 200);

  r = await api('GET', `/workspaces/${wsId}`, { token: B.token });
  check('aislamiento: B no ve el workspace de A → 404', r.status === 404);

  seccion('3. Límite de plan (Gratuito = 1 workspace)');
  r = await api('POST', '/workspaces', { token: A.token, body: { ...contextoAlma, nombre: 'Segundo intento' } });
  check('2º workspace → 403 limite_plan', r.status === 403 && r.json?.codigo === 'limite_plan');

  seccion('4. Métricas manuales');
  r = await api('POST', `/workspaces/${wsId}/metrics`, {
    token: A.token,
    body: {
      metricas: [
        { tipo: 'consultas', valor: 35, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
        { tipo: 'pedidos', valor: 12, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
        { tipo: 'ventas_importe', valor: 560000, moneda: 'ARS', periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
      ],
    },
  });
  check('cargar métricas → 201', r.status === 201);
  r = await api('POST', `/workspaces/${wsId}/metrics`, { token: A.token, body: { metricas: [{ tipo: 'consultas', valor: -1, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } }] } });
  check('valor negativo → 400', r.status === 400);
  r = await api('GET', `/workspaces/${wsId}/metrics`, { token: A.token });
  check('conversión calculada (12/35×100 ≈ 34.3)', Math.abs((r.json?.conversion?.valor ?? 0) - 34.3) < 0.2, JSON.stringify(r.json?.conversion));
  r = await api('POST', `/workspaces/${wsId}/metrics`, { token: B.token, body: { metricas: [{ tipo: 'consultas', valor: 1, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } }] } });
  check('aislamiento: B no puede cargar métricas → 404', r.status === 404);

  seccion('5. Archivos');
  const fd = new FormData();
  fd.append('archivo', new Blob(['col1,col2\n1,2\n'], { type: 'text/csv' }), 'datos.csv');
  r = await api('POST', `/workspaces/${wsId}/files`, { token: A.token, form: fd });
  check('subir csv → 201', r.status === 201);
  const fileId = r.json?.archivo?.id;
  const fdBad = new FormData();
  fdBad.append('archivo', new Blob(['x'], { type: 'image/png' }), 'foto.png');
  r = await api('POST', `/workspaces/${wsId}/files`, { token: A.token, form: fdBad });
  check('formato no admitido → 415', r.status === 415);
  r = await api('GET', `/workspaces/${wsId}/files`, { token: A.token });
  check('listar archivos = 1', r.json?.archivos?.length === 1);
  if (fileId) {
    r = await api('DELETE', `/workspaces/${wsId}/files/${fileId}`, { token: A.token });
    check('borrar archivo → ok', r.status === 200);
  }

  seccion('6. Instagram simulado');
  r = await api('GET', `/workspaces/${wsId}/instagram`, { token: A.token });
  check('arranca no_conectada', r.json?.estado === 'no_conectada');
  r = await api('POST', `/workspaces/${wsId}/instagram/connect`, { token: A.token, body: { handle: 'cuenta_personal', tipoCuenta: 'personal' } });
  check('cuenta personal → permiso_faltante', r.json?.estado === 'permiso_faltante');
  r = await api('POST', `/workspaces/${wsId}/instagram/connect`, { token: A.token, body: { handle: 'almaceramica', tipoCuenta: 'profesional' } });
  check('cuenta profesional → conectada + 4 métricas simuladas', r.json?.estado === 'conectada' && r.json?.metricas?.length === 4);
  r = await api('GET', `/workspaces/${wsId}/instagram`, { token: B.token });
  check('aislamiento: B no ve el Instagram de A → 404', r.status === 404);

  seccion('7. Dashboard antes de analizar');
  r = await api('GET', `/workspaces/${wsId}/dashboard`, { token: A.token });
  check('sin análisis todavía', r.json?.sinAnalisis === true);

  seccion('8. Analizar con IA real (Gemini + búsqueda con Brave) — puede tardar');
  const t0 = Date.now();
  r = await api('POST', `/workspaces/${wsId}/analyze`, { token: A.token });
  console.log(`  (${Math.round((Date.now() - t0) / 1000)} s)`);
  check('análisis → 201 completada', r.status === 201 && r.json?.analisis?.estado === 'completada', JSON.stringify(r.json).slice(0, 200));
  const analysisId = r.json?.analisis?.id;
  check('respeta el objetivo elegido (consultas)', r.json?.analisis?.objetivo === 'consultas');
  check('Gratuito → vista previa bloqueada', r.json?.analisis?.bloqueado === true && !!r.json?.analisis?.vistaPrevia);
  check('NO expone el análisis completo (gate)', r.json?.analisis?.fortalezas === undefined);

  r = await api('POST', `/workspaces/${wsId}/analyze`, { token: B.token });
  check('aislamiento: B no puede analizar el workspace de A → 404', r.status === 404);
  r = await api('POST', `/workspaces/${wsId}/analyze`, { token: A.token });
  check('2º análisis del mes (Gratuito=1) → 403 limite_plan', r.status === 403 && r.json?.codigo === 'limite_plan');

  seccion('9. Acciones (las 3 del análisis)');
  r = await api('GET', `/workspaces/${wsId}/actions`, { token: A.token });
  check('se crearon exactamente 3 acciones', r.json?.acciones?.length === 3);
  const accionId = r.json?.acciones?.[0]?.id;
  if (accionId) {
    r = await api('PATCH', `/workspaces/${wsId}/actions/${accionId}`, { token: A.token, body: { estado: 'en_curso' } });
    check('cambiar estado de una acción → en_curso', r.json?.accion?.estado === 'en_curso');
  }
  r = await api('PATCH', `/workspaces/${wsId}/actions/${accionId}`, { token: B.token, body: { estado: 'hecha' } });
  check('aislamiento: B no puede tocar la acción de A → 404', r.status === 404);

  seccion('10. Historial (todavía Gratuito)');
  r = await api('GET', `/workspaces/${wsId}/analyses`, { token: A.token });
  check('1 item, sin límite de meses (Gratuito)', r.json?.analyses?.length === 1 && r.json?.limiteMeses === null);
  check('bloqueado (vista previa)', r.json?.analyses?.[0]?.bloqueado === true);
  r = await api('GET', `/workspaces/${wsId}/analyses`, { token: B.token });
  check('aislamiento: B no ve el historial de A → 404', r.status === 404);

  seccion('11. Paywall: activar Pro');
  r = await api('POST', '/subscription/activate-demo', { token: A.token, body: { planId: 'business' } });
  check('planId inválido → 400', r.status === 400);
  r = await api('POST', '/subscription/activate-demo', { token: A.token, body: { planId: 'pro' } });
  check('activar pro → 200', r.status === 200 && r.json?.suscripcion?.planId === 'pro');
  const desde1 = r.json?.suscripcion?.desde;
  r = await api('POST', '/subscription/activate-demo', { token: A.token, body: { planId: 'pro' } });
  check('repetir → idempotente (misma fecha)', r.json?.suscripcion?.desde === desde1);
  const db = getSupabase();
  const { data: subs } = await db.from('subscriptions').select('id').eq('user_id', A.id);
  check('sigue habiendo una sola fila en subscriptions', subs?.length === 1);

  r = await api('GET', '/me', { token: A.token });
  check('/me ya refleja Pro (workspaces=5)', r.json?.plan?.id === 'pro' && r.json?.plan?.limites?.workspaces === 5);
  r = await api('POST', '/workspaces', { token: A.token, body: { ...contextoAlma, nombre: 'Segundo, ahora sí' } });
  check('el límite ampliado desbloquea el 2º workspace', r.status === 201);

  seccion('12. Historial y dashboard, ahora como Pro');
  r = await api('GET', `/workspaces/${wsId}/analyses`, { token: A.token });
  check('limiteMeses = 12', r.json?.limiteMeses === 12);
  check('ya no está bloqueado', r.json?.analyses?.[0]?.bloqueado === false);
  check('trae fortalezas/riesgos/oportunidades completos', r.json?.analyses?.[0]?.fortalezas?.length === 3);
  check('las 3 acciones, con el cambio de estado persistido', r.json?.analyses?.[0]?.acciones?.find((a) => a.id === accionId)?.estado === 'en_curso');

  r = await api('GET', `/workspaces/${wsId}/analyses/${analysisId}`, { token: A.token });
  check('detalle también completo', r.json?.analisis?.bloqueado === false);

  r = await api('GET', `/workspaces/${wsId}/dashboard`, { token: A.token });
  check('dashboard completo (no bloqueado)', r.json?.analisis?.bloqueado === false);
  console.log(`  fuentes citadas por la búsqueda web: ${r.json?.analisis?.fuentes?.length ?? 0}`);

  console.log(`\n${'='.repeat(64)}`);
  console.log(`RESULTADO: ${ok} ok, ${fail} fallan`);
  if (fails.length) console.log('Fallaron: ' + fails.join(' | '));
  console.log(`${'='.repeat(64)}\n`);
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
