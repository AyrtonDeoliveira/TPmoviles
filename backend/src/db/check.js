import { fileURLToPath } from 'node:url';
import { getSupabase, supabaseConfigurado, urlPareceApi } from './supabase.js';

// Primera lectura/escritura real contra la base (Paso 6).
// Lectura: cuenta filas de public.plans (las siembra schema.sql).
// Escritura: inserta una fila en public.diagnostics, la lee y la borra.
// Devuelve un objeto con el resultado; no corta el proceso.
export async function checkDb() {
  if (!supabaseConfigurado()) {
    return { ok: false, motivo: 'sin_configurar' };
  }
  if (!urlPareceApi()) {
    return {
      ok: false,
      motivo: 'url_invalida',
      error:
        'SUPABASE_URL tiene que ser https://<ref>.supabase.co, no la del panel.',
    };
  }

  let db;
  try {
    db = getSupabase();
  } catch (e) {
    return { ok: false, motivo: 'cliente_falló', error: e.message };
  }

  const resultado = { ok: false };

  // --- Lectura ---
  const lectura = await db.from('plans').select('id', { count: 'exact' });
  if (lectura.error) {
    return {
      ok: false,
      motivo: 'lectura_falló',
      error: recortar(lectura.error.message),
      pista:
        'Revisá que corriste db/schema.sql en el SQL Editor y que la URL y la key sean correctas.',
    };
  }
  resultado.lectura = { ok: true, planes: lectura.count ?? lectura.data.length };

  // --- Escritura + relectura + limpieza ---
  const nota = `check ${new Date().toISOString()}`;
  const alta = await db.from('diagnostics').insert({ note: nota }).select().single();
  if (alta.error) {
    return { ok: false, motivo: 'escritura_falló', error: recortar(alta.error.message), ...resultado };
  }

  const relectura = await db.from('diagnostics').select('id, note').eq('id', alta.data.id).single();
  const borrado = await db.from('diagnostics').delete().eq('id', alta.data.id);

  resultado.escritura = {
    ok: !relectura.error && relectura.data?.note === nota && !borrado.error,
    id: alta.data.id,
  };

  resultado.ok = resultado.lectura.ok && resultado.escritura.ok;
  return resultado;
}

// Evita volcar un HTML gigante si la URL apunta a un sitio equivocado.
function recortar(msg) {
  const s = String(msg ?? '');
  if (s.includes('<!DOCTYPE') || s.includes('<html')) {
    return 'la respuesta fue HTML, no JSON: la URL no apunta a la API de Supabase.';
  }
  return s.length > 300 ? s.slice(0, 300) + '…' : s;
}

// Permite correrlo como script: `npm run db:check`
const ejecutadoDirecto = process.argv[1] === fileURLToPath(import.meta.url);

if (ejecutadoDirecto) {
  checkDb()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      // process.exitCode (en vez de process.exit) deja que el event loop
      // termine solo; evita el "Assertion failed ... async.c" en Windows.
      process.exitCode = r.ok ? 0 : 1;
    })
    .catch((e) => {
      console.error('Error inesperado:', e.message);
      process.exitCode = 1;
    });
}
