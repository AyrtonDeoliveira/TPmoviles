// Siembra un historial de métricas de DEMO (source = 'simulada') en un proyecto,
// para ver el dashboard con datos mientras la app no tiene carga de métricas.
//
// Uso:  node scripts/sembrar-metricas-demo.mjs <email> [nombre-del-proyecto]
// Sin nombre de proyecto usa el más reciente. Cada corrida agrega otra tanda
// (valores distintos por proyecto), nunca toca los datos existentes.
import { getSupabase } from '../src/db/supabase.js';

const [email, nombreProyecto] = process.argv.slice(2);
if (!email) {
  console.error('Uso: node scripts/sembrar-metricas-demo.mjs <email> [nombre-del-proyecto]');
  process.exit(1);
}

const db = getSupabase();
const { data: lista, error: eList } = await db.auth.admin.listUsers({ perPage: 1000 });
if (eList) throw eList;
const usuario = lista.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!usuario) {
  console.error(`No existe un usuario con el email ${email}.`);
  process.exit(1);
}

const { data: proyectos, error: eWs } = await db
  .from('workspaces')
  .select('id, name')
  .eq('owner_user_id', usuario.id)
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
if (eWs) throw eWs;

const proyecto = nombreProyecto
  ? proyectos.find((p) => p.name.toLowerCase() === nombreProyecto.toLowerCase())
  : proyectos[0];
if (!proyecto) {
  console.error('No encontré ese proyecto (¿lo creaste desde la app?).');
  process.exit(1);
}

const entero = (min, max) => Math.floor(min + Math.random() * (max - min));

// 6 puntos semanales terminando hoy, con tendencia creciente y algo de ruido.
const PUNTOS = 6;
const seguidores0 = entero(300, 4000);
const alcance0 = Math.round(seguidores0 * (0.7 + Math.random()));
const consultas0 = entero(10, 60);
const ventas0 = entero(20, 200) * 1000;

const filas = [];
for (let i = 0; i < PUNTOS; i++) {
  const crecimiento = 1 + i * (0.03 + Math.random() * 0.05);
  const ruido = () => 0.94 + Math.random() * 0.12;
  const fin = new Date(Date.now() - (PUNTOS - 1 - i) * 7 * 24 * 60 * 60 * 1000);
  const inicio = new Date(fin.getTime() - 7 * 24 * 60 * 60 * 1000);
  const base = {
    workspace_id: proyecto.id,
    source: 'simulada',
    status: 'ok',
    period_start: inicio.toISOString(),
    period_end: fin.toISOString(),
  };
  const seg = Math.round(seguidores0 * crecimiento * ruido());
  const alc = Math.round(alcance0 * crecimiento * ruido());
  filas.push(
    { ...base, metric_type: 'seguidores', value: seg },
    { ...base, metric_type: 'alcance', value: alc },
    { ...base, metric_type: 'interacciones', value: Math.round(alc * (0.03 + Math.random() * 0.04)) },
    { ...base, metric_type: 'consultas', value: Math.round(consultas0 * crecimiento * ruido()) },
    { ...base, metric_type: 'pedidos', value: Math.round(consultas0 * 0.3 * crecimiento * ruido()) },
    { ...base, metric_type: 'ventas_importe', value: Math.round(ventas0 * crecimiento * ruido()), currency: 'ARS' }
  );
}

const { error } = await db.from('metrics').insert(filas);
if (error) throw error;
console.log(`Listo: ${filas.length} métricas simuladas cargadas en "${proyecto.name}" (${proyecto.id}).`);
