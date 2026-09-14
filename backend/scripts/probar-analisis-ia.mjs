// Paso 4 de Semana 3: prueba real del análisis estructurado (10 campos,
// exactamente 3 en cada lista, escenario cualitativo). Crea un workspace de
// prueba con datos realistas, genera el análisis y valida la forma completa.
// Requiere el backend corriendo. Uso: node scripts/probar-analisis-ia.mjs
import { getSupabase } from '../src/db/supabase.js';
import { armarContexto } from '../src/ia/contexto.js';
import { generarAnalisisEstructurado } from '../src/ia/analisis.js';

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
  console.log(`\nProbando el análisis estructurado → ${BASE}\n`);

  const email = `smoke-analisis-${Date.now()}@example.com`;
  const reg = await api('POST', '/auth/register', { body: { nombre: 'QA Análisis', email, password: 'contrasena8' } });
  if (reg.status !== 201) throw new Error(`registro falló: ${JSON.stringify(reg.json)}`);
  creados.usuarios.push(reg.json.usuario.id);
  const token = reg.json.sesion.accessToken;

  const ws = await api('POST', '/workspaces', {
    token,
    body: {
      nombre: 'Alma Cerámica',
      pais: 'Argentina', ciudad: 'Córdoba',
      categoria: 'Productos físicos / artesanías', etapa: 'ventas',
      oferta: 'Vajilla y objetos de cerámica artesanal hechos a mano, venta por encargo y stock limitado.',
      clienteObjetivo: 'Personas de 25-45 que decoran su casa o buscan regalos con valor artesanal.',
      objetivo90d: 'consultas',
    },
  });
  if (ws.status !== 201) throw new Error(`crear workspace falló: ${JSON.stringify(ws.json)}`);
  const wsId = ws.json.workspace.id;

  await api('POST', `/workspaces/${wsId}/metrics`, {
    token,
    body: {
      metricas: [
        { tipo: 'seguidores', valor: 1200, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
        { tipo: 'consultas', valor: 35, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
        { tipo: 'pedidos', valor: 12, periodo: { inicio: '2026-08-01', fin: '2026-08-31' } },
      ],
    },
  });

  const contexto = await armarContexto(wsId);
  console.log('· generando análisis (puede tardar unos segundos)...\n');
  const t0 = Date.now();
  const r = await generarAnalisisEstructurado(contexto);
  const ms = Date.now() - t0;
  console.log(`Modelo: ${r.modelo} | reintentos: ${r.reintentos} | ${ms} ms\n`);
  console.log(JSON.stringify(r.resultado, null, 2));
  console.log();

  console.log('· verificando forma y reglas...\n');
  check('la generación fue válida (ok:true)', r.ok === true, JSON.stringify(r.errores));
  const res = r.resultado ?? {};
  check('calidad_contexto es un valor válido', ['completo', 'parcial', 'insuficiente'].includes(res.calidad_contexto));
  check('fortalezas tiene 3', res.fortalezas?.length === 3);
  check('riesgos tiene 3', res.riesgos?.length === 3);
  check('oportunidades tiene 3', res.oportunidades?.length === 3);
  check('acciones_30_dias tiene EXACTAMENTE 3', res.acciones_30_dias?.length === 3);
  check('escenario_90_dias tiene nivel bajo/base/alto', ['bajo', 'base', 'alto'].includes(res.escenario_90_dias?.nivel));
  check('escenario_90_dias no tiene porcentajes ni "garantizado"', !/\d+%|garantizad|asegurad/i.test(JSON.stringify(res.escenario_90_dias)));
  check('fuentes está vacío (todavía sin búsqueda web)', Array.isArray(res.fuentes) && res.fuentes.length === 0);
  check('advertencias no está vacío', Array.isArray(res.advertencias) && res.advertencias.length > 0);
  check('el resumen menciona algo del rubro (cerámica/artesan)', /cer[aá]mic|artesan/i.test(res.resumen ?? ''));

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
