// Forma en la que se entrega un análisis al frontend, según el plan.
// Gratuito: vista previa (resumen + 1 fortaleza + 1 riesgo + 1 oportunidad +
// escenario). Pro: resultado completo, con las 3 acciones. La usan tanto
// POST /workspaces/:id/analyze como GET /workspaces/:id/dashboard, para que
// el gate se aplique en un solo lugar.
export function serializarAccion(a) {
  return {
    id: a.id,
    titulo: a.title,
    motivo: a.reason,
    impacto: a.impact,
    esfuerzo: a.effort,
    metrica: a.target_metric,
    estado: a.status,
    orden: a.position,
  };
}

export function construirEntregaAnalisis(analysis, { esPro, acciones = [] } = {}) {
  const r = analysis.result ?? {};
  const comun = {
    id: analysis.id,
    estado: analysis.status,
    fecha: analysis.created_at,
    calidadContexto: analysis.context_quality,
    objetivo: analysis.objective,
    resumen: r.resumen ?? null,
    escenario90d: analysis.projection ?? r.escenario_90_dias ?? null,
  };

  if (!esPro) {
    return {
      ...comun,
      bloqueado: true,
      vistaPrevia: {
        fortaleza: r.fortalezas?.[0] ?? null,
        riesgo: r.riesgos?.[0] ?? null,
        oportunidad: r.oportunidades?.[0] ?? null,
      },
      desbloquearCon: 'pro',
    };
  }

  return {
    ...comun,
    bloqueado: false,
    fortalezas: r.fortalezas ?? [],
    riesgos: r.riesgos ?? [],
    oportunidades: r.oportunidades ?? [],
    fuentes: analysis.sources ?? [],
    advertencias: r.advertencias ?? [],
    acciones: acciones.map(serializarAccion),
  };
}
