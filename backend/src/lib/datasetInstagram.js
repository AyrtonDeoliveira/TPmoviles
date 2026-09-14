// Dataset controlado para la demo (CU-S2-09): cuando se "conecta" una cuenta
// profesional, en vez de llamar a la API real de Meta (fuera de alcance del
// MVP) se genera un set de métricas plausibles, identificadas con
// source = 'simulada' (nunca 'instagram', para no atribuir datos simulados
// a la fuente real).
function entero(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

export function generarMetricasSimuladas(workspaceId) {
  const fin = new Date();
  const inicio = new Date(fin.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodo = { period_start: inicio.toISOString(), period_end: fin.toISOString() };

  const seguidores = entero(400, 6000);
  const alcance = Math.round(seguidores * (0.6 + Math.random() * 1.2));
  const interacciones = Math.round(alcance * (0.02 + Math.random() * 0.05));
  const visitas = Math.round(seguidores * (0.05 + Math.random() * 0.1));

  const base = { workspace_id: workspaceId, source: 'simulada', status: 'ok', ...periodo };
  return [
    { ...base, metric_type: 'seguidores', value: seguidores },
    { ...base, metric_type: 'alcance', value: alcance },
    { ...base, metric_type: 'interacciones', value: interacciones },
    { ...base, metric_type: 'visitas_perfil', value: visitas },
  ];
}
